// GazeDetector.service.js
// Detects eye contact (gaze direction) using @mediapipe/face_mesh iris landmarks.
// Determines whether the candidate is looking at the screen or away.

import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

// Thresholds: |normalizedGaze.x| < 0.3 and |normalizedGaze.y| < 0.2 = looking at screen
const GAZE_X_THRESHOLD = 0.3;
const GAZE_Y_THRESHOLD = 0.2;
// Minimum face size (fraction of frame width) below which we lower confidence
const MIN_FACE_SIZE = 0.15;

// MediaPipe FaceMesh iris landmark indices
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];
// Eye corner indices (inner/outer)
const LEFT_EYE_INNER = 133;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;

class GazeDetector {
  constructor() {
    this._faceMesh = null;
    this._isReady = false;
    this._latestResult = null; // Last result from MediaPipe callback
  }

  /**
   * Initializes the MediaPipe FaceMesh model.
   * @param {HTMLVideoElement} videoElement - The live webcam feed element.
   * @returns {Promise<void>}
   */
  async initialize(videoElement) {
    if (this._isReady) return;

    this._faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this._faceMesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true, // Needed for iris tracking (landmarks 468-477)
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this._faceMesh.onResults((results) => {
      this._latestResult = results;
    });

    // Camera utility handles requestAnimationFrame loop feeding frames to MediaPipe
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
    console.log('[GazeDetector] ✓ Initialized');
  }

  /**
   * Reads the latest result from the MediaPipe callback and returns gaze estimate.
   * @returns {{ isLookingAtScreen: boolean, gazeVector: {x:number,y:number}, confidence: number } | null}
   */
  estimateGaze() {
    if (!this._isReady || !this._latestResult?.multiFaceLandmarks?.length) return null;

    try {
      const landmarks = this._latestResult.multiFaceLandmarks[0]; // Use first detected face

      const leftIrisCenter = this._getIrisCenter(landmarks, LEFT_IRIS);
      const rightIrisCenter = this._getIrisCenter(landmarks, RIGHT_IRIS);

      const leftGazeVec = this._calculateGazeVector(
        leftIrisCenter,
        landmarks[LEFT_EYE_INNER],
        landmarks[LEFT_EYE_OUTER]
      );
      const rightGazeVec = this._calculateGazeVector(
        rightIrisCenter,
        landmarks[RIGHT_EYE_INNER],
        landmarks[RIGHT_EYE_OUTER]
      );

      // Average both eyes for a more stable estimate
      const gazeVector = {
        x: (leftGazeVec.x + rightGazeVec.x) / 2,
        y: (leftGazeVec.y + rightGazeVec.y) / 2,
      };

      const isLookingAtScreen =
        Math.abs(gazeVector.x) < GAZE_X_THRESHOLD &&
        Math.abs(gazeVector.y) < GAZE_Y_THRESHOLD;

      const confidence = this._calculateConfidence(landmarks);

      return {
        isLookingAtScreen,
        gazeVector,
        confidence,
      };
    } catch (error) {
      console.warn('[GazeDetector] Estimation error (skipping frame):', error.message);
      return null;
    }
  }

  /**
   * Computes the centroid of iris landmark points.
   * @param {Array} landmarks
   * @param {number[]} irisIndices
   * @returns {{ x: number, y: number }}
   * @private
   */
  _getIrisCenter(landmarks, irisIndices) {
    const points = irisIndices.map((i) => landmarks[i]);
    return {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
  }

  /**
   * Computes iris offset from the eye center (inner+outer corners midpoint).
   * A value near 0 means centered (looking at screen).
   * @private
   */
  _calculateGazeVector(irisCenter, innerCorner, outerCorner) {
    const eyeCenterX = (innerCorner.x + outerCorner.x) / 2;
    const eyeCenterY = (innerCorner.y + outerCorner.y) / 2;
    return { x: irisCenter.x - eyeCenterX, y: irisCenter.y - eyeCenterY };
  }

  /**
   * Confidence based on face size in frame (larger face = more reliable tracking).
   * @private
   */
  _calculateConfidence(landmarks) {
    const xs = landmarks.map((p) => p.x);
    const faceWidth = Math.max(...xs) - Math.min(...xs);
    const sizeScore = Math.min(1, faceWidth / MIN_FACE_SIZE);
    return Math.round(sizeScore * 100) / 100;
  }

  async stop() {
    if (this._camera) {
      await this._camera.stop();
    }
    if (this._faceMesh) {
      this._faceMesh.close();
    }
    this._isReady = false;
    this._latestResult = null;
    console.log('[GazeDetector] Stopped');
  }
}

export const gazeDetector = new GazeDetector();
