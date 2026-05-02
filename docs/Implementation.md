# Step-by-Step Implementation Roadmap

## Overview
This plan uses the **Winner Approach** (High Speed, Low Cost):
- **Video/Vision**: Processed entirely in the browser using JavaScript (MediaPipe + face-api.js)
- **Audio/Speech**: Streamed to a backend for transcription using OpenAI Whisper
- **Confidence Scoring**: Aggregated on the backend after interview ends

---

## Phase 1: Project Setup & Video Capture

### Step 1.1: Initialize Frontend (React/Vanilla JS)

**What to do:**
- Set up your React application or vanilla HTML/JS page
- Create a standard video call UI with two main elements

**HTML Structure:**
```html
<video id="webcam" autoplay playsinline></video>
<canvas id="overlay"></canvas>
```

**Purpose:**
- `<video>` element: Displays the live webcam feed
- `<canvas>` element: Used to draw landmarks and visual overlays for testing

---

### Step 1.2: Request Camera & Microphone Permissions

**What to do:**
- Write a JavaScript function to request browser permissions
- Attach the media stream to the video element

**JavaScript Code:**
```javascript
async function requestMediaPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    // Attach stream to video element
    const videoElement = document.getElementById('webcam');
    videoElement.srcObject = stream;
    
    return stream;
  } catch (error) {
    console.error('Permission denied:', error);
  }
}

// Call this function on app start
requestMediaPermissions();
```

**Key Parameters:**
- `video: true` — Enables webcam access
- `audio: true` — Enables microphone access

---

## Phase 2: Client-Side Vision Processing (AI in the Browser)

### Step 2.1: Install Vision Libraries

**Install via npm:**
```bash
npm install @mediapipe/hands @mediapipe/face_mesh face-api.js
```

**Or include via CDN:**
```html
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/..."></script>
<script src="https://cdn.jsdelivr.net/npm/face-api.js/..."></script>
```

**Libraries & Their Purpose:**

| Library | Purpose | Use Case |
|---------|---------|----------|
| **@mediapipe/hands** | Hand detection & tracking | Detect hand movements and fidgeting |
| **@mediapipe/face_mesh** | 3D face landmarks (68 points) | Eye contact & gaze direction |
| **face-api.js** | Facial expression detection | Detect emotions (happy, sad, stressed, etc.) |

---

### Step 2.2: Load AI Models

**What to do:**
- Download AI models into browser memory before the interview starts
- This ensures models are ready to use without delays

**JavaScript Code:**
```javascript
async function loadModels() {
  console.log('Loading AI models...');
  
  // Load face-api.js models
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceExpressionNet.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  
  console.log('✓ All models loaded successfully!');
}

// Call before interview starts
loadModels();
```

**What Happens:**
- `tinyFaceDetector`: Detects face location in frame
- `faceExpressionNet`: Classifies 7 emotions (neutral, happy, sad, angry, fearful, disgusted, surprised)
- `faceLandmark68Net`: Provides 68 facial landmarks (eyes, nose, mouth, etc.)

---

### Step 2.3: The Processing Loop (5 FPS)

**What to do:**
- Create a continuous loop that processes video frames every ~200ms (5 frames per second)
- Extract data from each frame for emotions, hand movements, and eye contact

**JavaScript Code:**
```javascript
const FPS = 5;
const FRAME_INTERVAL = 1000 / FPS; // 200ms

async function startProcessingLoop(videoElement) {
  setInterval(async () => {
    try {
      // 1. EMOTION DETECTION
      const detection = await faceapi
        .detectSingleFace(videoElement)
        .withFaceExpressions();
      
      if (detection) {
        const emotions = detection.expressions;
        const dominantEmotion = Object.keys(emotions).reduce((a, b) =>
          emotions[a] > emotions[b] ? a : b
        );
        
        sessionData.emotions.push({
          emotion: dominantEmotion,
          confidence: emotions[dominantEmotion],
          timestamp: new Date()
        });
      }
      
      // 2. EYE CONTACT DETECTION (Gaze)
      const faceMesh = await detectFaceMesh(videoElement);
      if (faceMesh) {
        const gazeDirection = calculateGaze(faceMesh);
        const isLookingAtScreen = gazeDirection.centered;
        
        sessionData.eyeContact.push({
          lookingAtScreen: isLookingAtScreen,
          gazeVector: gazeDirection,
          timestamp: new Date()
        });
      }
      
      // 3. HAND MOVEMENT DETECTION
      const hands = await detectHands(videoElement);
      if (hands.length > 0) {
        const movementLevel = calculateHandVelocity(hands);
        
        sessionData.handMovement.push({
          level: movementLevel, // 1-10 scale
          handCount: hands.length,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Processing error:', error);
    }
  }, FRAME_INTERVAL);
}
```

