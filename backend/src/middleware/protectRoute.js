import { getAuth, requireAuth } from "@clerk/express";
import User from "../models/User.model.js";

export const protectRoute = [

  async (req, res, next) => {
    try {
      console.log("🔐 protectRoute: Checking Auth... headers:", !!req.headers.authorization);
      const auth = getAuth(req);
      const userId = auth?.userId;
      console.log("🔐 userId from Clerk:", userId);

      if (!userId) {
        console.warn("🔐 protectRoute: No userId found, sending 401");
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await User.findOne({   clerkId:userId });
      if (!user) return res.status(404).json({ message: "User not found" });
      req.user = user;
      next();
    } catch (error) {
      logger.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];
