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
