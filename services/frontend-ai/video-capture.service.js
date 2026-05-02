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
