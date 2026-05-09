import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/types";
import { parseJwt } from "@/utils/parseJwt";

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  isBootstrapping: boolean;
  isLoggingOut: boolean;
};

const initialState: AuthState = {
  accessToken: null,
  user: null,
  isBootstrapping: true,
  isLoggingOut: false,
};

const parseBooleanClaim = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
};

const normalizeIdentity = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const buildUserFromToken = (token: string): AuthUser | null => {
  const payload = parseJwt(token);
  if (!payload) return null;

  const raw = payload as Record<string, unknown>;
  const id =
    raw.id ??
    raw["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
  const username =
    raw.username ??
    raw.unique_name ??
    raw["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
  const email =
    raw.email ??
    raw["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
  const normalizedUsername = normalizeIdentity(username);
  const normalizedEmail = normalizeIdentity(email);
  const isDemo =
    parseBooleanClaim(raw.is_demo ?? raw.isDemo ?? raw.IsDemo ?? raw.demo) ??
    (normalizedUsername.startsWith("demo_") &&
      normalizedEmail.endsWith("@example.invalid"));

  if (!id || !username) return null;

  return {
    id: String(id),
    username: String(username),
    email: email ? String(email) : "",
    isDemo,
  };
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAccessToken: (state, action: PayloadAction<string | null>) => {
      state.accessToken = action.payload;
      state.user = action.payload ? buildUserFromToken(action.payload) : null;
      state.isLoggingOut = false;
    },
    startBootstrap: (state) => {
      state.isBootstrapping = true;
    },
    finishBootstrap: (state) => {
      state.isBootstrapping = false;
    },
    logOut: (state) => {
      state.accessToken = null;
      state.user = null;
      state.isBootstrapping = false;
      state.isLoggingOut = true;
    },
  },
});

export const { setAccessToken, startBootstrap, finishBootstrap, logOut } =
  authSlice.actions;

export default authSlice.reducer;
