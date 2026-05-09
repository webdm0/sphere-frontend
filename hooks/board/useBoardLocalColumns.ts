"use client";

import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { ApiArchivedCard, ApiColumn, EntityId } from "@/types";
import {
  applyBoardLayoutProjection,
  type BoardLayoutProjection,
} from "@/utils/boardLayoutProjection";

type ColumnLike = {
  id: string;
  title: string;
  cards: {
    id: string;
    title: string;
    assigneeId?: EntityId | null;
    order?: number;
    columnId?: EntityId | null;
    isArchived?: boolean;
  }[];
};

interface UseBoardLocalColumnsParams<TColumn extends ColumnLike> {
  columns: TColumn[];
  pendingArchivedCards: ApiArchivedCard[];
  pendingArchivedColumns: ApiColumn[];
  setLocalColumns: Dispatch<SetStateAction<TColumn[]>>;
  isDragActive?: boolean;
  optimisticLayout?: BoardLayoutProjection | null;
  hasPendingReorders?: boolean;
}

export function useBoardLocalColumns<TColumn extends ColumnLike>({
  columns,
  pendingArchivedCards,
  pendingArchivedColumns,
  setLocalColumns,
  isDragActive = false,
  optimisticLayout = null,
  hasPendingReorders = false,
}: UseBoardLocalColumnsParams<TColumn>) {
  const syncedColumns = useMemo(() => {
    const pendingCardIds = new Set(pendingArchivedCards.map((c) => c.id));
    const pendingColumnIds = new Set(pendingArchivedColumns.map((c) => c.id));

    const filteredColumns = columns
      .filter((col) => !pendingColumnIds.has(col.id))
      .map((col) => ({
        ...col,
        cards: col.cards.filter((card) => !pendingCardIds.has(card.id)),
      }));

    if (!hasPendingReorders || !optimisticLayout) {
      return filteredColumns;
    }

    return applyBoardLayoutProjection(filteredColumns, optimisticLayout);
  }, [
    columns,
    hasPendingReorders,
    optimisticLayout,
    pendingArchivedCards,
    pendingArchivedColumns,
  ]);

  useEffect(() => {
    if (isDragActive) return;

    setLocalColumns((prev) => {
      const hasColumnOrderChanges =
        prev.length === syncedColumns.length &&
        prev.some((col, index) => col.id !== syncedColumns[index]?.id);

      const hasStructureChanges =
        hasColumnOrderChanges ||
        prev.length !== syncedColumns.length ||
        prev.some((col) => {
          const next = syncedColumns.find((c) => c.id === col.id);
          if (!next) return true;
          const prevCardIds = col.cards.map((c) => c.id).join("|");
          const nextCardIds = next.cards.map((c) => c.id).join("|");
          return prevCardIds !== nextCardIds;
        });

      const hasContentChanges =
        !hasStructureChanges &&
        prev.some((col) => {
          const next = syncedColumns.find((c) => c.id === col.id);
          if (!next) return true;
          if (col.title !== next.title) return true;
          const nextCardById = new Map(next.cards.map((c) => [c.id, c]));
          return col.cards.some((card) => {
            const nextCard = nextCardById.get(card.id);
            if (!nextCard) return true;
            return (
              card.title !== nextCard.title ||
              card.assigneeId !== nextCard.assigneeId ||
              card.order !== nextCard.order ||
              card.columnId !== nextCard.columnId ||
              card.isArchived !== nextCard.isArchived
            );
          });
        });

      return hasStructureChanges || hasContentChanges ? syncedColumns : prev;
    });
  }, [isDragActive, setLocalColumns, syncedColumns]);
}
