"use client";

import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser } from "@/services/api";
import {
  createDemoSession,
  getConfirmEmail,
  refreshAccessToken,
} from "@/services/api/auth";
import { useResendConfirmation } from "@/hooks/auth/useResendConfirmation";

type ResendOptions = Parameters<typeof useResendConfirmation>[0];

interface UseAuthActionsParams {
  resendConfirmation?: ResendOptions;
}

export function useAuthActions(params: UseAuthActionsParams = {}) {
  const login = useMutation({
    mutationFn: (payload: { identifier: string; password: string }) =>
      loginUser(payload.identifier, payload.password),
  });

  const register = useMutation({
    mutationFn: (payload: { username: string; email: string; password: string }) =>
      registerUser(payload.username, payload.email, payload.password),
  });

  const confirmEmail = useMutation({
    mutationFn: (token: string) => getConfirmEmail(token),
  });

  const refreshSession = useMutation({
    mutationFn: () => refreshAccessToken(),
  });

  const demoSession = useMutation({
    mutationFn: () => createDemoSession(),
  });

  const resendConfirmation = useResendConfirmation(params.resendConfirmation);

  return { login, register, confirmEmail, refreshSession, demoSession, resendConfirmation };
}
