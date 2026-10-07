import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, AuthPayload } from "../types/api";

export const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
export const rawClient = axios.create({ baseURL, withCredentials: true, headers: { "Content-Type": "application/json" } });
export const apiClient = axios.create({ baseURL, withCredentials: true, headers: { "Content-Type": "application/json" } });
let accessToken: string | null = null;
let refreshPromise: Promise<AuthPayload> | null = null;
let authFailure: (() => void) | null = null;
let authGeneration = 0;
const tokenListeners = new Set<(token: string | null) => void>();

export const getAuthGeneration = () => authGeneration;
export const nextAuthGeneration = () => ++authGeneration;

export const getAccessToken = () => accessToken;
export const onTokenChange = (listener: (token: string | null) => void) => {
  tokenListeners.add(listener);
  return () => { tokenListeners.delete(listener); };
};
export const setAccessToken = (token: string | null) => {
  accessToken = token;
  tokenListeners.forEach(listener => {
    try { listener(token); } catch { /* ignore listener error */ }
  });
};
export const setAuthFailureHandler = (handler: () => void) => { authFailure = handler; };

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

async function doRefresh() {
  const response = await rawClient.post<ApiResponse<AuthPayload>>("/auth/refresh", {});
  return response.data.data;
}

export async function refreshAccess(expectedGen: number): Promise<AuthPayload> {
  if (!refreshPromise) {
    const execute = async () => {
      const locks = (navigator as Navigator & { locks?: { request: <T>(name: string, callback: () => Promise<T>) => Promise<T> } }).locks;
      return locks ? locks.request("mern-blog-refresh", doRefresh) : doRefresh();
    };
    refreshPromise = execute().finally(() => { refreshPromise = null; });
  }
  const payload = await refreshPromise;
  if (expectedGen === authGeneration) {
    setAccessToken(payload.accessToken);
  }
  return payload;
}

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  if (error.response?.status !== 401 || !config || config._retried || config.url?.includes("/auth/")) return Promise.reject(error);
  config._retried = true;
  const gen = authGeneration;
  try { 
    const auth = await refreshAccess(gen); 
    if (gen !== authGeneration) return Promise.reject(new Error("Auth generation changed"));
    config.headers.Authorization = `Bearer ${auth.accessToken}`; 
    return apiClient(config); 
  }
  catch (refreshError: any) { 
    if (refreshError?.response?.status === 401 && gen === authGeneration) {
      setAccessToken(null); 
      authFailure?.(); 
    }
    return Promise.reject(refreshError); 
  }
});

export function apiMessage(error: unknown) {
  if (axios.isAxiosError(error)) return (error.response?.data as any)?.message || (error.code === "ERR_NETWORK" ? "Cannot reach the server" : error.message);
  return error instanceof Error ? error.message : "Something went wrong";
}
