// GazeDetector.service.js
// Detects eye contact (gaze direction) using @mediapipe/face_mesh iris landmarks.
// Determines whether the candidate is looking at the screen or away.

import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

// --- Iris Tracking Calibration ---
// These are the ideal center ratios when a person is looking directly at the camera.
// We've broadened these slightly (0.35 - 0.65) to be more forgiving of different head tilts.
const GAZE_X_MIN = 0.35; 
const GAZE_X_MAX = 0.65;
const GAZE_Y_MIN = 0.30; 
const GAZE_Y_MAX = 0.70; 

let frameCount = 0; // For throttled logging

// Minimum face size (fraction of frame width) below which we lower confidence
const MIN_FACE_SIZE = 0.15;

// MediaPipe FaceMesh iris landmark indices
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];

// Left Eye Bounds (from the camera's perspective)
const LEFT_EYE_INNER = 133;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;

// Right Eye Bounds
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;

class GazeDetector {
  constructor() {
    this._faceMesh = null;
    this._isReady = false;
    this._latestResult = null; 
  }

  async initialize(videoElement) {
    if (this._isReady) return;

    this._faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this._faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true, // Absolutely required for iris 468-477
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this._faceMesh.onResults((results) => {
      this._latestResult = results;
      if (results?.multiFaceLandmarks?.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        // Check if refineLandmarks is actually working (should be 478, not 468)
        if (landmarks.length < 478 && !this._warnedRefine) {
          console.warn('[GazeDetector] ⚠️ refineLandmarks is NOT active. Iris landmarks missing! (Found only ' + landmarks.length + ' points)');
          this._warnedRefine = true;
        }
      }
    });

    this._camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this._faceMesh) {
          await this._faceMesh.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });

    await this._camera.start();
    this._isReady = true;
    console.log('[GazeDetector] ✓ Initialized with High-Precision Iris Tracking');
  }

  estimateGaze() {
    if (!this._isReady || !this._latestResult?.multiFaceLandmarks?.length) return null;

    try {
      const landmarks = this._latestResult.multiFaceLandmarks[0]; 

      // 1. Get exact center of both irises
      const leftIris = this._getIrisCenter(landmarks, LEFT_IRIS);
      const rightIris = this._getIrisCenter(landmarks, RIGHT_IRIS);

      if (!leftIris || !rightIris) return null;

      // 2. Calculate the exact position ratios of the iris inside the eye socket
      const leftRatios = this._calculateGazeRatios(
        leftIris,
        landmarks[LEFT_EYE_INNER],
        landmarks[LEFT_EYE_OUTER],
        landmarks[LEFT_EYE_TOP],
        landmarks[LEFT_EYE_BOTTOM]
      );

      const rightRatios = this._calculateGazeRatios(
        rightIris,
        landmarks[RIGHT_EYE_INNER],
        landmarks[RIGHT_EYE_OUTER],
        landmarks[RIGHT_EYE_TOP],
        landmarks[RIGHT_EYE_BOTTOM]
      );

      // 3. Average the ratios from both eyes for ultimate stability
      const avgX = (leftRatios.x + rightRatios.x) / 2;
      const avgY = (leftRatios.y + rightRatios.y) / 2;

      // DEBUG LOG: Show the real-time ratios in the console every 100 frames
      frameCount++;
      if (frameCount % 100 === 0) {
        console.log(`[GazeDetector] 👁️ Live Ratios - X: ${avgX.toFixed(3)}, Y: ${avgY.toFixed(3)} (Straight is ~0.5)`);
      }

      // 4. Determine if looking at screen based on calibrated bounds
      const isLookingAtScreen =
        avgX > GAZE_X_MIN && avgX < GAZE_X_MAX &&
        avgY > GAZE_Y_MIN && avgY < GAZE_Y_MAX;

      const confidence = this._calculateConfidence(landmarks);

      return {
        isLookingAtScreen,
        ratios: { x: avgX, y: avgY }, 
        confidence,
      };
    } catch (error) {
      console.warn('[GazeDetector] Estimation error:', error.message);
      return null;
    }
  }

  _getIrisCenter(landmarks, irisIndices) {
    const points = irisIndices.map((i) => landmarks[i]);
    return {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
  }

  /**
   * Calculates exactly where the iris is positioned as a percentage (0.0 to 1.0).
   * 0.0 = pupil is touching the inner corner / top eyelid
   * 0.5 = pupil is dead center
   * 1.0 = pupil is touching the outer corner / bottom eyelid
   */
  _calculateGazeRatios(iris, inner, outer, top, bottom) {
    // Total width and height of the open eye
    const eyeWidth = Math.hypot(outer.x - inner.x, outer.y - inner.y);
    const eyeHeight = Math.hypot(top.x - bottom.x, top.y - bottom.y);

    // Distance from the iris to the inner corner & top eyelid
    const irisToInner = Math.hypot(iris.x - inner.x, iris.y - inner.y);
    const irisToTop = Math.hypot(iris.x - top.x, iris.y - top.y);

    return {
      x: eyeWidth === 0 ? 0.5 : irisToInner / eyeWidth,
      y: eyeHeight === 0 ? 0.5 : irisToTop / eyeHeight
    };
  }

  _calculateConfidence(landmarks) {
    const xs = landmarks.map((p) => p.x);
    const faceWidth = Math.max(...xs) - Math.min(...xs);
    const sizeScore = Math.min(1, faceWidth / MIN_FACE_SIZE);
    return Math.round(sizeScore * 100) / 100;
  }

  async stop() {
    if (this._camera) await this._camera.stop();
    if (this._faceMesh) this._faceMesh.close();
    this._isReady = false;
    this._latestResult = null;
  }
}

export const gazeDetector = new GazeDetector();
