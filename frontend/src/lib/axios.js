import axios from "axios";

const DEFAULT_API = "http://localhost:4000/api";
const baseURL = import.meta.env?.VITE_API_URL || DEFAULT_API;

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // by adding this field browser will send the cookies to server automatically, on every single req
});

export default axiosInstance;