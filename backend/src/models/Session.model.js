import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    problem: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    callId: {
      type: String,
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    transcript: {
      type: String,
    },
    speechAnalysis: {
      score: Number,
      basicSentenceFormation: String,
      grammaticalErrors: [String],
      fillerWordsDetected: [String],
      overallFeedback: String,
    },

    // ── Vision Analytics (populated by real-time client-side AI) ──────────────
    analytics: {
      // Compact batch summaries (one per 30-second window)
      batches: [
        {
          totalFrames: Number,
          eyeContactPercentage: Number,
          dominantEmotions: [{ emotion: String, count: Number }],
          avgHandVelocity: Number,
          dataQualityScore: Number,
          windowStart: Date,
          windowEnd: Date,
        },
      ],

      // Incrementally updated running averages (for live dashboard / final report)
      running: {
        eyeContactPercentage: { type: Number, default: 0 },
        avgHandVelocity: { type: Number, default: 0 },
        dominantEmotions: [{ emotion: String, count: Number }],
        sampleCount: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;