// Step 3.5: Real-time Audio to Text (Speech Recognition)
// Uses Web Speech API to convert speech to text in real-time.
// Differentiates between Interviewer and Interviewee (Candidate).

let recognition = null;
let isManuallyStopped = false;

/**
 * Starts the Web Speech API recognition
 * @param {string} role - The role of the speaker: 'interviewer' or 'interviewee'
 * @param {function} onTranscript - Callback function with the transcribed text
 */
export const startSpeechRecognition = (role = 'interviewee', onTranscript) => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.error("❌ Web Speech API is not supported in this browser. Please use Chrome or Edge.");
        return;
    }

    isManuallyStopped = false;
    recognition = new SpeechRecognition();
    recognition.continuous = true;       // Keep listening even if the user pauses
    recognition.interimResults = true;   // Show real-time partial results
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        console.log(`%c🎤 Speech recognition started for: ${role.toUpperCase()}`, 'color: #9C27B0; font-weight: bold;');
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Loop through the results to differentiate final vs interim text
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // Apply different styling/logging for Interviewer vs Interviewee
        const isInterviewer = role === 'interviewer';
        
        const speakerLabel = isInterviewer ? '👨‍💼 INTERVIEWER' : '🧑‍💻 INTERVIEWEE (CANDIDATE)';
        const finalColor = isInterviewer ? 'color: #FF9800; font-weight: bold;' : 'color: #4CAF50; font-weight: bold;';
        const interimColor = isInterviewer ? 'color: #FFB74D;' : 'color: #81C784;';

        // Real-time console log based on role
        if (finalTranscript) {
            console.log(`%c[${speakerLabel} - FINAL]: %c${finalTranscript.trim()}`, finalColor, 'color: inherit;');
            if (onTranscript) onTranscript(finalTranscript.trim(), true, role);
        } else if (interimTranscript) {
            console.log(`%c[${speakerLabel} - INTERIM]: %c${interimTranscript.trim()}`, interimColor, 'color: gray; font-style: italic;');
            if (onTranscript) onTranscript(interimTranscript.trim(), false, role);
        }
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            // Ignore no-speech errors, they are common when there is silence
            return;
        }
        console.error(`❌ Speech Recognition Error for ${role}:`, event.error);
    };

    recognition.onend = () => {
        if (!isManuallyStopped) {
            console.log(`%c🔄 Restarting speech recognition after silence for: ${role.toUpperCase()}`, 'color: #2196F3; font-weight: bold;');
            try {
                recognition.start();
            } catch (err) {
                console.error("Failed to auto-restart speech recognition:", err);
            }
        } else {
            console.log(`%c🛑 Speech recognition completely ended for: ${role.toUpperCase()}`, 'color: #f44336; font-weight: bold;');
        }
    };

    try {
        recognition.start();
    } catch (err) {
        console.error("Failed to start speech recognition:", err);
    }
};

export const stopSpeechRecognition = () => {
    isManuallyStopped = true;
    if (recognition) {
        recognition.stop();
        console.log("%c🛑 Speech recognition manually stopped.", 'color: #f44336; font-weight: bold;');
        recognition = null;
    }
};
