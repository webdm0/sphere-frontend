import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredDemoSession,
  hasStoredDemoSessionExpired,
  isDemoToken,
  setStoredDemoSession,
  syncDemoSessionStorage,
} from "@/utils/demoSession";

const createJwt = (payload: Record<string, unknown>) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${header}.${body}.`;
};

const DEMO_STORAGE_KEY = "sphere.demo-session";

describe("demoSession", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("recognizes demo tokens from the backend claim", () => {
    const token = createJwt({
      id: "demo-user-id",
      username: "person",
      email: "person@example.com",
      is_demo: true,
    });

    expect(isDemoToken(token)).toBe(true);
  });

  it("stores demo expiration for demo tokens and clears it for regular logins", () => {
    const demoToken = createJwt({
      id: "demo-user-id",
      username: "demo_deadbeef",
      email: "demo_deadbeef@example.invalid",
    });
    const regularToken = createJwt({
      id: "user-id",
      username: "person",
      email: "person@example.com",
    });

    syncDemoSessionStorage(demoToken, "2026-05-09T12:00:00Z");
    expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).toContain(
      "2026-05-09T12:00:00Z",
    );

    syncDemoSessionStorage(regularToken);
    expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });

  it("marks stored demo sessions as expired and removes them", () => {
    setStoredDemoSession("2026-05-09T12:00:00Z");

    expect(hasStoredDemoSessionExpired(Date.parse("2026-05-09T12:00:01Z"))).toBe(
      true,
    );
    expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });

  it("keeps unexpired demo sessions intact", () => {
    setStoredDemoSession("2026-05-09T12:00:00Z");

    expect(hasStoredDemoSessionExpired(Date.parse("2026-05-09T11:59:59Z"))).toBe(
      false,
    );
    expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).not.toBeNull();
  });

  it("treats malformed stored demo metadata as expired", () => {
    window.localStorage.setItem(DEMO_STORAGE_KEY, "{bad json");

    expect(hasStoredDemoSessionExpired()).toBe(false);
    expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });

  it("can clear stored demo metadata explicitly", () => {
    setStoredDemoSession("2026-05-09T12:00:00Z");

    clearStoredDemoSession();

    expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });
});
