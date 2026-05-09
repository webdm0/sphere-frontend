import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveServerApiOrigin } from "@/utils/apiUrl";

const AUTH_PAGES = new Set(["/login", "/register", "/confirm-email"]);
const AUTH_REDIRECT_PATH = "/boards";
const LOGIN_REDIRECT_PATH = "/login";
const REFRESH_COOKIE = "refreshToken";
const SESSION_HINT_COOKIE = "__session_hint";
const SESSION_VALIDATE_PATH = "/api/auth/session";
const API_URL = resolveServerApiOrigin(
  process.env.BACKEND_URL,
  process.env.NEXT_PUBLIC_API_URL
);
const SESSION_HINT_KEY = process.env.SESSION_HINT_KEY;
const SESSION_HINT_EXPECTED_VERSION = "1";
const SESSION_HINT_CLOCK_SKEW_SECONDS = 5;

type SessionState = "valid" | "invalid" | "unknown";
type SessionValidationResult = {
  state: SessionState;
  setCookie: string | null;
};

type SessionHintPayload = {
  sid?: unknown;
  ver?: unknown;
  iat?: unknown;
  exp?: unknown;
  iss?: unknown;
  aud?: unknown;
};

const SESSION_HINT_ISS = process.env.SESSION_HINT_ISS;
const SESSION_HINT_AUD = process.env.SESSION_HINT_AUD;

let sessionHintCryptoKeyPromise: Promise<CryptoKey> | null = null;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const decodeBase64Url = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  const padded = `${base64}${"=".repeat(paddingLength)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toArrayBuffer = (value: Uint8Array) =>
  value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength
  ) as ArrayBuffer;

const decodeJsonPart = <T>(value: string): T | null => {
  try {
    const bytes = decodeBase64Url(value);
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
  } catch {
    return null;
  }
};

const getSessionHintCryptoKey = () => {
  if (!SESSION_HINT_KEY) return null;
  if (!sessionHintCryptoKeyPromise) {
    const keyBytes = new TextEncoder().encode(SESSION_HINT_KEY);
    sessionHintCryptoKeyPromise = crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }
  return sessionHintCryptoKeyPromise;
};

const isValidAudience = (aud: unknown) => {
  if (!SESSION_HINT_AUD) return true;
  if (typeof aud === "string") return aud === SESSION_HINT_AUD;
  if (Array.isArray(aud)) return aud.includes(SESSION_HINT_AUD);
  return false;
};

const validateSessionHint = async (rawHint: string | undefined) => {
  if (!rawHint) return false;
  const cryptoKeyPromise = getSessionHintCryptoKey();
  if (!cryptoKeyPromise) return false;

  const parts = rawHint.split(".");
  if (parts.length !== 3) return false;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return false;

  const header = decodeJsonPart<Record<string, unknown>>(encodedHeader);
  const payload = decodeJsonPart<SessionHintPayload>(encodedPayload);
  if (!header || !payload) return false;
  if (header.alg !== "HS256") return false;

  let isSignatureValid = false;
  try {
    const signature = toArrayBuffer(decodeBase64Url(encodedSignature));
    const data = toArrayBuffer(
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );
    const key = await cryptoKeyPromise;
    isSignatureValid = await crypto.subtle.verify("HMAC", key, signature, data);
  } catch {
    return false;
  }
  if (!isSignatureValid) return false;

  const sid = payload.sid;
  const ver = payload.ver;
  const iat = toFiniteNumber(payload.iat);
  const exp = toFiniteNumber(payload.exp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof sid !== "string" || sid.length === 0) return false;
  if (String(ver) !== SESSION_HINT_EXPECTED_VERSION) return false;
  if (iat == null || exp == null) return false;
  if (iat > nowSeconds + SESSION_HINT_CLOCK_SKEW_SECONDS) return false;
  if (exp <= nowSeconds - SESSION_HINT_CLOCK_SKEW_SECONDS) return false;
  if (SESSION_HINT_ISS && payload.iss !== SESSION_HINT_ISS) return false;
  if (!isValidAudience(payload.aud)) return false;

  return true;
};

const withSessionSetCookie = (
  response: NextResponse,
  sessionValidation: SessionValidationResult
) => {
  if (!sessionValidation.setCookie) return response;
  response.headers.append("set-cookie", sessionValidation.setCookie);
  return response;
};

const validateRefreshSession = async (
  request: NextRequest
): Promise<SessionValidationResult> => {
  if (!API_URL) return { state: "unknown", setCookie: null };

  try {
    const sessionUrl = new URL(SESSION_VALIDATE_PATH, API_URL);
    const cookieHeader = request.headers.get("cookie");
    const response = await fetch(sessionUrl.toString(), {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
      redirect: "manual",
    });

    const setCookie = response.headers.get("set-cookie");
    if (response.status === 401) return { state: "invalid", setCookie };
    if (response.ok) return { state: "valid", setCookie };
    return { state: "unknown", setCookie };
  } catch {
    return { state: "unknown", setCookie: null };
  }
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const sessionHint = request.cookies.get(SESSION_HINT_COOKIE)?.value;

  if (AUTH_PAGES.has(pathname)) {
    if (!refreshToken) {
      return NextResponse.next();
    }

    const hasValidSessionHint = await validateSessionHint(sessionHint);
    if (hasValidSessionHint) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = AUTH_REDIRECT_PATH;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    const sessionValidation = await validateRefreshSession(request);
    if (sessionValidation.state === "invalid") {
      const response = NextResponse.next();
      response.cookies.delete(REFRESH_COOKIE);
      response.cookies.delete(SESSION_HINT_COOKIE);
      return response;
    }

    if (sessionValidation.state === "valid") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = AUTH_REDIRECT_PATH;
      redirectUrl.search = "";
      return withSessionSetCookie(
        NextResponse.redirect(redirectUrl),
        sessionValidation
      );
    }

    return NextResponse.next();
  }

  if (!refreshToken) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_REDIRECT_PATH;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  const hasValidSessionHint = await validateSessionHint(sessionHint);
  if (hasValidSessionHint) {
    return NextResponse.next();
  }

  const sessionValidation = await validateRefreshSession(request);
  if (sessionValidation.state === "invalid") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_REDIRECT_PATH;
    redirectUrl.search = "";
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(REFRESH_COOKIE);
    response.cookies.delete(SESSION_HINT_COOKIE);
    return response;
  }

  if (sessionValidation.state === "valid") {
    return withSessionSetCookie(NextResponse.next(), sessionValidation);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/boards/:path*", "/b/:path*", "/login", "/register", "/confirm-email"],
};