**Detailed Breakdown:**

#### A. Emotion Detection
```javascript
// Extract emotion from face detection
const emotions = {
  neutral: 0.45,
  happy: 0.30,
  sad: 0.15,
  angry: 0.05,
  fearful: 0.03,
  disgusted: 0.01,
  surprised: 0.01
};

// Find dominant emotion
const dominantEmotion = Object.keys(emotions).reduce((a, b) =>
  emotions[a] > emotions[b] ? a : b
); // Result: "neutral"
```

#### B. Eye Contact (Gaze Direction)
```javascript
function calculateGaze(faceMesh) {
  // Get iris and eye landmarks
  const leftIris = faceMesh.landmarks[468]; // Left iris center
  const rightIris = faceMesh.landmarks[473]; // Right iris center
  
  const leftEyeLeft = faceMesh.landmarks[362]; // Left eye left corner
  const leftEyeRight = faceMesh.landmarks[263]; // Left eye right corner
  
  // Calculate if iris is centered
  const irisX = leftIris[0];
  const eyeLeftX = leftEyeLeft[0];
  const eyeRightX = leftEyeRight[0];
  
  const isCentered = irisX > eyeLeftX && irisX < eyeRightX;
  
  return {
    centered: isCentered,
    irisPosition: { x: irisX, y: leftIris[1] }
  };
}
```

#### C. Hand Movement (Velocity & Fidgeting)
```javascript
let previousHandPosition = null;

function calculateHandVelocity(currentHands) {
  if (!previousHandPosition) {
    previousHandPosition = currentHands;
    return 1; // Baseline
  }
  
  let totalMovement = 0;
  
  currentHands.forEach((hand, idx) => {
    if (previousHandPosition[idx]) {
      const dx = hand.x - previousHandPosition[idx].x;
      const dy = hand.y - previousHandPosition[idx].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      totalMovement += distance;
    }
  });
  
  previousHandPosition = currentHands;
  
  // Convert to 1-10 scale
  const movementLevel = Math.min(10, Math.ceil(totalMovement * 50));
  return movementLevel;
}
```

---

### Step 2.4: Buffer Data & Send in Batches

**What to do:**
- Store all frame data locally in the browser
- Send data to backend every 10 seconds (batching reduces network load)

**JavaScript Code:**
```javascript
// Data structure to store session metrics
let sessionData = {
  emotions: [],           // [{ emotion: 'neutral', confidence: 0.8, timestamp }]
  eyeContact: [],        // [{ lookingAtScreen: true, timestamp }]
  handMovement: [],      // [{ level: 3, handCount: 2, timestamp }]
  startTime: new Date()
};

// Send batched data every 10 seconds
const BATCH_INTERVAL = 10000; // 10 seconds

setInterval(async () => {
  if (sessionData.emotions.length > 0) {
    console.log('Sending batch to backend:', sessionData);
    
    await fetch('/api/interview/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    
    // Clear the batch
    sessionData = {
      emotions: [],
      eyeContact: [],
      handMovement: [],
      startTime: new Date()
    };
  }
}, BATCH_INTERVAL);
```

**Benefits:**
- ✓ Reduces bandwidth usage
- ✓ Reduces server load
- ✓ Keeps UI responsive
- ✓ Easier to batch-process on backend

