import { parseJwt } from "@/utils/parseJwt";

const DEMO_SESSION_STORAGE_KEY = "sphere.demo-session";

type StoredDemoSession = {
  expiresAtUtc: string;
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

export const isDemoToken = (token: string): boolean => {
  const payload = parseJwt(token);
  if (!payload) return false;

  const raw = payload as Record<string, unknown>;
  const username = normalizeIdentity(
    raw.username ??
      raw.unique_name ??
      raw["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
  );
  const email = normalizeIdentity(
    raw.email ??
      raw["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
  );

  return (
    parseBooleanClaim(raw.is_demo ?? raw.isDemo ?? raw.IsDemo ?? raw.demo) ??
    (username.startsWith("demo_") && email.endsWith("@example.invalid"))
  );
};

const readStoredDemoSession = (): StoredDemoSession | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDemoSession> | null;
    if (!parsed?.expiresAtUtc || typeof parsed.expiresAtUtc !== "string") {
      window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      return null;
    }

    return { expiresAtUtc: parsed.expiresAtUtc };
  } catch {
    window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    return null;
  }
};

export const setStoredDemoSession = (expiresAtUtc: string) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    DEMO_SESSION_STORAGE_KEY,
    JSON.stringify({ expiresAtUtc } satisfies StoredDemoSession),
  );
};

export const clearStoredDemoSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
};

export const syncDemoSessionStorage = (
  token: string,
  demoExpiresAtUtc?: string,
) => {
  if (!isDemoToken(token)) {
    clearStoredDemoSession();
    return;
  }

  if (demoExpiresAtUtc) {
    setStoredDemoSession(demoExpiresAtUtc);
  }
};

export const hasStoredDemoSessionExpired = (now = Date.now()): boolean => {
  const session = readStoredDemoSession();
  if (!session) return false;

  const expiresAt = Date.parse(session.expiresAtUtc);
  if (Number.isNaN(expiresAt)) {
    clearStoredDemoSession();
    return true;
  }

  if (expiresAt > now) return false;

  clearStoredDemoSession();
  return true;
};
