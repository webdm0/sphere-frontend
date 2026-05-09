"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityId } from "@/types";
import { isTempId } from "@/utils/entityId";
import {
  captureBoardLayoutProjection,
  type BoardLayoutProjection,
} from "@/utils/boardLayoutProjection";

type CardLike = {
  id: string;
};

type ColumnLike<TCard extends CardLike = CardLike> = {
  id: string;
  cards: TCard[];
};

type ReorderColumnPayload = {
  id: EntityId;
  order: number;
};

type ReorderCardsPayload = {
  targetColumnId: EntityId;
  cards: {
    id: EntityId;
    order: number;
  }[];
};

interface UseBoardReorderQueueOptions {
  reorderColumn: (columns: ReorderColumnPayload[]) => Promise<unknown>;
  reorderCardsInColumn: (payload: ReorderCardsPayload) => Promise<unknown>;
  refresh: () => Promise<unknown>;
}

export function useBoardReorderQueue<TColumn extends ColumnLike>({
  reorderColumn,
  reorderCardsInColumn,
  refresh,
}: UseBoardReorderQueueOptions) {
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const [pendingReorders, setPendingReorders] = useState(0);
  const [optimisticLayout, setOptimisticLayout] =
    useState<BoardLayoutProjection | null>(null);

  useEffect(() => {
    if (pendingReorders !== 0) return;
    setOptimisticLayout(null);
  }, [pendingReorders]);

  const enqueueReorder = useCallback(
    (task: () => Promise<void>) => {
      setPendingReorders((prev) => prev + 1);

      queueRef.current = queueRef.current
        .catch(() => {})
        .then(async () => {
          try {
            await task();
          } catch {
            try {
              await refresh();
            } catch {}
          } finally {
            setPendingReorders((prev) => Math.max(0, prev - 1));
          }
        });
    },
    [refresh],
  );

  const commitColumnReorder = useCallback(
    (columns: TColumn[]) => {
      setOptimisticLayout(captureBoardLayoutProjection(columns));

      const persistedColumns = columns.filter(
        (column) => !isTempId(String(column.id)),
      );

      enqueueReorder(async () => {
        await reorderColumn(
          persistedColumns.map((column, index) => ({
            id: column.id,
            order: index,
          })),
        );
      });
    },
    [enqueueReorder, reorderColumn],
  );

  const commitCardReorder = useCallback(
    (columns: TColumn[], targetColumnId: string) => {
      if (isTempId(targetColumnId)) return;

      setOptimisticLayout(captureBoardLayoutProjection(columns));

      const targetColumn = columns.find(
        (column) => String(column.id) === targetColumnId,
      );

      if (!targetColumn) return;

      enqueueReorder(async () => {
        await reorderCardsInColumn({
          targetColumnId,
          cards: targetColumn.cards
            .filter((card) => !isTempId(String(card.id)))
            .map((card, index) => ({
              id: card.id,
              order: index,
            })),
        });
      });
    },
    [enqueueReorder, reorderCardsInColumn],
  );

  return {
    optimisticLayout,
    hasPendingReorders: pendingReorders > 0,
    commitColumnReorder,
    commitCardReorder,
  };
}
