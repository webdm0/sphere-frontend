import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ApiArchivedCard,
  ApiColumn,
  EntityId,
  UpdateCardRequestDto,
  UpdateColumnRequestDto,
} from "@/types";

type CardLike = {
  id: string;
  title: string;
  order: number;
  columnId: EntityId | null;
  assigneeId?: EntityId | null;
  archivedManually: boolean;
};

type ColumnLike = {
  id: string;
  title: string;
  order?: number;
  cards: CardLike[];
};

type UpdateCardFn = (params: { id: EntityId; data: UpdateCardRequestDto }) => Promise<unknown>;
type EditColumnFn = (id: string, data: UpdateColumnRequestDto) => Promise<unknown>;

interface UseBoardArchiveActionsOptions<TColumn extends ColumnLike> {
  boardId?: string;
  localColumns: TColumn[];
  setLocalColumns: Dispatch<SetStateAction<TColumn[]>>;
  archivedCards: ApiArchivedCard[];
  archivedColumns: ApiColumn[];
  updateCard: UpdateCardFn;
  editColumn: EditColumnFn;
}

export function useBoardArchiveActions<TColumn extends ColumnLike>({
  boardId,
  localColumns,
  setLocalColumns,
  archivedCards,
  archivedColumns,
  updateCard,
  editColumn,
}: UseBoardArchiveActionsOptions<TColumn>) {
  const queryClient = useQueryClient();
  const boardKey = boardId ? String(boardId) : undefined;

  const [pendingArchivedCards, setPendingArchivedCards] = useState<ApiArchivedCard[]>([]);
  const [pendingArchivedColumns, setPendingArchivedColumns] = useState<ApiColumn[]>([]);

  const [archivedCardIds, archivedCardKey] = useMemo(() => {
    const ids = new Set<EntityId>();
    archivedCards.forEach((card) => ids.add(card.id));
    archivedColumns.forEach((col) => {
      col.cards.forEach((card) => ids.add(card.id));
    });
    const key = Array.from(ids).sort().join("|");
    return [ids, key] as const;
  }, [archivedCards, archivedColumns]);

  const [archivedColumnIds, archivedColumnKey] = useMemo(() => {
    const ids = new Set(archivedColumns.map((c) => c.id));
    const key = Array.from(ids).sort().join("|");
    return [ids, key] as const;
  }, [archivedColumns]);

  useEffect(() => {
    setPendingArchivedCards((prev) => {
      const next = prev.filter((c) => !archivedCardIds.has(c.id));
      return next.length === prev.length ? prev : next;
    });
  }, [archivedCardKey, archivedCardIds]);

  useEffect(() => {
    setPendingArchivedColumns((prev) => {
      const next = prev.filter((c) => !archivedColumnIds.has(c.id));
      return next.length === prev.length ? prev : next;
    });
  }, [archivedColumnKey, archivedColumnIds]);

  const pushArchivedCard = useCallback(
    (card: ApiArchivedCard) => {
      if (!boardKey) return;
      queryClient.setQueryData<ApiArchivedCard[]>(
        ["board", boardKey, "cards", "archived"],
        (old) => {
          if (!old) return [card];
          if (old.some((existing) => existing.id === card.id)) return old;
          return [card, ...old];
        }
      );
    },
    [boardKey, queryClient]
  );

  const pushArchivedColumn = useCallback(
    (column: ApiColumn) => {
      if (!boardKey) return;
      queryClient.setQueryData<ApiColumn[]>(
        ["board", boardKey, "columns", "archived"],
        (old) => {
          if (!old) return [column];
          if (old.some((existing) => existing.id === column.id)) return old;
          return [column, ...old];
        }
      );
      queryClient.setQueryData<ApiColumn[]>(
        ["board", boardKey, "columns"],
        (old) => {
          if (!old) return old;
          const next = old.filter((existing) => existing.id !== column.id);
          return next.length === old.length ? old : next;
        }
      );
    },
    [boardKey, queryClient]
  );

  const archiveCardById = useCallback(
    async (cardId: string) => {
      let previousColumns: TColumn[] | null = null;
      let pendingCard: ApiArchivedCard | null = null;
      const sourceColumn = localColumns.find((col) =>
        col.cards.some((card) => card.id === cardId)
      );
      const sourceCard = sourceColumn?.cards.find((card) => card.id === cardId);

      if (sourceCard) {
        const resolvedColumnId =
          sourceCard.columnId ?? (sourceColumn ? sourceColumn.id : null);
        const activeColumn =
          resolvedColumnId != null
            ? localColumns.find((col) => col.id === resolvedColumnId)
            : undefined;
        const archivedColumn =
          resolvedColumnId != null
            ? archivedColumns.find((col) => col.id === resolvedColumnId)
            : undefined;
        const resolvedColumn =
          activeColumn ??
          archivedColumn ??
          (resolvedColumnId == null ? sourceColumn : undefined);
        const resolvedTitle = resolvedColumn?.title ?? null;
        const resolvedStatus =
          activeColumn
            ? "Active"
            : archivedColumn
              ? "Archived"
              : resolvedTitle
                ? "Active"
                : "NoColumn";

        pendingCard = {
          id: cardId,
          title: sourceCard.title,
          order: sourceCard.order ?? 0,
          columnId: resolvedColumnId,
          previousColumnId: sourceCard.columnId ?? resolvedColumnId ?? null,
          previousOrder: sourceCard.order ?? null,
          assigneeId: sourceCard.assigneeId ?? null,
          archivedAt: null,
          archivedManually: true,
          columnTitle: resolvedTitle,
          columnStatus: resolvedStatus,
        };

        setPendingArchivedCards((prev) => {
          if (prev.some((c) => c.id === cardId)) return prev;
          return pendingCard ? [pendingCard, ...prev] : prev;
        });
      }

      setLocalColumns((prev) => {
        previousColumns = prev;
        return prev.map((col) => ({
          ...col,
          cards: col.cards.filter((card) => card.id !== cardId),
        }));
      });

      try {
        await updateCard({ id: cardId, data: { isArchived: true } });
        if (pendingCard) {
          pushArchivedCard(pendingCard);
        }
      } catch (error) {
        if (previousColumns) setLocalColumns(previousColumns);
        setPendingArchivedCards((prev) =>
          prev.filter((c) => c.id !== cardId)
        );
        throw error;
      }
    },
    [archivedColumns, localColumns, pushArchivedCard, setLocalColumns, updateCard]
  );

  const archiveColumnById = useCallback(
    async (columnId: string) => {
      let previousColumns: TColumn[] | null = null;
      let pendingColumn: ApiColumn | null = null;
      const snapshot = localColumns.find((col) => col.id === columnId);

      if (snapshot) {
        const nextPendingColumn: ApiColumn = {
          id: columnId,
          title: snapshot.title,
          order: snapshot.order ?? 0,
          archivedAt: null,
          cards: snapshot.cards.map((card) => ({ ...card })),
        };

        pendingColumn = nextPendingColumn;

        setPendingArchivedColumns((prev) => {
          if (prev.some((c) => c.id === nextPendingColumn.id)) return prev;
          return [nextPendingColumn, ...prev];
        });
      }

      setLocalColumns((prev) => {
        previousColumns = prev;
        return prev.filter((col) => col.id !== columnId);
      });

      try {
        await editColumn(columnId, { isArchived: true });
        if (pendingColumn) {
          pushArchivedColumn(pendingColumn);
        }
      } catch (error) {
        if (previousColumns) setLocalColumns(previousColumns);
        setPendingArchivedColumns((prev) =>
          prev.filter((col) => col.id !== columnId)
        );
        throw error;
      }
    },
    [editColumn, localColumns, pushArchivedColumn, setLocalColumns]
  );

  return {
    pendingArchivedCards,
    pendingArchivedColumns,
    archiveCardById,
    archiveColumnById,
  };
}