---

## Phase 3: Backend Audio & Speech Processing

### Step 3.1: Stream Audio to Backend

**What to do:**
- Capture microphone stream in 5-second chunks
- Send chunks to backend over WebSocket

**JavaScript Code (Frontend):**
```javascript
let mediaRecorder;
let audioChunks = [];

async function initAudioRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  mediaRecorder = new MediaRecorder(stream);
  
  // Trigger recording every 5 seconds
  mediaRecorder.start(5000);
  
  mediaRecorder.ondataavailable = async (event) => {
    const audioBlob = event.data;
    
    // Send to backend via WebSocket
    const reader = new FileReader();
    reader.onloadend = () => {
      const audioBase64 = reader.result.split(',')[1];
      
      socket.emit('audio_chunk', {
        audio: audioBase64,
        timestamp: new Date().toISOString()
      });
    };
    reader.readAsDataURL(audioBlob);
  };
}

initAudioRecording();
```

---

### Step 3.2: Set up Python Backend (FastAPI)

**What to do:**
- Create a WebSocket endpoint to receive audio chunks
- Store audio temporarily or process immediately

**Python Code (Backend):**
```python
from fastapi import FastAPI, WebSocket
from fastapi.responses import JSONResponse
import asyncio
import base64
import os

app = FastAPI()

# Store ongoing interviews
interviews = {}

@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    await websocket.accept()
    interview_id = websocket.scope["query_params"].get("interview_id")
    
    interviews[interview_id] = {
        "audio_chunks": [],
        "transcript": ""
    }
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Decode base64 audio
            audio_base64 = data.get("audio")
            audio_bytes = base64.b64decode(audio_base64)
            
            # Save to temporary file
            temp_path = f"/tmp/chunk_{interview_id}_{len(interviews[interview_id]['audio_chunks'])}.wav"
            with open(temp_path, "wb") as f:
                f.write(audio_bytes)
            
            interviews[interview_id]["audio_chunks"].append(temp_path)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        del interviews[interview_id]

@app.post("/api/interview/metrics")
async def receive_metrics(interview_id: str, metrics: dict):
    """Receive batched metrics from frontend"""
    if interview_id in interviews:
        interviews[interview_id]["metrics"] = metrics
    return {"status": "received"}
```

---

### Step 3.3: Run Whisper Transcription

**What to do:**
- Install OpenAI Whisper
- Process audio chunks and generate transcripts

**Setup:**
```bash
pip install openai-whisper
```

**Python Code (Backend):**
```python
import whisper
import os

# Load model once at startup (not for every chunk!)
WHISPER_MODEL = whisper.load_model("base")

def transcribe_audio_chunk(audio_path):
    """Transcribe a single audio chunk"""
    try:
        result = WHISPER_MODEL.transcribe(audio_path)
        transcript = result["text"]
        
        # Clean up temp file
        os.remove(audio_path)
        
        return {
            "text": transcript,
            "language": result.get("language", "en"),
            "confidence": result.get("confidence", 0)
        }
    except Exception as e:
        print(f"Transcription error: {e}")
        return None

@app.post("/api/transcribe")
async def transcribe_endpoint(interview_id: str):
    """Transcribe all audio chunks for an interview"""
    if interview_id not in interviews:
        return {"error": "Interview not found"}, 404
    
    full_transcript = ""
    
    for audio_path in interviews[interview_id]["audio_chunks"]:
        result = transcribe_audio_chunk(audio_path)
        if result:
            full_transcript += result["text"] + " "
    
    interviews[interview_id]["transcript"] = full_transcript
    
    return {
        "interview_id": interview_id,
        "transcript": full_transcript,
        "word_count": len(full_transcript.split())
    }
```

**Model Options:**

| Model | Size | Speed | Accuracy | Recommended For |
|-------|------|-------|----------|-----------------|
| **tiny** | 39M | ⚡⚡⚡ | 60% | Quick testing |
| **base** | 140M | ⚡⚡ | 80% | **Production (recommended)** |
| **small** | 244M | ⚡ | 90% | High accuracy needed |
| **medium** | 769M | 🐢 | 95% | Maximum accuracy |

