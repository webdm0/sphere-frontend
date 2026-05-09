import { describe, expect, it } from "vitest";
import authReducer, { setAccessToken } from "@/store/slices/authSlice";

const createJwt = (payload: Record<string, unknown>) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${header}.${body}.`;
};

describe("authSlice", () => {
  it("reads the backend is_demo claim into auth state", () => {
    const token = createJwt({
      id: "demo-user-id",
      username: "demo_a1b2c3",
      email: "demo_a1b2c3@example.invalid",
      is_demo: "true",
    });

    const state = authReducer(undefined, setAccessToken(token));

    expect(state.user).toEqual({
      id: "demo-user-id",
      username: "demo_a1b2c3",
      email: "demo_a1b2c3@example.invalid",
      isDemo: true,
    });
  });

  it("falls back to demo identity when the explicit claim is missing", () => {
    const token = createJwt({
      id: "demo-user-id",
      username: "demo_deadbeef",
      email: "demo_deadbeef@example.invalid",
    });

    const state = authReducer(undefined, setAccessToken(token));

    expect(state.user?.isDemo).toBe(true);
  });
});
