# AI Interview Services Documentation

This document provides a breakdown of each microservice file located in the `services/` directory, detailing its purpose and its current boilerplate code content.

---

## 1. Frontend AI Services (`services/frontend-ai/`)

These services handle all client-side processing, specifically Computer Vision tasks using the webcam feed.

### `video-capture.service.js`
**Purpose:** Interfaces with the browser API to request hardware permissions and capture the user's webcam and microphone streams.

**Code Content:**
```javascript
// Step 1: Request Camera & Mic Permissions
// We will use navigator.mediaDevices.getUserMedia() here.

export const startVideoAndAudio = async (videoElement) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoElement) {
            videoElement.srcObject = stream;
        }
        return stream;
    } catch (err) {
        console.error("Error accessing webcam:", err);
        throw err;
    }
};

export const stopVideoAndAudio = (stream) => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
};
```

### `face-api.service.js`
**Purpose:** Loads `face-api.js` deep learning models to analyze video frames and detect the dominant facial expression (emotions).

**Code Content:**
```javascript
// Step 2: Client-Side Vision (Emotions via face-api.js)
// We will load models and run emotion detection here.

import * as faceapi from 'face-api.js';

export const loadFaceApiModels = async (modelsPath = '/models') => {
    console.log("Loading face-api.js models...");
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath);
    await faceapi.nets.faceExpressionNet.loadFromUri(modelsPath);
    console.log("Models loaded successfully");
};

export const detectEmotion = async (videoElement) => {
    // Detect single face with expressions
    // const detection = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
    // return detection;
};
```

### `mediapipe.service.js`
**Purpose:** Utilizes Google's MediaPipe models to track hand joint coordinates and map facial mesh landmarks to calculate eye contact (gaze direction).

**Code Content:**
```javascript
// Step 2: Client-Side Vision (Hands & Gaze via MediaPipe)
// Setup MediaPipe Hands and Face Mesh here.

export const initializeMediaPipe = async () => {
    // Initialize @mediapipe/hands and @mediapipe/face_mesh
    console.log("Initializing MediaPipe models...");
    
    // Example setup for Hands:
    // const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    // hands.setOptions({ maxNumHands: 2, modelComplexity: 1 });
    // hands.onResults(onResultsHands);
    
    // Example setup for Face Mesh (Gaze):
    // const faceMesh = new FaceMesh({...});
};

export const processVideoFrame = async (videoElement) => {
    // Pass frame to MediaPipe
    // await hands.send({image: videoElement});
};
```

### `audio-recorder.service.js`
**Purpose:** Wraps the `MediaRecorder` API to slice the microphone's audio stream into manageable 5-second chunks for backend processing.

**Code Content:**
```javascript
// Step 3.1: Stream Audio to Backend
// We will use MediaRecorder API to chunk audio.

let mediaRecorder;
let audioChunks = [];

export const startAudioRecording = (stream, onChunkReady) => {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
            // Send to backend via WebSocket or API
            if (onChunkReady) {
                onChunkReady(event.data);
            }
        }
    };

    // Trigger ondataavailable every 5 seconds (5000ms)
    mediaRecorder.start(5000); 
};

export const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
};
```

---

## 2. Backend Analysis Services (`services/backend-analysis/`)

These services handle server-side Node.js tasks, specifically handling audio processing, transcription, and compiling the final scores.

### `audio-stream.service.js`
**Purpose:** Handles incoming WebSocket connections from the frontend, receiving the 5-second audio chunks and preparing them for transcription.

**Code Content:**
```javascript
// Step 3.2: Set up the Python/Backend Audio Receiver
// Handles WebSocket connections and incoming audio chunks.

class AudioStreamService {
    constructor() {
        // Initialize connections
    }

    handleIncomingChunk(audioBlob, sessionId) {
        // Save to temp file or process in memory
        // Forward to SpeechToTextService
    }
}

module.exports = new AudioStreamService();
```

### `speech-to-text.service.js`
**Purpose:** Takes the audio chunks and interfaces with OpenAI Whisper (either an API or local Python script) to convert the speech into a text transcript.

**Code Content:**
```javascript
// Step 3.3: Run Whisper Transcription
// Interfaces with OpenAI API or a local Python microservice.

class SpeechToTextService {
    async transcribeAudio(audioBuffer) {
        // Call OpenAI Whisper API or your local Whisper script
        console.log("Transcribing audio...");
        // const response = await openai.createTranscription(
        //   fs.createReadStream("audio.webm"),
        //   "whisper-1"
        // );
        // return response.data.text;
        
        return "This is a transcribed sentence."; 
    }
}

module.exports = new SpeechToTextService();
```

### `speech-analysis.service.js`
**Purpose:** Scans the generated text transcript using Regular Expressions to identify and count filler words, as well as calculate the Words Per Minute (WPM) speaking rate.

**Code Content:**
```javascript
// Step 3.4: Analyze Filler Words & Speed
// Takes the transcript and extracts speech metrics.

class SpeechAnalysisService {
    analyzeTranscript(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        
        // Count filler words: um, uh, like, you know
        const fillerRegex = /\b(um|uh|like|you know)\b/g;
        const matches = lowerTranscript.match(fillerRegex);
        const fillerCount = matches ? matches.length : 0;
        
        // Word count for Words Per Minute (WPM)
        const wordCount = transcript.split(/\s+/).length;

        return {
            fillerCount,
            wordCount,
            detectedFillers: matches || []
        };
    }
}

module.exports = new SpeechAnalysisService();
```

### `confidence-scoring.service.js`
**Purpose:** The final aggregator module. It compiles the vision metrics (from the frontend) and the speech metrics (from the backend) to generate a final weighted "Confidence Score" out of 100.

**Code Content:**
```javascript
// Step 4: Aggregation & The Final Dashboard
// Combines the vision data (from frontend) and audio data (from Whisper).

class ConfidenceScoringService {
    calculateOverallScore(visionData, speechData) {
        // Weighting logic
        // 1. Eye Contact (Vision)
        // 2. Hand Movements (Vision)
        // 3. Dominant Emotion (Vision)
        // 4. Speech Fluency & Fillers (Audio)
        
        const score = 85; // Example calculation
        
        return {
            overallScore: score,
            breakdown: {
                vision: visionData,
                speech: speechData
            }
        };
    }
}

module.exports = new ConfidenceScoringService();
```
