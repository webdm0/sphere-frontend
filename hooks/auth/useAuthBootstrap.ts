"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import {
  finishBootstrap,
  logOut,
  setAccessToken,
  startBootstrap,
} from "@/store/slices/authSlice";
import { refreshAccessToken } from "@/services/api/auth";
import { notifyAuthSessionExpired } from "@/utils/authSession";
import { syncDemoSessionStorage } from "@/utils/demoSession";

const PUBLIC_PATHS = new Set(["/login", "/register", "/confirm-email"]);
const AUTH_REDIRECT_PATH = "/boards";

export const useAuthBootstrap = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { accessToken, isLoggingOut } = useSelector(
    (state: RootState) => state.auth
  );

  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false;

  useEffect(() => {
    let isActive = true;

    if (isLoggingOut) {
      if (!isPublic) {
        router.push("/login");
      }
      dispatch(finishBootstrap());
      return;
    }

    if (isPublic) {
      if (accessToken) {
        router.replace(AUTH_REDIRECT_PATH);
        dispatch(finishBootstrap());
        return;
      }

      dispatch(startBootstrap());

      refreshAccessToken().then((response) => {
        if (!isActive) return;
        if (response?.accessToken) {
          syncDemoSessionStorage(response.accessToken);
          dispatch(setAccessToken(response.accessToken));
          router.replace(AUTH_REDIRECT_PATH);
        }
        dispatch(finishBootstrap());
      });

      return () => {
        isActive = false;
      };
    }

    if (accessToken) {
      dispatch(finishBootstrap());
      return;
    }

    dispatch(startBootstrap());

    refreshAccessToken().then((response) => {
      if (!isActive) return;
      if (!response?.accessToken) {
        notifyAuthSessionExpired();
        dispatch(logOut());
        router.push("/login");
        return;
      }
      syncDemoSessionStorage(response.accessToken);
      dispatch(setAccessToken(response.accessToken));
      dispatch(finishBootstrap());
    });

    return () => {
      isActive = false;
    };
  }, [accessToken, dispatch, isLoggingOut, isPublic, router]);

  return { accessToken, isPublic };
};
