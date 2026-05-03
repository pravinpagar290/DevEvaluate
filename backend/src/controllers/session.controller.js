import { chatClient, streamClient, upsertStreamUser } from "../utils/stream.js";
import Session from "../models/Session.model.js";
import { speechAnalysisService } from "../service/speech-analysis.service.js";

export async function createSession(req, res) {
  try {
    const { problem, difficulty, isPrivate } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!problem || !difficulty) {
      return res.status(400).json({ message: "Problem and difficulty are required" });
    }

    // Ensure the current user exists in Stream before creating resources.
    await upsertStreamUser({
      id: clerkId.toString(),
      name: req.user.name,
      image: req.user.profileImage,
    });

    // generate a unique call id for stream video
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // create session in db
    const session = await Session.create({ problem, difficulty, host: userId, callId, isPrivate });

    // create stream video call
    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { problem, difficulty, sessionId: session._id.toString() },
      },
    });

    // chat messaging
    const channel = chatClient.channel("messaging", callId, {
      name: `${problem} Session`,
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();

    res.status(201).json({ session });
  } catch (error) {
    console.error("Error in createSession controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active", isPrivate: false })
      .populate("host", "name profileImage email clerkId")
      .populate("participant", "name profileImage email clerkId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    // get sessions where user is either host or participant
    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId");

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    if (session.host.toString() === userId.toString()) {
      return res.status(400).json({ message: "Host cannot join their own session as participant" });
    }

    // check if session is already full - has a participant
    if (session.participant) return res.status(409).json({ message: "Session is full" });

    session.participant = userId;
    await session.save();

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const { transcript } = req.body;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    // check if session is already completed
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    // delete stream video call
    const call = streamClient.video.call("default", session.callId);
    await call.delete({ hard: true });

    // delete stream chat channel
    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    // Perform speech analysis if transcript exists
    if (transcript) {
      console.log("🤖 Analyzing transcript for session:", id);
      try {
        const analysis = await speechAnalysisService.analyzeTranscript(transcript);
        session.speechAnalysis = analysis;
        session.transcript = transcript;
        console.log("✅ Analysis complete");
      } catch (analysisError) {
        console.error("❌ Speech analysis failed:", analysisError.message);
        // We still want to end the session even if analysis fails
        session.transcript = transcript;
        session.speechAnalysis = {
          score: 0,
          overallFeedback: "Analysis failed due to a service error.",
          grammaticalErrors: [],
          fillerWordsDetected: []
        };
      }
    }

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.log("Error in endSession controller:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

/**
 * POST /api/session/:id/analytics
 * Receives a 30-second batch of vision analytics from the client-side AI pipeline.
 * Appends the compact summary and updates the rolling average used for final reports.
 */
export async function addSessionAnalytics(req, res) {
  try {
    const { id } = req.params;
    const { summary } = req.body;

    if (!summary || typeof summary !== "object") {
      return res.status(400).json({ message: "Invalid analytics payload: summary is required" });
    }

    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot add analytics to a completed session" });
    }

    // Ensure the analytics sub-document structure exists
    if (!session.analytics) {
      session.analytics = { batches: [], running: { sampleCount: 0 } };
    }

    // 1. Append the compact 30-second summary to the batches array
    session.analytics.batches.push({
      totalFrames: summary.totalFrames,
      eyeContactPercentage: summary.eyeContactPercentage,
      dominantEmotions: summary.dominantEmotions,
      avgHandVelocity: summary.avgHandVelocity,
      dataQualityScore: summary.dataQualityScore,
      windowStart: new Date(summary.windowStart),
      windowEnd: new Date(summary.windowEnd),
    });

    // 2. Update the incremental running average (Welford online algorithm)
    const running = session.analytics.running || { sampleCount: 0 };
    const n = running.sampleCount || 0;

    running.eyeContactPercentage =
      ((running.eyeContactPercentage || 0) * n + (summary.eyeContactPercentage || 0)) / (n + 1);

    running.avgHandVelocity =
      ((running.avgHandVelocity || 0) * n + (summary.avgHandVelocity || 0)) / (n + 1);

    // Merge emotion counts across all batches for cumulative distribution
    const emotionMap = {};
    (running.dominantEmotions || []).forEach(({ emotion, count }) => {
      emotionMap[emotion] = count;
    });
    (summary.dominantEmotions || []).forEach(({ emotion, count }) => {
      emotionMap[emotion] = (emotionMap[emotion] || 0) + count;
    });
    running.dominantEmotions = Object.entries(emotionMap)
      .sort(([, a], [, b]) => b - a)
      .map(([emotion, count]) => ({ emotion, count }));

    running.sampleCount = n + 1;
    session.analytics.running = running;

    // markModified required — nested mixed-type objects bypass Mongoose dirty detection
    session.markModified("analytics");
    await session.save();

    res.status(200).json({
      message: "Analytics batch stored",
      sampleCount: running.sampleCount,
    });
  } catch (error) {
    console.error("Error in addSessionAnalytics controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
