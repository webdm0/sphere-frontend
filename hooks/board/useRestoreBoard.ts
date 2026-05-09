"use client";

import { useCallback, useState } from "react";

interface UseRestoreBoardParams {
  boardId: string | null;
  restoreBoard: (id: string) => Promise<unknown>;
  refresh: () => void | Promise<unknown>;
  onErrorToast?: (message: string, note?: string) => void;
}

export function useRestoreBoard({
  boardId,
  restoreBoard,
  refresh,
  onErrorToast,
}: UseRestoreBoardParams) {
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = useCallback(async () => {
    if (boardId == null || isRestoring) return;
    setIsRestoring(true);
    try {
      await restoreBoard(boardId);
      void refresh();
    } catch {
      onErrorToast?.("Failed to restore board.");
    } finally {
      setIsRestoring(false);
    }
  }, [boardId, isRestoring, onErrorToast, refresh, restoreBoard]);

  return { isRestoring, handleRestore };
}
