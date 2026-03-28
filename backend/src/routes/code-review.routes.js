import { getReview } from "../controllers/codeReview.controller.js";
import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/", protectRoute, getReview);

export default router;