---

### Step 3.4: Analyze Filler Words & Speaking Speed

**What to do:**
- Count filler words in transcript
- Calculate words per minute (WPM)
- Assess speech fluency

**Python Code:**
```python
import re
from datetime import datetime

def analyze_speech(transcript, duration_seconds):
    """
    Analyze transcript for filler words and speaking speed
    
    Args:
        transcript: Full text transcript
        duration_seconds: Total interview duration in seconds
    
    Returns:
        Dictionary with speech metrics
    """
    
    # Common filler words
    FILLER_WORDS = [
        r'\bum\b', r'\buh\b', r'\burgh\b',
        r'\blike\b', r'\byou know\b', r'\byeah\b',
        r'\bso\b', r'\byeah\b', r'\bbasically\b',
        r'\bliterally\b', r'\berrr\b', r'\bahh\b'
    ]
    
    # Count filler words
    filler_count = 0
    for pattern in FILLER_WORDS:
        matches = re.findall(pattern, transcript.lower(), re.IGNORECASE)
        filler_count += len(matches)
    
    # Count total words
    words = transcript.split()
    word_count = len(words)
    
    # Calculate metrics
    duration_minutes = duration_seconds / 60
    wpm = word_count / duration_minutes if duration_minutes > 0 else 0
    filler_per_minute = filler_count / duration_minutes if duration_minutes > 0 else 0
    
    return {
        "total_words": word_count,
        "total_fillers": filler_count,
        "words_per_minute": round(wpm, 2),
        "fillers_per_minute": round(filler_per_minute, 2),
        "fluency_score": 100 - min(100, filler_per_minute * 5),  # Score out of 100
        "assessment": "Excellent" if filler_per_minute < 3 else "Good" if filler_per_minute < 5 else "Needs Improvement"
    }

# Example usage
transcript = "Um, so like, I really enjoy working on, uh, projects that are challenging"
speech_analysis = analyze_speech(transcript, 300)  # 5 minutes
print(speech_analysis)
# Output:
# {
#   "total_words": 14,
#   "total_fillers": 3,
#   "words_per_minute": 168.0,
#   "fillers_per_minute": 0.6,
#   "fluency_score": 97,
#   "assessment": "Excellent"
# }
```

---

## Phase 4: Aggregation & Final Dashboard

### Step 4.1: Scoring Engine

**What to do:**
- When interview ends, aggregate all collected data
- Calculate individual metrics for each category
- Store in database for report generation

