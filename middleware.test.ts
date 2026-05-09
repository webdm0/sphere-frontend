import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_ENV = { ...process.env };

const toBase64Url = (value: string | Uint8Array) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createSessionHintToken = () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      sid: "session-1",
      ver: "1",
      iat: nowSeconds,
      exp: nowSeconds + 60,
    })
  );
  return `${header}.${payload}.${toBase64Url("signature")}`;
};

const createRequest = (path: string, cookieHeader?: string) =>
  new NextRequest(`https://frontend.example.com${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

const importMiddleware = async (env?: {
  NEXT_PUBLIC_API_URL?: string;
  BACKEND_URL?: string;
  SESSION_HINT_KEY?: string;
}) => {
  vi.resetModules();

  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.BACKEND_URL;
  delete process.env.SESSION_HINT_KEY;
  delete process.env.SESSION_HINT_ISS;
  delete process.env.SESSION_HINT_AUD;

  if (env?.NEXT_PUBLIC_API_URL) {
    process.env.NEXT_PUBLIC_API_URL = env.NEXT_PUBLIC_API_URL;
  }
  if (env?.BACKEND_URL) {
    process.env.BACKEND_URL = env.BACKEND_URL;
  }
  if (env?.SESSION_HINT_KEY) {
    process.env.SESSION_HINT_KEY = env.SESSION_HINT_KEY;
  }

  return import("./middleware");
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.BACKEND_URL;
  delete process.env.SESSION_HINT_KEY;
  delete process.env.SESSION_HINT_ISS;
  delete process.env.SESSION_HINT_AUD;
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("middleware", () => {
  it("redirects authenticated users away from auth pages when session hint is valid", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const sessionHintKey = "test-session-hint-key";
    const sessionHint = createSessionHintToken();
    vi.spyOn(crypto.subtle, "verify").mockResolvedValue(true);
    const { middleware } = await importMiddleware({
      NEXT_PUBLIC_API_URL: "/backend",
      SESSION_HINT_KEY: sessionHintKey,
    });

    const response = await middleware(
      createRequest(
        "/login",
        `refreshToken=opaque-refresh; __session_hint=${sessionHint}`
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://frontend.example.com/boards"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects protected routes to login when refresh cookie is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { middleware } = await importMiddleware({
      NEXT_PUBLIC_API_URL: "/backend",
      BACKEND_URL: "https://api.example.com",
    });

    const response = await middleware(createRequest("/boards"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://frontend.example.com/login"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates the session against BACKEND_URL and forwards Set-Cookie on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          "set-cookie": "__session_hint=refreshed; Path=/; HttpOnly",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { middleware } = await importMiddleware({
      NEXT_PUBLIC_API_URL: "/backend",
      BACKEND_URL: "https://api.example.com/",
      SESSION_HINT_KEY: "test-session-hint-key",
    });

    const cookieHeader = "refreshToken=opaque-refresh; __session_hint=invalid";
    const response = await middleware(createRequest("/boards", cookieHeader));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/auth/session",
      expect.objectContaining({
        method: "GET",
        headers: { cookie: cookieHeader },
        cache: "no-store",
        redirect: "manual",
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("set-cookie")).toContain(
      "__session_hint=refreshed; Path=/; HttpOnly"
    );
  });

  it("clears auth cookies and redirects to login when backend session validation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 401 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { middleware } = await importMiddleware({
      NEXT_PUBLIC_API_URL: "/backend",
      BACKEND_URL: "https://api.example.com",
      SESSION_HINT_KEY: "test-session-hint-key",
    });

    const response = await middleware(
      createRequest(
        "/boards",
        "refreshToken=opaque-refresh; __session_hint=invalid"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://frontend.example.com/login"
    );
    expect(response.headers.get("set-cookie")).toContain("refreshToken=");
    expect(response.headers.get("set-cookie")).toContain("__session_hint=");
  });
});
