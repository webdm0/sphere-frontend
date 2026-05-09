"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

export const useAccessToken = () =>
  useSelector((state: RootState) => state.auth.accessToken);
