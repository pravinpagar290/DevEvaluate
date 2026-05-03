import axios from "axios";

const DEFAULT_API = import.meta.env.MODE === "development" ? "http://localhost:4000/api" : "https://devevaluate.onrender.com/api";
const baseURL = (import.meta.env?.VITE_API_URL || DEFAULT_API).replace(/\/$/, "");

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(async (config) => {
  try {
    // If header is already set (e.g. via explicit call), don't overwrite it
    if (config.headers.Authorization) {
      console.log("DEBUG: Authorization header already present, skipping interceptor injection");
      return config;
    }

    // Fallback to window.Clerk if available
    const token = await window.Clerk?.session?.getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("DEBUG: Authorization Header injected via window.Clerk");
    } else {
      console.warn("⚠️ No Clerk token available for request to:", config.url);
    }
  } catch (e) {
    console.error("❌ Failed to get Clerk token in interceptor:", e);
  }
  return config;
});

export default axiosInstance;