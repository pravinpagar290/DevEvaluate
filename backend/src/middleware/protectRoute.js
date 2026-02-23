import { requireAuth } from "@clerk/express";
import User from "../models/User.model";
import { err } from "inngest/types";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;
      if (!clerkId) return res.status(401).json({ message: "Unauthorized" });
      const user = awaitUser.findById({ clerkId });
      if (!user) return res.status(404).json({ message: "User not found" });
      req.user = user;
      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];