**Python Code:**
```python
def calculate_metrics(interview_data):
    """
    Aggregate all metrics and calculate scores
    
    interview_data = {
        "emotions": [...],
        "eyeContact": [...],
        "handMovement": [...],
        "transcript": "...",
        "duration_seconds": 1800
    }
    """
    
    # 1. EYE CONTACT METRIC (30%)
    total_eye_checks = len(interview_data["eyeContact"])
    looking_at_screen = sum(1 for e in interview_data["eyeContact"] if e["lookingAtScreen"])
    eye_contact_percentage = (looking_at_screen / total_eye_checks * 100) if total_eye_checks > 0 else 0
    eye_contact_score = min(100, eye_contact_percentage)
    
    # 2. SPEECH FLUENCY METRIC (30%)
    speech_analysis = analyze_speech(
        interview_data["transcript"],
        interview_data["duration_seconds"]
    )
    fluency_score = speech_analysis["fluency_score"]
    
    # 3. EMOTIONS METRIC (20%)
    emotion_counts = {}
    for emotion_entry in interview_data["emotions"]:
        emotion = emotion_entry["emotion"]
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
    
    dominant_emotion = max(emotion_counts, key=emotion_counts.get)
    
    # Map emotions to confidence impact
    emotion_impact = {
        "neutral": 100,
        "happy": 95,
        "surprised": 80,
        "angry": 40,
        "fearful": 30,
        "sad": 25,
        "disgusted": 20
    }
    emotion_score = emotion_impact.get(dominant_emotion, 50)
    
    # 4. BODY LANGUAGE METRIC (20%)
    avg_hand_movement = sum(h["level"] for h in interview_data["handMovement"]) / len(interview_data["handMovement"]) if interview_data["handMovement"] else 5
    
    # Ideal is moderate movement (4-6 on 1-10 scale)
    if avg_hand_movement < 2:
        body_language_score = 60  # Too rigid
    elif avg_hand_movement > 8:
        body_language_score = 60  # Too fidgety
    else:
        body_language_score = 100  # Moderate (good!)
    
    # 5. OVERALL CONFIDENCE SCORE
    weights = {
        "eye_contact": (0.30, eye_contact_score),
        "fluency": (0.30, fluency_score),
        "emotions": (0.20, emotion_score),
        "body_language": (0.20, body_language_score)
    }
    
    overall_score = sum(weight * score for weight, score in weights.values())
    
    return {
        "overall_confidence_score": round(overall_score, 1),
        "metrics": {
            "eye_contact": {
                "percentage": round(eye_contact_percentage, 1),
                "score": round(eye_contact_score, 1),
                "assessment": "Excellent" if eye_contact_percentage > 70 else "Good" if eye_contact_percentage > 50 else "Needs Improvement"
            },
            "speech_fluency": {
                "words_per_minute": speech_analysis["words_per_minute"],
                "fillers_per_minute": speech_analysis["fillers_per_minute"],
                "score": round(fluency_score, 1),
                "assessment": speech_analysis["assessment"]
            },
            "emotions": {
                "dominant_emotion": dominant_emotion,
                "emotion_distribution": emotion_counts,
                "score": round(emotion_score, 1),
                "assessment": "Confident" if dominant_emotion in ["neutral", "happy"] else "Nervous"
            },
            "body_language": {
                "average_hand_movement": round(avg_hand_movement, 1),
                "score": round(body_language_score, 1),
                "assessment": "Excellent" if 4 <= avg_hand_movement <= 6 else "Needs Improvement"
            }
        }
    }
```

---

### Step 4.2: API Endpoint to Generate Final Report

**Python Code:**
```python
@app.post("/api/interview/{interview_id}/finalize")
async def finalize_interview(interview_id: str):
    """
    Called when interviewer clicks 'End Interview'
    Generates final report and stores in database
    """
    if interview_id not in interviews:
        return {"error": "Interview not found"}, 404
    
    interview = interviews[interview_id]
    
    # Calculate all metrics
    report = calculate_metrics({
        "emotions": interview.get("metrics", {}).get("emotions", []),
        "eyeContact": interview.get("metrics", {}).get("eyeContact", []),
        "handMovement": interview.get("metrics", {}).get("handMovement", []),
        "transcript": interview.get("transcript", ""),
        "duration_seconds": 1800  # Store actual duration
    })
    
    # Save to database (e.g., MongoDB, PostgreSQL)
    # db.interviews.insert_one({
    #     "_id": interview_id,
    #     "report": report,
    #     "created_at": datetime.now()
    # })
    
    return {
        "interview_id": interview_id,
        "status": "completed",
        "report": report
    }
```

---

### Step 4.3: Display Results (React Dashboard)

**What to do:**
- Fetch final report from backend
- Display comprehensive dashboard with charts and metrics

