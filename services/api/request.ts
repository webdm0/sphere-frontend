import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  type AxiosHeaderValue,
} from "axios";
import { store } from "@/store/store";
import { logOut, setAccessToken } from "@/store/slices/authSlice";
import {
  notifyAuthSessionExpired,
  redirectToLoginIfNeeded,
} from "@/utils/authSession";
import {
  clearStoredDemoSession,
  syncDemoSessionStorage,
} from "@/utils/demoSession";

export const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
if (!API_URL) throw new Error("API_URL is undefined!");

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type RefreshResponse = { accessToken?: string };
type ErrorResponseData =
  | {
      errors?: unknown;
      message?: unknown;
      title?: unknown;
      detail?: unknown;
      retryAfterSeconds?: unknown;
      retryAfterUtc?: unknown;
    }
  | string
  | null
  | undefined;

type RetriableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

const DEFAULT_ERROR_MESSAGE = "Something went wrong.";
const REFRESH_ENDPOINT = "/api/auth/refresh";
const REFRESH_TIMEOUT_MS = 10_000;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: REFRESH_TIMEOUT_MS,
});

let refreshInFlight: Promise<string> | null = null;

const isRefreshRequest = (config?: AxiosRequestConfig) =>
  Boolean(config?.url?.includes(REFRESH_ENDPOINT));

const toAxiosHeaders = (headers?: AxiosRequestConfig["headers"]) => {
  if (headers instanceof AxiosHeaders) return headers;

  const normalized = new AxiosHeaders();
  if (!headers) return normalized;

  for (const [name, value] of Object.entries(headers)) {
    if (value == null) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      if (value instanceof AxiosHeaders) {
        normalized.set(name, value);
      }
      continue;
    }
    normalized.set(name, value as AxiosHeaderValue);
  }

  return normalized;
};

const hasAuthorizationHeader = (config?: AxiosRequestConfig) => {
  if (!config?.headers) return false;
  const headers = toAxiosHeaders(config.headers);
  return Boolean(headers.get("Authorization"));
};

const handleSessionExpired = () => {
  store.dispatch(logOut());
  clearStoredDemoSession();
  notifyAuthSessionExpired();
  redirectToLoginIfNeeded();
};

const setAuthorizationHeader = (
  config: { headers?: AxiosRequestConfig["headers"] },
  token: string
) => {
  const headers = toAxiosHeaders(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
};

const withoutAbortSignal = (config: RetriableRequestConfig) => {
  if (!config.signal) return config;
  const rest = { ...config };
  delete rest.signal;
  return rest as RetriableRequestConfig;
};

const performRefreshRequest = async () => {
  const response = await refreshClient.post<RefreshResponse>(
    REFRESH_ENDPOINT
  );
  const accessToken = response.data?.accessToken;
  if (!accessToken) {
    throw new Error("Refresh response does not contain access token.");
  }
  syncDemoSessionStorage(accessToken);
  store.dispatch(setAccessToken(accessToken));
  return accessToken;
};

export const requestAccessTokenRefresh = async () => {
  if (!refreshInFlight) {
    refreshInFlight = performRefreshRequest().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token && !isRefreshRequest(config)) {
    setAuthorizationHeader(config, token);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const isProtectedUnauthorizedRequest =
      status === 401 &&
      Boolean(originalRequest) &&
      !isRefreshRequest(originalRequest) &&
      hasAuthorizationHeader(originalRequest);

    if (isProtectedUnauthorizedRequest && originalRequest) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await requestAccessTokenRefresh();
          setAuthorizationHeader(originalRequest, newToken);
          return api.request(withoutAbortSignal(originalRequest));
        } catch (refreshError) {
          handleSessionExpired();
          return Promise.reject(refreshError);
        }
      }

      if (originalRequest._retry) {
        handleSessionExpired();
      }
    }

    return Promise.reject(error);
  }
);

const sanitizeErrorMessage = (value: string, fallback = DEFAULT_ERROR_MESSAGE) => {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const looksLikeHtml =
    trimmed.startsWith("<") || /<html|<!doctype|<body|<pre/i.test(trimmed);
  if (looksLikeHtml) return fallback;

  const normalized = trimmed.replace(/\s+/g, " ");
  const maxLength = 240;
  if (normalized.length > maxLength) {
    return `${normalized.slice(0, maxLength)}...`;
  }
  return normalized;
};

const getHeaderString = (headers: unknown, name: string): string | null => {
  if (headers instanceof AxiosHeaders) {
    const value = headers.get(name);
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const firstValue = value.find((item) => item != null);
      return firstValue == null ? null : String(firstValue);
    }
    return value == null ? null : String(value);
  }

  if (!headers || typeof headers !== "object") return null;

  const normalizedName = name.toLowerCase();
  for (const [headerName, value] of Object.entries(headers as Record<string, unknown>)) {
    if (headerName.toLowerCase() !== normalizedName) continue;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
      const firstValue = value.find((item) => item != null);
      return firstValue == null ? null : String(firstValue);
    }
    return value == null ? null : String(value);
  }

  return null;
};

