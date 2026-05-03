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
