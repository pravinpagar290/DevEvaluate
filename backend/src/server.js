import express from "express";
import { ENV } from "./utils/env.js";
import path from "path";
import { connectDB } from "./utils/db.js";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./utils/inngest.js";
import { logger } from "./utils/logger.js";

const app = express();
app.use(express.json());

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

app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  }),
);
const __dirname = path.resolve();

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

app.use("/api/inngest", serve({ client: inngest, functions }));

// make our app ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const serverStart = async () => {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => {
      logger.success(`Server is running on PORT ${ENV.PORT}`);
    });
  } catch (error) {
    logger.error("Unable to start the server", error);
  }
};
serverStart();
