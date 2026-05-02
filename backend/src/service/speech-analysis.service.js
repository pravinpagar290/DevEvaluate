// Step 3.4: Analyze Filler Words, Grammar, & Confidence Score
// Uses Groq API (LLM) to perform advanced analysis of the interview transcript.

import Groq from "groq-sdk";
import { ENV } from "../utils/env.js";

const groq = new Groq({
    apiKey: ENV.GROQ_API_KEY
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
        You are an expert AI Interview Assessor. Analyze the following transcript of a interview session.
        
        Transcript:
        "${fullTranscript}"
        
        Task:
        1. Evaluate the candidate's responses (prefixed with "Candidate:").
        2. Provide a performance score (0-100).
        3. Identify any grammatical errors in the candidate's speech.
        4. Detect filler words (um, like, uh, etc.) used by the candidate.
        5. Provide a constructive summary and feedback on their communication skills.

        Output must be a valid JSON object ONLY, with these exact keys:
        {
            "score": number,
            "basicSentenceFormation": "string",
            "grammaticalErrors": ["string"],
            "fillerWordsDetected": ["string"],
            "overallFeedback": "string"
        }
        
        If the transcript is too short to evaluate fairly, provide a score of 0 and explain that more speech is needed in the overallFeedback.`;

        try {
            if (!ENV.GROQ_API_KEY) {
                throw new Error("GROQ_API_KEY is not defined in the environment variables.");
            }

            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.1-8b-instant", // Newer, faster model
                temperature: 0.3, // Low temperature for consistent JSON output
                response_format: { type: "json_object" }
            });

            const resultJson = chatCompletion.choices[0]?.message?.content;
            
            // Robust JSON parsing: handle potential backticks or extra text
            try {
                return JSON.parse(resultJson);
            } catch (parseError) {
                const jsonMatch = resultJson.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw parseError;
            }
        } catch (error) {
            console.error("❌ Groq API Error:", error.message || error);
            if (error.response) {
                console.error("❌ Groq Response Data:", error.response.data);
            }
            throw error;
        }
    }
}

export const speechAnalysisService = new SpeechAnalysisService();
