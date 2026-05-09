"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createPersister } from "@/components/common/createIDBPersister";
import { useAppAuth } from "@/hooks/auth/useAppAuth";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { writeRedirectToast } from "@/utils/redirectToast";

type AuthRequestError = Error & {
  status?: number;
  retryAfterSeconds?: number;
  retryAfterUtc?: string;
};

interface UseDemoAuthSessionArgs {
  setError: (message: string) => void;
}

const DEMO_TOAST_MESSAGE = "Demo account created.";
const DEMO_TOAST_NOTE =
  "It expires in about 1 hour or when you log out. Collaboration features are disabled.";

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

const getRetryAfterSeconds = (err: AuthRequestError) => {
  if (
    typeof err.retryAfterSeconds === "number" &&
    Number.isFinite(err.retryAfterSeconds) &&
    err.retryAfterSeconds > 0
  ) {
    return Math.ceil(err.retryAfterSeconds);
  }

  if (typeof err.retryAfterUtc !== "string") return undefined;
  const timestamp = Date.parse(err.retryAfterUtc);
  if (Number.isNaN(timestamp)) return undefined;

  const secondsUntilRetry = Math.ceil((timestamp - Date.now()) / 1000);
  return secondsUntilRetry > 0 ? secondsUntilRetry : undefined;
};

const getDemoErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Failed to start demo session.";
  }

  const err = error as AuthRequestError;
  if (err.status === 429) {
    const retryAfterSeconds = getRetryAfterSeconds(err);
    if (retryAfterSeconds) {
      return `Demo is temporarily unavailable. Please wait ${formatRetryAfter(
        retryAfterSeconds
      )} and try again.`;
    }

    return "Demo is temporarily unavailable due to too many attempts. Please try again soon.";
  }

  return err.message || "Failed to start demo session.";
};

export function useDemoAuthSession({ setError }: UseDemoAuthSessionArgs) {
  const { loginWithToken } = useAppAuth();
  const { demoSession } = useAuthActions();
  const queryClient = useQueryClient();
  const persister = useMemo(() => createPersister(), []);
  const [isRedirectingToDemo, setIsRedirectingToDemo] = useState(false);
  const isStartingDemoRef = useRef(false);

  const handleTryDemo = useCallback(async () => {
    if (isStartingDemoRef.current || demoSession.isPending) return;
    isStartingDemoRef.current = true;
    setIsRedirectingToDemo(true);
    setError("");

    try {
      const response = await demoSession.mutateAsync();
      queryClient.clear();
      await persister.removeClient();
      writeRedirectToast({
        message: DEMO_TOAST_MESSAGE,
        note: DEMO_TOAST_NOTE,
      });
      await loginWithToken(response.accessToken, true, {
        demoExpiresAtUtc: response.demoExpiresAtUtc,
      });
    } catch (error) {
      isStartingDemoRef.current = false;
      setIsRedirectingToDemo(false);
      setError(getDemoErrorMessage(error));
      throw error;
    }
  }, [demoSession, loginWithToken, persister, queryClient, setError]);

  return {
    isStartingDemo: isRedirectingToDemo || demoSession.isPending,
    handleTryDemo,
  };
}
