import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const ENV = {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  NODE_ENV: process.env.NODE_ENV,
  SERVE_FRONTEND: process.env.SERVE_FRONTEND,
  CLIENT_URL: process.env.CLIENT_URL,
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  STREAM_API_KEY: process.env.STREAM_API_KEY,
  STREAM_API_SECRET: process.env.STREAM_API_SECRET,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY?.trim(),
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY?.trim(),
  GOOGLE_GEMINI_KEY: process.env.GOOGLE_GEMINI_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
};
