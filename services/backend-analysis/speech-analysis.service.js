// Step 3.4: Analyze Filler Words, Grammar, & Confidence Score
// Uses Groq API (LLM) to perform advanced analysis of the interview transcript.

import Groq from "groq-sdk";

// Assumes GROQ_API_KEY is available in your environment variables (.env)
// If you are running this in the backend, make sure `dotenv` is configured.
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

class SpeechAnalysisService {
    /**
     * Analyzes the full session transcript using an LLM.
     * @param {string} fullTranscript - The complete text spoken by the candidate.
     * @returns {Promise<Object>} The analysis result including score.
     */
    async analyzeTranscript(fullTranscript) {
        if (!fullTranscript || fullTranscript.trim() === '') {
            return {
                score: 0,
                feedback: "No transcript provided.",
                grammaticalErrors: [],
                fillerWordsDetected: []
            };
        }

        const prompt = `
        You are an expert AI Interview Assessor. Analyze the following transcript of a candidate's interview responses.
        
        Transcript:
        "${fullTranscript}"
        
        Please evaluate the text and provide the result strictly in the following JSON format without any markdown wrappers or additional text:
        {
            "score": <number 0-100 based on sentence formation, clarity, and professionalism>,
            "basicSentenceFormation": "<Brief feedback on how they structure their sentences>",
            "grammaticalErrors": ["error 1", "error 2"],
            "fillerWordsDetected": ["um", "like"],
            "overallFeedback": "<A short summary of their speaking skills>"
        }`;

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama3-8b-8192", // Fast and efficient model for text analysis
                temperature: 0.3, // Low temperature for consistent JSON output
                response_format: { type: "json_object" }
            });

            const resultJson = chatCompletion.choices[0]?.message?.content;
            return JSON.parse(resultJson);
        } catch (error) {
            console.error("❌ Error analyzing transcript with Groq:", error);
            throw new Error("Failed to analyze transcript.");
        }
    }
}

export const speechAnalysisService = new SpeechAnalysisService();