const parseRetryAfterSeconds = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.ceil(value);
  }

  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return Math.ceil(numericValue);
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return undefined;

  const secondsUntilRetry = Math.ceil((timestamp - Date.now()) / 1000);
  return secondsUntilRetry > 0 ? secondsUntilRetry : undefined;
};

const formatRetryAfter = (seconds: number) => {
  const totalSeconds = Math.max(1, Math.ceil(seconds));
  const units = [
    { size: 3600, label: "hour" },
    { size: 60, label: "minute" },
    { size: 1, label: "second" },
  ];

  const parts: string[] = [];
  let remainder = totalSeconds;

  for (const unit of units) {
    if (remainder < unit.size && parts.length === 0 && unit.size !== 1) {
      continue;
    }

    const amount = Math.floor(remainder / unit.size);
    if (amount <= 0) continue;

    parts.push(`${amount} ${unit.label}${amount === 1 ? "" : "s"}`);
    remainder -= amount * unit.size;

    if (parts.length === 2) break;
  }

  return parts.join(" ");
};

const getRetryAfterSeconds = (err: AxiosError<ErrorResponseData>) => {
  const data = err.response?.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const bodyValue = parseRetryAfterSeconds(data.retryAfterSeconds);
    if (bodyValue) return bodyValue;
  }

  const headerValue = getHeaderString(err.response?.headers, "Retry-After");
  return parseRetryAfterSeconds(headerValue);
};

const getRetryAfterUtc = (err: AxiosError<ErrorResponseData>) => {
  const data = err.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return typeof data.retryAfterUtc === "string" ? data.retryAfterUtc : undefined;
};

const findFirstString = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedMessage = findFirstString(item);
      if (nestedMessage) return nestedMessage;
    }
    return null;
  }

  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nestedMessage = findFirstString(nestedValue);
      if (nestedMessage) return nestedMessage;
    }
  }

  return null;
};

const getErrorMessage = (
  err: AxiosError<ErrorResponseData>,
  fallback = DEFAULT_ERROR_MESSAGE
) => {
  const data = err.response?.data;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const validationMessage = findFirstString(data.errors);
    if (validationMessage) {
      return sanitizeErrorMessage(validationMessage, fallback);
    }

    const retryAfterSeconds = getRetryAfterSeconds(err);
    if (err.response?.status === 429 && retryAfterSeconds) {
      return `Too many requests. Please wait ${formatRetryAfter(retryAfterSeconds)} and try again.`;
    }

    if (typeof data.message === "string") {
      return sanitizeErrorMessage(data.message, fallback);
    }

    if (typeof data.detail === "string") {
      return sanitizeErrorMessage(data.detail, fallback);
    }

    if (typeof data.title === "string") {
      return sanitizeErrorMessage(data.title, fallback);
    }
  }

  if (typeof data === "string") {
    return sanitizeErrorMessage(data, fallback);
  }

  return fallback;
};

const request = async <T>(
  method: Method,
  url: string,
  data?: unknown,
  signal?: AbortSignal
): Promise<T> => {
  try {
    const response = await api.request<T>({
      method,
      url,
      data,
      signal,
    });

    if (method === "GET" && typeof response.data === "undefined") {
      const emptyPayloadError = new Error(
        "Empty response payload from server."
      ) as Error & { status?: number; isNetworkError?: boolean };
      emptyPayloadError.status = response.status;
      emptyPayloadError.isNetworkError = false;
      throw emptyPayloadError;
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const err = error as AxiosError<ErrorResponseData>;
      const message = getErrorMessage(err);
      const enriched = new Error(message) as Error & {
        status?: number;
        isNetworkError?: boolean;
        retryAfterSeconds?: number;
        retryAfterUtc?: string;
      };
      enriched.status = err.response?.status;
      enriched.isNetworkError = !err.response;
      enriched.retryAfterSeconds = getRetryAfterSeconds(err);
      enriched.retryAfterUtc = getRetryAfterUtc(err);
      throw enriched;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(DEFAULT_ERROR_MESSAGE);
  }
};

export const get = <T>(url: string, signal?: AbortSignal) =>
  request<T>("GET", url, undefined, signal);

export const post = <T>(url: string, data?: unknown, signal?: AbortSignal) =>
  request<T>("POST", url, data, signal);

export const put = <T>(url: string, data: unknown, signal?: AbortSignal) =>
  request<T>("PUT", url, data, signal);

export const patch = <T>(url: string, data: unknown, signal?: AbortSignal) =>
  request<T>("PATCH", url, data, signal);

export const del = <T>(url: string, signal?: AbortSignal) =>
  request<T>("DELETE", url, undefined, signal);
