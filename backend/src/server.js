import express from "express";
import { ENV } from "./utils/env.js";
import { connectDB } from "./utils/db.js";

const app = express();

connectDB();

app.listen(ENV.PORT, () => {
  console.log(`Server is running on PORT ${ENV.PORT}`);
});
