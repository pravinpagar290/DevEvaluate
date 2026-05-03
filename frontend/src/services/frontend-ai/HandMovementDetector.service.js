// HandMovementDetector.service.js
// LOW PRIORITY — Lazy-loaded only when hand analysis is needed.
// Detects hand landmark velocity to measure fidgeting / movement level.

import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

// Multiplier to convert screen-percentage-per-second to a 1–10 scale.
// A speed of 0.5 screens/sec * 15 = 7.5 (Fidgety)
const VELOCITY_SCALE = 15; 

class HandMovementDetector {
  constructor() {
    this._hands = null;
    this._camera = null;
    this._isReady = false;
    this._latestLandmarks = null;
    this._previousLandmarks = null;
    this._lastCallTime = 0;
  }

  /**
   * Lazy-initialize the MediaPipe Hands model.
   * Call this ONLY when hand analysis is actually needed (saves ~18MB upfront).
   * @param {HTMLVideoElement} videoElement
   */
  async initialize(videoElement) {
    if (this._isReady) return;

    console.log('[HandMovementDetector] Lazy-loading MediaPipe Hands...');

    this._hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this._hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0, // 0 = Lite (faster), 1 = Full (more accurate)
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this._hands.onResults((results) => {
      // Just store the latest, do NOT update previous here. 
      // We update previous when getHandVelocity is called.
      this._latestLandmarks = results.multiHandLandmarks ?? null;
    });

    this._camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this._hands) {
          await this._hands.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });

    await this._camera.start();
    this._isReady = true;
    console.log('[HandMovementDetector] ✓ Initialized');
  }

  /**
   * Computes hand movement velocity based on distance moved over time elapsed.
   * @returns {{ velocity: number, handsDetected: number, confidence: number } | null}
   */
  getHandVelocity() {
    if (!this._isReady) return null;

    const now = performance.now();

    // No hands in frame
    if (!this._latestLandmarks || this._latestLandmarks.length === 0) {
      this._previousLandmarks = null;
      this._lastCallTime = now;
      return { velocity: 0, handsDetected: 0, confidence: 0.5 };
    }

    if (!this._previousLandmarks) {
      this._previousLandmarks = this._latestLandmarks;
      this._lastCallTime = now;
      return { velocity: 1, handsDetected: this._latestLandmarks.length, confidence: 0.7 };
    }

    let totalDelta = 0;
    let comparedPoints = 0;

    this._latestLandmarks.forEach((hand, handIdx) => {
      const prevHand = this._previousLandmarks[handIdx];
      if (!prevHand) return;

      // Use wrist (0) + finger tips (4, 8, 12, 16, 20) for representative velocity
      const keyPoints = [0, 4, 8, 12, 16, 20];
      keyPoints.forEach((pointIdx) => {
        const cur = hand[pointIdx];
        const prev = prevHand[pointIdx];
        if (cur && prev) {
          const dx = cur.x - prev.x;
          const dy = cur.y - prev.y;
          totalDelta += Math.sqrt(dx * dx + dy * dy);
          comparedPoints++;
        }
      });
    });

    const avgDelta = comparedPoints > 0 ? totalDelta / comparedPoints : 0;
    
    // Time delta in seconds (prevent divide by zero)
    const timeDeltaSec = Math.max((now - this._lastCallTime) / 1000, 0.05); 
    
    // Speed is "screen percentage traversed per second"
    const speedPerSecond = avgDelta / timeDeltaSec;

    // Clamp to 0–10 scale
    const velocity = Math.min(10, Math.round(speedPerSecond * VELOCITY_SCALE));

    // Save current state for the next cycle
    this._previousLandmarks = this._latestLandmarks;
    this._lastCallTime = now;

    return {
      velocity,
      handsDetected: this._latestLandmarks.length,
      confidence: comparedPoints > 0 ? 0.85 : 0.5,
    };
  }

  /**
   * Classify velocity into a readable label.
   * @param {number} velocity - 0 to 10 scale
   * @returns {'still' | 'calm' | 'moderate' | 'fidgety' | 'very_fidgety'}
   */
  static classifyMovement(velocity) {
    if (velocity < 1) return 'still';
    if (velocity < 3) return 'calm';
    if (velocity < 6) return 'moderate';
    if (velocity < 8) return 'fidgety';
    return 'very_fidgety';
  }

  async stop() {
    if (this._camera) await this._camera.stop();
    if (this._hands) this._hands.close();
    this._isReady = false;
    this._latestLandmarks = null;
    this._previousLandmarks = null;
    console.log('[HandMovementDetector] Stopped');
  }
}

export const handMovementDetector = new HandMovementDetector();
