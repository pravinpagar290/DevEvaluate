import axios from "axios";

const DEFAULT_API = import.meta.env.MODE === "development" ? "http://localhost:4000/api" : "https://devevaluate.onrender.com/api";
const baseURL = (import.meta.env?.VITE_API_URL || DEFAULT_API).replace(/\/$/, "");

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(async (config) => {
  try {
    // Wait for Clerk to be ready before getting token
    console.log("🛠️ Axios interceptor: Checking Clerk...");
    await window.Clerk?.load();
    const token = await window.Clerk?.session?.getToken();
    console.log("🛠️ Axios interceptor: Token", token ? "✅ FOUND" : "❌ MISSING");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("⚠️ No Clerk token available");
    }
  } catch (e) {
    console.error("❌ Failed to get Clerk token:", e);
  }
  return config;
});

export default axiosInstance;