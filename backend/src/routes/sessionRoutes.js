import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createSession,
  getSessions,
  getSessionById,
  joinSession,
  closeSession,
  deleteSession,
} from "../controllers/sessionController.js";

const router = express.Router();

// All routes require authentication
router.get("/", protectRoute, getSessions);
router.post("/", protectRoute, createSession);
router.get("/:id", protectRoute, getSessionById);
router.post("/:id/join", protectRoute, joinSession);
router.patch("/:id/close", protectRoute, closeSession);
router.delete("/:id", protectRoute, deleteSession);

export default router;
