import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const apiClient = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    request: vi.fn(),
    post: vi.fn(),
  };

  const refreshClient = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    request: vi.fn(),
    post: vi.fn(),
  };

  return {
    apiClient,
    refreshClient,
    create: vi.fn(),
    isAxiosError: vi.fn((error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError)),
  };
});

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");

  return {
    ...actual,
    default: {
      ...actual.default,
      create: mocks.create,
      isAxiosError: mocks.isAxiosError,
    },
  };
});

describe("request error parsing", () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.create.mockReset();
    mocks.create
      .mockReturnValueOnce(mocks.apiClient)
      .mockReturnValueOnce(mocks.refreshClient);

    mocks.isAxiosError.mockReset();
    mocks.isAxiosError.mockImplementation((error: unknown) =>
      Boolean((error as { isAxiosError?: boolean })?.isAxiosError)
    );

    mocks.apiClient.interceptors.request.use.mockReset();
    mocks.apiClient.interceptors.response.use.mockReset();
    mocks.apiClient.request.mockReset();
    mocks.apiClient.post.mockReset();

    mocks.refreshClient.interceptors.request.use.mockReset();
    mocks.refreshClient.interceptors.response.use.mockReset();
    mocks.refreshClient.request.mockReset();
    mocks.refreshClient.post.mockReset();

    process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";
  });

  it("formats 429 responses using retryAfterSeconds from the body", async () => {
    const { post } = await import("./request");

    mocks.apiClient.request.mockRejectedValueOnce({
      isAxiosError: true,
      config: {},
      response: {
        status: 429,
        headers: {
          "retry-after": "60",
        },
        data: {
          title: "Too Many Requests",
          detail: "Too many attempts. Please wait 1 minutes.",
          retryAfterSeconds: 60,
          retryAfterUtc: "2026-04-20T16:35:12.3456789Z",
        },
      },
    });

    await expect(post("/api/auth/login")).rejects.toMatchObject({
      message: "Too many requests. Please wait 1 minute and try again.",
      status: 429,
      retryAfterSeconds: 60,
      retryAfterUtc: "2026-04-20T16:35:12.3456789Z",
      isNetworkError: false,
    });
  });

  it("falls back to problem detail when no retryAfter contract is present", async () => {
    const { post } = await import("./request");

    mocks.apiClient.request.mockRejectedValueOnce({
      isAxiosError: true,
      config: {},
      response: {
        status: 400,
        headers: {},
        data: {
          title: "Bad Request",
          detail: "Password must contain at least one digit.",
        },
      },
    });

    await expect(post("/api/auth/register")).rejects.toMatchObject({
      message: "Password must contain at least one digit.",
      status: 400,
      isNetworkError: false,
    });
  });

  it("creates axios clients with a relative proxy base URL", async () => {
    process.env.NEXT_PUBLIC_API_URL = "/backend";

    await import("./request");

    expect(mocks.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        baseURL: "/backend",
        withCredentials: true,
      })
    );
    expect(mocks.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        baseURL: "/backend",
        withCredentials: true,
        timeout: 10_000,
      })
    );
  });
});
