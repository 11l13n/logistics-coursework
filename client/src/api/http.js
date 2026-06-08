import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api"
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("logistics_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Не удалось выполнить запрос";

export default http;
