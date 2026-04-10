import { ENV } from "./utils/env.js";
import express from "express";
import path from "path";
import { connectDB } from "./utils/db.js";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./utils/inngest.js";
import { logger } from "./utils/logger.js";
import { clerkMiddleware } from "@clerk/express";
import { protectRoute } from "./middleware/protectRoute.js";
import chatRoutes from "./routes/chat.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import codeReviewRoutes from "./routes/code-review.routes.js";

const app = express();

// CORS must be first so preflight OPTIONS requests are handled before auth
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://devevaluate.netlify.app",
      ENV.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  }),
);

app.use(express.json());
app.use(clerkMiddleware());


app.use((req, res, next) => {
  console.log("📥 Incoming request:", req.method, req.url)
  console.log("🔑 Auth header:", req.headers.authorization ? "EXISTS" : "MISSING")
  next()
})

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`;
    if (res.statusCode >= 400) {
      logger.error(message);
    } else {
      logger.info(message);
    }
  });
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});
app.get("/video-calls", protectRoute, (req, res) => {
  res.status(200).json({ message: "this is video-calls endpoint" });
});
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/code-review", codeReviewRoutes);

const __dirname = path.resolve();

// Optional fallback for single-server deployments.
if (ENV.NODE_ENV === "production" && ENV.SERVE_FRONTEND === "true") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const serverStart = async () => {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => {
      logger.success(`Server is running on http://localhost:${ENV.PORT}`);
    });
  } catch (error) {
    logger.error("Unable to start the server", error);
  }
};
serverStart();
