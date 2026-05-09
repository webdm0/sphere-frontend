"use client";

import { useCallback, useEffect, useRef } from "react";
import { getBoardById, getBoardColumns } from "@/services/api";
import { slugify } from "@/utils/slugify";
import type { QueryClient } from "@tanstack/react-query";
import type { EntityId } from "@/types";

const BOARD_HOVER_PREFETCH_DELAY_MS = 100;

interface UseBoardPrefetchParams {
  router: { prefetch: (href: string) => void };
  queryClient: QueryClient;
}

export function useBoardPrefetch({ router, queryClient }: UseBoardPrefetchParams) {
  const prefetchTimeoutRef = useRef<number | null>(null);

  const cancelScheduledPrefetch = useCallback(() => {
    if (prefetchTimeoutRef.current == null) return;
    window.clearTimeout(prefetchTimeoutRef.current);
    prefetchTimeoutRef.current = null;
  }, []);

  const prefetchBoard = useCallback(
    (board: { id: EntityId; title: string }) => {
      cancelScheduledPrefetch();

      const slug = slugify(board.title);
      router.prefetch(`/b/${board.id}/${slug}`);

      const boardIdKey = board.id;

      queryClient.prefetchQuery({
        queryKey: ["board", boardIdKey, "meta"],
        queryFn: ({ signal }) => getBoardById(board.id, { signal }),
        staleTime: 1000 * 60 * 2,
      });

      queryClient.prefetchQuery({
        queryKey: ["board", boardIdKey, "columns"],
        queryFn: ({ signal }) => getBoardColumns(board.id, { signal }),
        staleTime: 1000 * 60 * 2,
      });
    },
    [cancelScheduledPrefetch, queryClient, router]
  );

  const schedulePrefetchBoard = useCallback(
    (board: { id: EntityId; title: string }) => {
      cancelScheduledPrefetch();
      prefetchTimeoutRef.current = window.setTimeout(() => {
        prefetchTimeoutRef.current = null;
        prefetchBoard(board);
      }, BOARD_HOVER_PREFETCH_DELAY_MS);
    },
    [cancelScheduledPrefetch, prefetchBoard]
  );

  useEffect(() => cancelScheduledPrefetch, [cancelScheduledPrefetch]);

  return {
    prefetchBoard,
    schedulePrefetchBoard,
    cancelScheduledPrefetch,
  };
}
