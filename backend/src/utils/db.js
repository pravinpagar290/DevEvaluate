import mongoose from "mongoose";
import { ENV } from "./env.js";
import { logger } from "./logger.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    logger.success("MongoDB Connected Successfully");
  } catch (error) {
    logger.error("MongoDB Connection Error", error);
    process.exit(1);
  }
};
