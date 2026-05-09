import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiBoardListItem } from "@/types";
import type { EntityId } from "@/types";

type ArchiveBoardFn = (id: EntityId) => Promise<unknown>;
type RestoreBoardFn = (id: EntityId) => Promise<unknown>;

interface UseClosedBoardsActionsOptions {
  archivedBoards: ApiBoardListItem[];
  archiveBoard: ArchiveBoardFn;
  restoreBoard: RestoreBoardFn;
}

export function useClosedBoardsActions({
  archivedBoards,
  archiveBoard,
  restoreBoard,
}: UseClosedBoardsActionsOptions) {
  const queryClient = useQueryClient();
  const [pendingClosedBoards, setPendingClosedBoards] = useState<ApiBoardListItem[]>([]);

  const [archivedBoardIds, archivedBoardKey] = useMemo(() => {
    const ids = new Set(archivedBoards.map((board) => board.id));
    const key = Array.from(ids).sort().join("|");
    return [ids, key] as const;
  }, [archivedBoards]);

  useEffect(() => {
    setPendingClosedBoards((prev) => {
      const next = prev.filter((board) => !archivedBoardIds.has(board.id));
      return next.length === prev.length ? prev : next;
    });
  }, [archivedBoardKey, archivedBoardIds]);

  const pushArchivedBoard = useCallback(
    (board: ApiBoardListItem) => {
      queryClient.setQueryData<ApiBoardListItem[]>(
        ["boards", "archived"],
        (old) => {
          if (!old) return [board];
          if (old.some((existing) => existing.id === board.id)) return old;
          return [board, ...old];
        }
      );
    },
    [queryClient]
  );

  const removeArchivedBoard = useCallback(
    (id: EntityId) => {
      queryClient.setQueryData<ApiBoardListItem[]>(
        ["boards", "archived"],
        (old) => {
          if (!old) return old;
          const next = old.filter((board) => board.id !== id);
          return next.length === old.length ? old : next;
        }
      );
    },
    [queryClient]
  );

  const archiveClosedBoard = useCallback(
    async (board: ApiBoardListItem) => {
      if (archivedBoardIds.has(board.id)) return;

      setPendingClosedBoards((prev) => {
        if (prev.some((existing) => existing.id === board.id)) return prev;
        return [board, ...prev];
      });

      try {
        await archiveBoard(board.id);
        pushArchivedBoard(board);
      } catch (error) {
        setPendingClosedBoards((prev) =>
          prev.filter((existing) => existing.id !== board.id)
        );
        throw error;
      }
    },
    [archiveBoard, archivedBoardIds, pushArchivedBoard]
  );

  const restoreClosedBoard = useCallback(
    async (board: ApiBoardListItem) => {
      await restoreBoard(board.id);
      removeArchivedBoard(board.id);
    },
    [removeArchivedBoard, restoreBoard]
  );

  return {
    pendingClosedBoards,
    archiveClosedBoard,
    restoreClosedBoard,
  };
}
