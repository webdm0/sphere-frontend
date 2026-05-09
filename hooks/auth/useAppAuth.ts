"use client";

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { RootState, AppDispatch } from "@/store/store";
import { logOut, setAccessToken } from "@/store/slices/authSlice";
import { logoutUser } from "@/services/api/auth";
import { createPersister } from "@/components/common/createIDBPersister";
import {
  clearStoredDemoSession,
  syncDemoSessionStorage,
} from "@/utils/demoSession";

export const useAppAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const persister = useMemo(() => createPersister(), []);
  const { user, accessToken, isBootstrapping } = useSelector(
    (state: RootState) => state.auth
  );

  const loginWithToken = useCallback(
    async (
      token: string,
      redirect = true,
      options?: { demoExpiresAtUtc?: string },
    ) => {
      syncDemoSessionStorage(token, options?.demoExpiresAtUtc);
      dispatch(setAccessToken(token));
      if (redirect) router.replace("/boards");
    },
    [dispatch, router]
  );

  const logout = useCallback(
    async (redirect = true) => {
      try {
        await logoutUser();
      } catch {
      }
      try {
        queryClient.clear();
        await persister.removeClient();
      } catch {
      } finally {
        clearStoredDemoSession();
        dispatch(logOut());
        if (redirect) router.push("/login");
      }
    },
    [dispatch, persister, queryClient, router]
  );

  return {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken),
    isBootstrapping,
    isInitialized: !isBootstrapping,
    loginWithToken,
    logout,
  };
};