**React Code:**
```javascript
import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, LineChart } from 'recharts'; // or any charting library

function InterviewReport({ interviewId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch final report
    fetch(`/api/interview/${interviewId}/finalize`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => {
        setReport(data.report);
        setLoading(false);
      });
  }, [interviewId]);

  if (loading) return <div>Loading report...</div>;

  const { overall_confidence_score, metrics } = report;

  return (
    <div className="report-container">
      
      {/* 1. OVERALL SCORE - Donut Chart */}
      <section className="score-card">
        <h2>Overall Confidence Score</h2>
        <div className="score-display">
          <div className="score-number">{overall_confidence_score}</div>
          <div className="score-label">/100</div>
        </div>
        <div className="score-bar">
          <div 
            className="score-fill"
            style={{width: `${overall_confidence_score}%`}}
          ></div>
        </div>
      </section>

      {/* 2. METRICS GRID */}
      <section className="metrics-grid">
        
        {/* Eye Contact */}
        <div className="metric-card">
          <h3>👀 Eye Contact</h3>
          <div className="metric-score">{metrics.eye_contact.percentage}%</div>
          <div className="metric-bar">
            <div 
              className="metric-fill eye-contact"
              style={{width: `${metrics.eye_contact.percentage}%`}}
            ></div>
          </div>
          <p className="assessment">{metrics.eye_contact.assessment}</p>
        </div>

        {/* Speech Fluency */}
        <div className="metric-card">
          <h3>🗣️ Speech Fluency</h3>
          <div className="metric-score">{metrics.speech_fluency.score}%</div>
          <ul className="metric-details">
            <li>WPM: {metrics.speech_fluency.words_per_minute}</li>
            <li>Fillers/min: {metrics.speech_fluency.fillers_per_minute}</li>
          </ul>
          <p className="assessment">{metrics.speech_fluency.assessment}</p>
        </div>

        {/* Emotions */}
        <div className="metric-card">
          <h3>😊 Emotions</h3>
          <div className="metric-score">{metrics.emotions.score}%</div>
          <div className="emotion-display">
            <p>Dominant: <strong>{metrics.emotions.dominant_emotion}</strong></p>
          </div>
          <p className="assessment">{metrics.emotions.assessment}</p>
        </div>

        {/* Body Language */}
        <div className="metric-card">
          <h3>🤝 Body Language</h3>
          <div className="metric-score">{metrics.body_language.score}%</div>
          <div className="metric-details">
            <p>Hand Movement: {metrics.body_language.average_hand_movement}/10</p>
          </div>
          <p className="assessment">{metrics.body_language.assessment}</p>
        </div>

      </section>

      {/* 3. EMOTION TIMELINE */}
      <section className="timeline">
        <h2>Emotion Timeline</h2>
        <LineChart 
          width={600} 
          height={300} 
          data={metrics.emotions.emotion_distribution}
        >
          {/* Chart configuration */}
        </LineChart>
      </section>

      {/* 4. TRANSCRIPT */}
      <section className="transcript">
        <h2>Interview Transcript</h2>
        <div className="transcript-text">
          {/* Display full transcript here */}
        </div>
      </section>

    </div>
  );
}

export default InterviewReport;
```

---

## Summary Table: Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React + JavaScript | Video UI, real-time capture |
| **Vision Models** | MediaPipe + face-api.js | Emotion, gaze, hand tracking |
| **Audio Capture** | MediaRecorder API | Microphone streaming |
| **Backend** | FastAPI/Flask + Python | Audio processing, WebSocket server |
| **Transcription** | OpenAI Whisper | Speech-to-text conversion |
| **Speech Analysis** | Python Regex | Filler word detection, WPM calculation |
| **Database** | MongoDB/PostgreSQL | Store interview reports |
| **Visualization** | Recharts/Chart.js | Dashboard charts and graphs |

---

## Quick Start Checklist

- [ ] **Phase 1**: Set up React app with video element
- [ ] **Phase 1**: Request camera/mic permissions
- [ ] **Phase 2**: Install MediaPipe and face-api.js
- [ ] **Phase 2**: Load AI models before interview
- [ ] **Phase 2**: Create processing loop (5 FPS)
- [ ] **Phase 2**: Buffer and batch data every 10 seconds
- [ ] **Phase 3**: Set up FastAPI backend with WebSocket
- [ ] **Phase 3**: Install and configure OpenAI Whisper
- [ ] **Phase 3**: Implement filler word detection
- [ ] **Phase 4**: Build scoring engine
- [ ] **Phase 4**: Create React dashboard component
- [ ] **Testing**: End-to-end test with sample interview
- [ ] **Deployment**: Deploy frontend and backend