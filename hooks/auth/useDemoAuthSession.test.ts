import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQueryClient } from "@tanstack/react-query";
import { createPersister } from "@/components/common/createIDBPersister";
import { useDemoAuthSession } from "@/hooks/auth/useDemoAuthSession";
import { useAppAuth } from "@/hooks/auth/useAppAuth";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { writeRedirectToast } from "@/utils/redirectToast";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

vi.mock("@/components/common/createIDBPersister", () => ({
  createPersister: vi.fn(),
}));

vi.mock("@/hooks/auth/useAppAuth", () => ({
  useAppAuth: vi.fn(),
}));

vi.mock("@/hooks/auth/useAuthActions", () => ({
  useAuthActions: vi.fn(),
}));

vi.mock("@/utils/redirectToast", () => ({
  writeRedirectToast: vi.fn(),
}));

const mockedUseAppAuth = vi.mocked(useAppAuth);
const mockedUseAuthActions = vi.mocked(useAuthActions);
const mockedWriteRedirectToast = vi.mocked(writeRedirectToast);
const mockedUseQueryClient = vi.mocked(useQueryClient);
const mockedCreatePersister = vi.mocked(createPersister);

const buildAppAuthReturn = (
  overrides: Partial<ReturnType<typeof useAppAuth>> = {}
): ReturnType<typeof useAppAuth> => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: false,
  isInitialized: true,
  loginWithToken: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const buildAuthActionsReturn = (
  demoSessionOverrides: Partial<ReturnType<typeof useAuthActions>["demoSession"]> = {}
): ReturnType<typeof useAuthActions> => ({
  login: {} as ReturnType<typeof useAuthActions>["login"],
  register: {} as ReturnType<typeof useAuthActions>["register"],
  confirmEmail: {} as ReturnType<typeof useAuthActions>["confirmEmail"],
  refreshSession: {} as ReturnType<typeof useAuthActions>["refreshSession"],
  resendConfirmation:
    {} as ReturnType<typeof useAuthActions>["resendConfirmation"],
  demoSession: {
    isPending: false,
    mutateAsync: vi.fn(),
    ...demoSessionOverrides,
  } as unknown as ReturnType<typeof useAuthActions>["demoSession"],
});

describe("useDemoAuthSession", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a demo session, writes a redirect toast, and logs the user in", async () => {
    const setError = vi.fn();
    const loginWithToken = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn();
    const removeClient = vi.fn().mockResolvedValue(undefined);
    const mutateAsync = vi.fn().mockResolvedValue({
      accessToken: "demo-token",
      demoExpiresAtUtc: "2026-04-29T12:34:56Z",
    });

    mockedUseQueryClient.mockReturnValue({
      clear,
    } as ReturnType<typeof useQueryClient>);
    mockedCreatePersister.mockReturnValue({
      persistClient: vi.fn(),
      restoreClient: vi.fn(),
      removeClient,
    });
    mockedUseAppAuth.mockReturnValue(buildAppAuthReturn({
      loginWithToken,
    }));
    mockedUseAuthActions.mockReturnValue(
      buildAuthActionsReturn({
        isPending: false,
        mutateAsync,
      })
    );

    const { result } = renderHook(() =>
      useDemoAuthSession({
        setError,
      })
    );

    await act(async () => {
      await result.current.handleTryDemo();
    });

    expect(setError).toHaveBeenCalledWith("");
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mockedWriteRedirectToast).toHaveBeenCalledWith({
      message: "Demo account created.",
      note: "It expires in about 1 hour or when you log out. Collaboration features are disabled.",
    });
    expect(clear).toHaveBeenCalledTimes(1);
    expect(removeClient).toHaveBeenCalledTimes(1);
    expect(loginWithToken).toHaveBeenCalledWith("demo-token", true, {
      demoExpiresAtUtc: "2026-04-29T12:34:56Z",
    });
    expect(result.current.isStartingDemo).toBe(true);
  });

  it("maps a 429 demo-session error into a demo-specific message", async () => {
    const setError = vi.fn();
    const loginWithToken = vi.fn();
    const clear = vi.fn();
    const removeClient = vi.fn().mockResolvedValue(undefined);
    const error = Object.assign(new Error("Too many requests."), {
      status: 429,
      retryAfterSeconds: 90,
    });
    const mutateAsync = vi.fn().mockRejectedValue(error);

    mockedUseQueryClient.mockReturnValue({
      clear,
    } as ReturnType<typeof useQueryClient>);
    mockedCreatePersister.mockReturnValue({
      persistClient: vi.fn(),
      restoreClient: vi.fn(),
      removeClient,
    });
    mockedUseAppAuth.mockReturnValue(buildAppAuthReturn({
      loginWithToken,
    }));
    mockedUseAuthActions.mockReturnValue(
      buildAuthActionsReturn({
        isPending: false,
        mutateAsync,
      })
    );

    const { result } = renderHook(() =>
      useDemoAuthSession({
        setError,
      })
    );

    await act(async () => {
      await expect(result.current.handleTryDemo()).rejects.toBe(error);
    });

    expect(setError).toHaveBeenLastCalledWith(
      "Demo is temporarily unavailable. Please wait 1 minute 30 seconds and try again."
    );
    expect(result.current.isStartingDemo).toBe(false);
    expect(clear).not.toHaveBeenCalled();
    expect(removeClient).not.toHaveBeenCalled();
    expect(loginWithToken).not.toHaveBeenCalled();
    expect(mockedWriteRedirectToast).not.toHaveBeenCalled();
  });
});
