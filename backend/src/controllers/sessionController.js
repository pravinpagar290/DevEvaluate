import Session from "../models/Session.model.js";
import { logger } from "../utils/logger.js";

// POST /api/sessions — Create a new session
export const createSession = async (req, res) => {
  try {
    const { problemTitle, difficulty, callId } = req.body;

    if (!problemTitle || !difficulty) {
      return res
        .status(400)
        .json({ message: "problemTitle and difficulty are required" });
    }

    const session = await Session.create({
      problemTitle,
      difficulty,
      host: req.user._id,
      callId: callId || "",
    });

    res.status(201).json(session);
  } catch (error) {
    logger.error("Error in createSession controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/sessions — Get all open sessions
export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ status: "open" })
      .populate("host", "name profileImage clerkId")
      .populate("participants", "name profileImage clerkId")
      .sort({ createdAt: -1 });

    res.status(200).json(sessions);
  } catch (error) {
    logger.error("Error in getSessions controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/sessions/:id — Get a single session by ID
export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate("host", "name profileImage clerkId")
      .populate("participants", "name profileImage clerkId");

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json(session);
  } catch (error) {
    logger.error("Error in getSessionById controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/sessions/:id/join — Join a session as a participant
export const joinSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status === "closed") {
      return res.status(400).json({ message: "Session is already closed" });
    }

    const alreadyJoined = session.participants.some(
      (p) => p.toString() === req.user._id.toString(),
    );

    if (alreadyJoined) {
      return res
        .status(400)
        .json({ message: "You have already joined this session" });
    }

    if (session.host.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Host cannot join their own session as participant" });
    }

    session.participants.push(req.user._id);
    await session.save();

    const updated = await Session.findById(session._id)
      .populate("host", "name profileImage clerkId")
      .populate("participants", "name profileImage clerkId");

    res.status(200).json(updated);
  } catch (error) {
    logger.error("Error in joinSession controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/sessions/:id/close — Close a session (host only)
export const closeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.host.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the host can close this session" });
    }

    session.status = "closed";
    await session.save();

    res.status(200).json({ message: "Session closed successfully", session });
  } catch (error) {
    logger.error("Error in closeSession controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/sessions/:id — Delete a session (host only)
export const deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.host.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the host can delete this session" });
    }

    await Session.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    logger.error("Error in deleteSession controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
