import axios from "axios";
import { useAuth } from "@/lab context/AuthContext";

// Base Axios instance with runtime-configurable base URL
// Default to bundled backend when running under Electron (file://)
const fromEnv = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
let ROOT = fromEnv && String(fromEnv).trim() ? String(fromEnv).trim() : "";

const isFileProtocol = typeof window !== "undefined" && window.location?.protocol === "file:";
if (isFileProtocol) {
  // Server listens on 5002 per server/index.js
  ROOT = "http://127.0.0.1:5002";
} else {
  // In Vite dev, prefer same-origin proxy to keep all modules pointed at the same backend.
  try {
    if ((import.meta as any)?.env?.DEV) {
      ROOT = "";
    }
  } catch {}
}
export const api = axios.create({
  baseURL: ROOT ? `${ROOT}/api` : "/api",
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    // AxiosHeaders type requires using set()/get() or providing a compatible object.
    // Safest is to mutate through bracket access to avoid TS structural mismatch.
    const headers = (config.headers ?? {}) as any;
    headers["Authorization"] = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

// Handle 401 globally: clear token and notify listeners
let handling401 = false;
api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401 && !handling401) {
      handling401 = true;
      try {
        localStorage.removeItem("token");
        try { window.dispatchEvent(new Event("auth:expired")); } catch {}
      } finally {
        handling401 = false;
      }
    }
    return Promise.reject(error);
  }
);

// React hook to get typed api instance (optional)
export const useApi = () => {
  // make sure we access auth so component re-renders on logout
  const { token } = useAuth();
  return api;
};
