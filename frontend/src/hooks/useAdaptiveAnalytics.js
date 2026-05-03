// useAdaptiveAnalytics.js
// React hook that orchestrates the real-time vision analytics pipeline.
// Runs emotion + gaze detection at an adaptive FPS based on device capability.
// Hand movement is a LOW PRIORITY feature — pass enableHands=true to activate it.
//
// Data flow:
// 1. processFrame() runs at adaptive FPS → detects emotion/gaze/hands
// 2. Results are pushed to a local buffer (never touches the network per-frame)
// 3. Every BATCH_INTERVAL ms, the buffer is summarized and sent to the backend

import { useState, useEffect, useCallback, useRef } from 'react';
import { emotionDetector } from '../services/frontend-ai/EmotionDetector.service.js';
import { gazeDetector } from '../services/frontend-ai/GazeDetector.service.js';
import { handMovementDetector } from '../services/frontend-ai/HandMovementDetector.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_INTERVAL_MS = 30_000; // Send analytics to server every 30 seconds
const MIN_CONFIDENCE = 0.6;       // Discard results below this confidence

// Adaptive FPS: determined once by device capability
function getAdaptiveFPS() {
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return 5;   // Low-end mobile
  if (cores <= 4) return 8;   // Mid-range / tablet
  return 12;                  // Desktop
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {HTMLVideoElement | null} videoElement - The local webcam video element.
 * @param {string} sessionId - Active session ID for batch uploads.
 * @param {{ enableHands?: boolean, enabled?: boolean }} options
 */
export function useAdaptiveAnalytics(videoElement, sessionId, options = {}) {
  const { enableHands = false, enabled = true } = options;

  // Live metrics shown in the UI
  const [metrics, setMetrics] = useState({
    emotion: null,
    eyeContact: false,
    handVelocity: 0,
    emotionConfidence: 0,
    gazeConfidence: 0,
  });

  // Processing performance stats (useful for debugging)
  const [perfStats, setPerfStats] = useState({
    fps: getAdaptiveFPS(),
    lastProcessingMs: 0,
    droppedFrames: 0,
  });

  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(null);

  const bufferRef = useRef([]); // Frame-level data, batched before sending
  const processingRef = useRef(false); // Guard: prevent overlapping processFrame calls
  const droppedRef = useRef(0);
  const fpsRef = useRef(getAdaptiveFPS());

  // ── Model Initialization ────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !videoElement) return;

    let cancelled = false;

    const init = async () => {
      try {
        // 1. Load face-api emotion models (critical path)
        await emotionDetector.loadModels('/model/face-api');

        // 2. Initialize MediaPipe gaze (non-blocking; runs its own Camera loop)
        await gazeDetector.initialize(videoElement);

        // 3. Lazy-load hand detector only if requested (LOW PRIORITY)
        if (enableHands) {
          await handMovementDetector.initialize(videoElement);
        }

        if (!cancelled) {
          setIsReady(true);
          console.log('[useAdaptiveAnalytics] ✓ All models ready');
        }
      } catch (err) {
        console.error('[useAdaptiveAnalytics] Initialization failed:', err);
        if (!cancelled) setInitError(err.message);
      }
    };

    init();

    return () => {
      cancelled = true;
      // Cleanup MediaPipe Camera loops on unmount
      gazeDetector.stop();
      if (enableHands) handMovementDetector.stop();
      emotionDetector.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, videoElement]);

  // ── Processing Loop ─────────────────────────────────────────────────────────

  const processFrame = useCallback(async () => {
    if (!isReady || !videoElement || processingRef.current) return;
    if (videoElement.readyState < 2) return; // Video not loaded yet

    processingRef.current = true;
    const t0 = performance.now();

    try {
      // Run emotion detection (requires video element)
      // GazeDetector and HandMovementDetector run their own MediaPipe loops
      const emotionResult = await emotionDetector.detectEmotion(videoElement);
      const gazeResult = gazeDetector.estimateGaze();
      const handResult = enableHands ? handMovementDetector.getHandVelocity() : null;

      // Apply confidence filtering
      const emotion =
        emotionResult && emotionResult.confidence >= MIN_CONFIDENCE && !emotionResult.isUncertain
          ? emotionResult.emotion
          : null;

      const eyeContact =
        gazeResult && gazeResult.confidence >= MIN_CONFIDENCE
          ? gazeResult.isLookingAtScreen
          : false;

      const handVelocity = handResult?.velocity ?? 0;

      // Push raw frame data to buffer
      bufferRef.current.push({
        ts: Date.now(),
        emotion,
        eyeContact,
        handVelocity,
        emotionConf: emotionResult?.confidence ?? 0,
        gazeConf: gazeResult?.confidence ?? 0,
      });

      // Update UI state (cheap — just primitives)
      setMetrics({
        emotion,
        eyeContact,
        handVelocity,
        emotionConfidence: emotionResult?.confidence ?? 0,
        gazeConfidence: gazeResult?.confidence ?? 0,
      });

      // Adaptive FPS: if frame took >100ms, reduce FPS to prevent blocking UI
      const elapsed = performance.now() - t0;
      if (elapsed > 100 && fpsRef.current > 5) {
        fpsRef.current = Math.max(5, fpsRef.current - 2);
      }

      setPerfStats((prev) => ({
        fps: fpsRef.current,
        lastProcessingMs: Math.round(elapsed),
        droppedFrames: droppedRef.current,
      }));
    } catch (err) {
      droppedRef.current++;
      console.warn('[useAdaptiveAnalytics] Frame skipped:', err.message);
    } finally {
      processingRef.current = false;
    }
  }, [isReady, videoElement, enableHands]);

  // Schedule the processing loop at adaptive FPS
  useEffect(() => {
    if (!isReady || !enabled) return;

    const intervalMs = 1000 / fpsRef.current;
    const timer = setInterval(processFrame, intervalMs);
    return () => clearInterval(timer);
  }, [isReady, enabled, processFrame]);

  // ── Batch Upload ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || !enabled) return;

    const batchTimer = setInterval(async () => {
      if (bufferRef.current.length === 0) return;

      // Drain the buffer atomically
      const batch = bufferRef.current.splice(0);
      const summary = _summarizeBatch(batch);

      try {
        await fetch(`/api/session/${sessionId}/analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchMetrics: batch, summary }),
        });
      } catch (err) {
        console.error('[useAdaptiveAnalytics] Batch upload failed, re-queuing:', err.message);
        // Re-add failed batch to the front of the buffer for retry
        bufferRef.current.unshift(...batch);
      }
    }, BATCH_INTERVAL_MS);

    return () => clearInterval(batchTimer);
  }, [sessionId, enabled]);

  return { metrics, perfStats, isReady, initError };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Aggregate raw frame data into a compact summary sent to the backend.
 * The backend stores the summary (not every frame) for efficiency.
 * @param {{ ts, emotion, eyeContact, handVelocity, emotionConf, gazeConf }[]} batch
 */
function _summarizeBatch(batch) {
  if (!batch.length) return null;

  const emotionCounts = {};
  let eyeContactFrames = 0;
  let totalHandVelocity = 0;
  let highConfidenceFrames = 0;

  batch.forEach((frame) => {
    if (frame.emotion) {
      emotionCounts[frame.emotion] = (emotionCounts[frame.emotion] || 0) + 1;
    }
    if (frame.eyeContact) eyeContactFrames++;
    totalHandVelocity += frame.handVelocity;
    if (frame.emotionConf >= 0.7) highConfidenceFrames++;
  });

  const eyeContactPercentage = (eyeContactFrames / batch.length) * 100;
  const avgHandVelocity = totalHandVelocity / batch.length;

  const dominantEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([emotion, count]) => ({ emotion, count }));

  return {
    totalFrames: batch.length,
    eyeContactPercentage: Math.round(eyeContactPercentage * 10) / 10,
    dominantEmotions,
    avgHandVelocity: Math.round(avgHandVelocity * 10) / 10,
    dataQualityScore: Math.round((highConfidenceFrames / batch.length) * 100),
    windowStart: batch[0].ts,
    windowEnd: batch[batch.length - 1].ts,
  };
}
