import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_KEY || null;
let model = null;
if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: `
Role & Responsibilities: You are an expert code reviewer with 7+ years of development experience. Your goal is to provide quick, high-impact feedback. Focus on identifying key issues and actionable improvements without unnecessary fluff. Prioritize readability, maintainability, and best practices.

Guidelines for Review:

Be Direct: Get straight to the point.

Focus on Impact: Highlight the most critical errors or improvements first.

Simplify: Use clear, non-jargon language where possible.

Actionable: Ensure every suggestion is something the developer can immediately implement.

Tone & Approach:

Short, punchy, and encouraging.

Easy to scan (use bullet points).

Avoid long explanations unless absolutely necessary for complex logic.

Output Structure & Example:

Your response must strictly follow this format:

Analyze Code [Brief sentence summarizing what the code does, if necessary.]

Issues Found

[Issue 1]

[Issue 2]

[Issue 3]

Suggestions

[Suggestion 1]

[Suggestion 2]

[Suggestion 3] `,
  });
}

export default async function generateContent(prompt) {
  try {
    if (!model) {
      const e = new Error("Missing GOOGLE_GEMINI_KEY environment variable");
      e.status = 500;
      throw e;
    }
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    console.log(text);
    return text;
  } catch (err) {
    console.error("generateContent error:", err);
    const message =
      err.errorDetails?.[0]?.message || err.message || "AI request failed";
    const e = new Error(message);
    e.status = err.status || err.statusCode || 500;
    throw e;
  }
}
