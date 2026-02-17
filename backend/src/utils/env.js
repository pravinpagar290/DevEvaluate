import dotenv from "dotenv";

dotenv.config({quiet:true});

export const ENV = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  CORS_ORIGIN: process.env.CORS_ORIGIN ,
  NODE_ENV:process.env.NODE_ENV,
};
