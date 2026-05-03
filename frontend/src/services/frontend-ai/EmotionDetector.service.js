// EmotionDetector.service.js
// Detects facial emotions from a video element using face-api.js.
// Applies confidence thresholds and multi-frame smoothing to reduce flicker.

import * as faceapi from 'face-api.js';

// Confidence threshold — predictions below this are reported as 'uncertain'
const CONFIDENCE_THRESHOLD = 0.70;
// Number of consecutive frames that must agree before confirming an emotion change
const SMOOTHING_WINDOW = 3;

class EmotionDetector {
  constructor() {
    this._emotionBuffer = [];
    this._isModelLoaded = false;
  }

  /**
   * Loads only the required face-api models (NOT the full 250MB suite).
   * Call this once before starting the processing loop.
   * @param {string} modelsPath - Public path where model weights are hosted.
   */
  async loadModels(modelsPath = '/model/face-api') {
    if (this._isModelLoaded) return;

    console.log('[EmotionDetector] Loading models...');
    // tinyFaceDetector is the fast face-locator (~12MB), faceExpressionNet classifies 7 emotions (~45MB)
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelsPath),
    ]);
    this._isModelLoaded = true;
    console.log('[EmotionDetector] ✓ Models loaded');
  }

  /**
   * Detects the dominant emotion from a live video element.
   * @param {HTMLVideoElement} videoElement
   * @returns {Promise<{emotion: string, confidence: number, allEmotions: object, isUncertain: boolean} | null>}
   */
  async detectEmotion(videoElement) {
    if (!this._isModelLoaded || !videoElement || videoElement.readyState < 2) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (!detection) return null;

      const expressions = detection.expressions;

      const emotionMap = {
        happy: expressions.happy || 0,
        sad: expressions.sad || 0,
        angry: expressions.angry || 0,
        fearful: expressions.fearful || 0,
        disgusted: expressions.disgusted || 0,
        surprised: expressions.surprised || 0,
        neutral: expressions.neutral || 0,
      };

      // Find the dominant emotion and its confidence score
      const [dominantEmotion, dominantScore] = Object.entries(emotionMap).reduce(
        (max, cur) => (cur[1] > max[1] ? cur : max)
      );

      const isUncertain = dominantScore < CONFIDENCE_THRESHOLD;
      const reportedEmotion = isUncertain ? 'uncertain' : dominantEmotion;

      // Smooth: add to buffer and check agreement across recent frames
      this._emotionBuffer.push(reportedEmotion);
      if (this._emotionBuffer.length > SMOOTHING_WINDOW * 2) {
        this._emotionBuffer.shift(); // Keep buffer bounded
      }

      return {
        emotion: this._getSmoothedEmotion(),
        confidence: Math.round(dominantScore * 100) / 100,
        allEmotions: emotionMap,
        isUncertain,
      };
    } catch (error) {
      console.warn('[EmotionDetector] Frame error (skipping):', error.message);
      return null;
    }
  }

  /**
   * Returns the smoothed emotion — only confirms a new emotion if
   * the last SMOOTHING_WINDOW frames all agree.
   * @returns {string}
   * @private
   */
  _getSmoothedEmotion() {
    if (this._emotionBuffer.length < SMOOTHING_WINDOW) {
      return this._emotionBuffer[this._emotionBuffer.length - 1] ?? 'uncertain';
    }

    const recent = this._emotionBuffer.slice(-SMOOTHING_WINDOW);
    const allAgree = recent.every((e) => e === recent[0]);
    return allAgree ? recent[0] : this._emotionBuffer[this._emotionBuffer.length - 2] ?? recent[0];
  }

  reset() {
    this._emotionBuffer = [];
  }
}

// Export as a singleton
export const emotionDetector = new EmotionDetector();
