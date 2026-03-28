import axiosInstance from "../lib/axios";

export const sessionApi = {
  createSession: async (data) => {
    try {
      const response = await axiosInstance.post("/sessions", data);
      return response.data;
    } catch (error) {
      console.error("createSession API error:", error);
      throw error;
    }
  },

  getActiveSessions: async () => {
    const response = await axiosInstance.get("/sessions/active");
    return response.data;
  },
  getMyRecentSessions: async () => {
    const response = await axiosInstance.get("/sessions/my-recent");
    return response.data;
  },

  getSessionById: async (id) => {
    const response = await axiosInstance.get(`/sessions/${id}`);
    return response.data;
  },

  joinSession: async (id) => {
    const response = await axiosInstance.post(`/sessions/${id}/join`);
    return response.data;
  },
  endSession: async (id) => {
    const response = await axiosInstance.post(`/sessions/${id}/end`);
    return response.data;
  },
  getStreamToken: async () => {
    const response = await axiosInstance.get(`/chat/token`);
    return response.data;
  },
  getCodeReview:async(code)=>{
    try {
      const response= await axiosInstance.post(`/code-review`, { code });
      return response.data;
    } catch (error) {
      console.error("getCodeReview API error:", error);
      throw error;
    }
  }
};
