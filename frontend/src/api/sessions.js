import axiosInstance from "../lib/axios";

export const sessionApi = {
  createSession: async (data, token) => {
    try {
      const response = await axiosInstance.post("/sessions", data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error) {
      console.error("createSession API error:", error);
      throw error;
    }
  },

  getActiveSessions: async (token) => {
    const response = await axiosInstance.get("/sessions/active", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  getMyRecentSessions: async (token) => {
    const response = await axiosInstance.get("/sessions/my-recent", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  getSessionById: async (id, token) => {
    const response = await axiosInstance.get(`/sessions/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  joinSession: async (id, token) => {
    const response = await axiosInstance.post(`/sessions/${id}/join`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  endSession: async ({ id, transcript }, token) => {
    const response = await axiosInstance.post(`/sessions/${id}/end`, { transcript }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  getStreamToken: async (token) => {
    const response = await axiosInstance.get(`/chat/token`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  getCodeReview: async (code, token) => {
    try {
      const response = await axiosInstance.post(`/code-review`, { code }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error) {
      console.error("getCodeReview API error:", error);
      throw error;
    }
  }
};
