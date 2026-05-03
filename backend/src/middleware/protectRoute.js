import { getAuth } from "@clerk/express";
import User from "../models/User.model.js";
import { logger } from "../utils/logger.js";

export const protectRoute = [
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const userId = auth?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - No session found" });
      }
      
      const user = await User.findOne({ clerkId: userId });
      if (!user) {
        console.warn(`🔐 protectRoute: User with clerkId ${userId} not found in DB`);
        return res.status(404).json({ message: "User not found" });
      }
      
      req.user = user;
      next();
    } catch (error) {
      logger.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];
