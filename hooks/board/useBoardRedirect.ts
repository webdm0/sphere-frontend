"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { writeRedirectToast } from "@/utils/redirectToast";

type ErrorWithStatus = { status?: number };

export function useBoardRedirect(
  boardId: string | undefined,
  boardError?: unknown,
  columnsError?: unknown
) {
  const router = useRouter();
  const redirectRef = useRef(false);

  useEffect(() => {
    if (!boardId || redirectRef.current) return;
    const error = boardError ?? columnsError;
    if (!error) return;
    const status = (error as ErrorWithStatus)?.status;
    if (status !== 400 && status !== 403 && status !== 404) return;

    redirectRef.current = true;
    const message =
      status === 404
        ? "Board not found."
        : status === 403
          ? "You don't have access to this board."
          : "Invalid board link.";
    writeRedirectToast({ message });
    router.replace("/boards");
  }, [boardError, boardId, columnsError, router]);
}
