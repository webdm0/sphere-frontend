"use client";

import { useAuthBootstrap } from "@/hooks/auth/useAuthBootstrap";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { accessToken, isPublic } = useAuthBootstrap();

  if (!isPublic && !accessToken) {
    return null;
  }

  return <>{children}</>;
}
