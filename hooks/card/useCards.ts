import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import {
  updateCard,
  getCard,
  restoreCard,
  deleteCardForever,
} from "@/services/api";
import type {
  ApiArchivedCard,
  ApiCard,
  ApiColumn,
  EntityId,
  UpdateCardRequestDto,
} from "@/types";
import { useAccessToken } from "@/hooks/auth/useAccessToken";

type CardCachePatch = Partial<
  Pick<
    ApiCard,
    "title" | "assigneeId" | "order" | "columnId" | "isArchived" | "archivedAt" | "archivedManually"
  >
>;

export function useCards(columnId?: EntityId | null, boardId?: EntityId) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  const latestUpdateRef = useRef(new Map<EntityId, number>());

  const boardKey = boardId ? String(boardId) : undefined;
  const columnsQueryKey = boardKey ? (["board", boardKey, "columns"] as const) : null;

  const patchColumnCard = (id: EntityId, changes: CardCachePatch) => {
    if (!columnsQueryKey) return;

    queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
      if (!old) return old;

      let touched = false;

      const next = old.map((col) => {
        const cardIndex = col.cards.findIndex((c) => c.id === id);
        if (cardIndex === -1) return col;

        const card = col.cards[cardIndex];
        const updatedCard = { ...card };

        if (
          Object.prototype.hasOwnProperty.call(changes, "title") &&
          changes.title !== undefined
        ) {
          updatedCard.title = changes.title;
        }

        if (Object.prototype.hasOwnProperty.call(changes, "assigneeId")) {
          updatedCard.assigneeId = changes.assigneeId ?? null;
        }

        if (
          Object.prototype.hasOwnProperty.call(changes, "order") &&
          changes.order !== undefined
        ) {
          updatedCard.order = changes.order;
        }

        if (
          Object.prototype.hasOwnProperty.call(changes, "columnId") &&
          changes.columnId !== undefined
        ) {
          updatedCard.columnId = changes.columnId;
        }

        if (
          Object.prototype.hasOwnProperty.call(changes, "isArchived") &&
          changes.isArchived !== undefined
        ) {
          updatedCard.isArchived = changes.isArchived;
        }

        if (
          Object.prototype.hasOwnProperty.call(changes, "archivedAt") &&
          changes.archivedAt !== undefined
        ) {
          updatedCard.archivedAt = changes.archivedAt;
        }

        if (
          Object.prototype.hasOwnProperty.call(changes, "archivedManually") &&
          changes.archivedManually !== undefined
        ) {
          updatedCard.archivedManually = changes.archivedManually;
        }

        const cardChanged =
          updatedCard.title !== card.title ||
          updatedCard.assigneeId !== card.assigneeId ||
          updatedCard.order !== card.order ||
          updatedCard.columnId !== card.columnId ||
          updatedCard.isArchived !== card.isArchived ||
          updatedCard.archivedAt !== card.archivedAt ||
          updatedCard.archivedManually !== card.archivedManually;

        if (!cardChanged) return col;

        touched = true;
        const nextCards = [...col.cards];
        nextCards[cardIndex] = updatedCard;
        return { ...col, cards: nextCards };
      });

      return touched ? next : old;
    });
  };

  const useCard = (id?: EntityId) =>
    useQuery({
      queryKey: ["card", id],
      queryFn: () => (id ? getCard(id) : Promise.resolve(null)),
      enabled: Boolean(id) && Boolean(accessToken),
    });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: EntityId; data: UpdateCardRequestDto }) =>
      updateCard(id, data),
    onMutate: async ({ id, data }) => {
      const requestId = Date.now();
      latestUpdateRef.current.set(id, requestId);

      const cancels = [queryClient.cancelQueries({ queryKey: ["card", id] })];

      if (columnsQueryKey) {
        cancels.push(queryClient.cancelQueries({ queryKey: columnsQueryKey }));
      }

      await Promise.all(cancels);

      const prevCard = queryClient.getQueryData<ApiCard>(["card", id]);
      const prevColumns = columnsQueryKey
        ? queryClient.getQueryData<ApiColumn[]>(columnsQueryKey)
        : undefined;

      queryClient.setQueryData<ApiCard>(["card", id], (old) =>
        old ? { ...old, ...data } : old
      );

      patchColumnCard(id, data);

      return {
        prevCard,
        prevColumns,
        cardId: id,
        requestId,
        optimisticChanges: data,
      };
    },
    onSuccess: (updated, _vars, context) => {
      if (!context) return;
      const latest = latestUpdateRef.current.get(context.cardId);
      if (latest !== undefined && context.requestId !== latest) return;

      queryClient.setQueryData<ApiCard>(["card", updated.id], (old) =>
        old ? { ...old, ...updated } : updated
      );

      patchColumnCard(updated.id, updated);
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      const latest = latestUpdateRef.current.get(context.cardId);
      if (latest !== undefined && context.requestId !== latest) return;

      if (context.prevCard) {
        queryClient.setQueryData(["card", context.cardId], context.prevCard);
      }
      if (columnsQueryKey && context.prevColumns) {
        queryClient.setQueryData(columnsQueryKey, context.prevColumns);
      }
    },
    onSettled: async (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: ["card", vars.id] });
      if (columnsQueryKey) {
        queryClient.invalidateQueries({ queryKey: columnsQueryKey });
      }

      const touchesArchive = vars.data && "isArchived" in vars.data;

      if (boardKey && touchesArchive) {
        queryClient.invalidateQueries({
          queryKey: ["board", boardKey, "cards", "archived"],
        });
      }
    },
  });

  const updateOptimistic = (id: EntityId, changes: CardCachePatch) => {
    queryClient.setQueryData<ApiCard>(["card", id], (prev) =>
      prev ? { ...prev, ...changes } : prev
    );
    patchColumnCard(id, changes);
  };

  const removeFromArchivedCache = (id: EntityId) => {
    if (!boardKey) return;

    queryClient.setQueryData<ApiArchivedCard[]>(
      ["board", boardKey, "cards", "archived"],
      (old) => {
        if (!old) return old;
        const next = old.filter((card) => card.id !== id);
        return next.length === old.length ? old : next;
      }
    );

    queryClient.setQueryData<ApiColumn[]>(
      ["board", boardKey, "columns", "archived"],
      (old) => {
        if (!old) return old;
        let touched = false;
        const next = old.map((col) => {
          const nextCards = col.cards.filter((card) => card.id !== id);
          if (nextCards.length === col.cards.length) return col;
          touched = true;
          return { ...col, cards: nextCards };
        });
        return touched ? next : old;
      }
    );
  };

  const addRestoredCardToColumns = (card: ApiCard) => {
    if (!columnsQueryKey) return;
    if (card.columnId == null) return;

    queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
      if (!old) return old;
      let touched = false;
      const next = old.map((col) => {
        if (col.id !== card.columnId) return col;
        if (col.cards.some((existing) => existing.id === card.id)) return col;
        touched = true;
        return {
          ...col,
          cards: [
            ...col.cards,
            {
              id: card.id,
              title: card.title,
              order: card.order,
              columnId: card.columnId,
              assigneeId: card.assigneeId ?? null,
              isArchived: card.isArchived,
              archivedAt: card.archivedAt ?? null,
              archivedManually: card.archivedManually,
            },
          ],
        };
      });
      return touched ? next : old;
    });
  };

  const replaceTargetColumnInColumns = (targetColumn: ApiColumn) => {
    if (!columnsQueryKey) return;

    queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
      if (!old) return old;

      let touched = false;
      const next = old.map((col) => {
        if (col.id !== targetColumn.id) return col;
        touched = true;
        return {
          ...targetColumn,
          archivedAt: null,
          cards: [...targetColumn.cards].sort((a, b) => a.order - b.order),
        };
      });

      return touched ? next : old;
    });
  };

  const invalidateAfterRestore = async (id: EntityId) => {
    const refreshes = [queryClient.invalidateQueries({ queryKey: ["card", id] })];

    if (boardKey) {
      refreshes.push(
        queryClient.invalidateQueries({
          queryKey: ["board", boardKey, "columns"],
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: ["board", boardKey, "columns", "archived"],
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: ["board", boardKey, "cards", "archived"],
          refetchType: "none",
        }),
      );
    }

    await Promise.all(refreshes);
  };

  const restoreMutation = useMutation({
    mutationKey: ["restore", "card"],
    mutationFn: (id: EntityId) => restoreCard(id),
    onMutate: async (id) => {
      const cancels = [queryClient.cancelQueries({ queryKey: ["card", id] })];

      if (columnsQueryKey) {
        cancels.push(queryClient.cancelQueries({ queryKey: columnsQueryKey }));
      }

      if (boardKey) {
        cancels.push(
          queryClient.cancelQueries({
            queryKey: ["board", boardKey, "cards", "archived"],
          }),
          queryClient.cancelQueries({
            queryKey: ["board", boardKey, "columns", "archived"],
          })
        );
      }

      await Promise.all(cancels);

      const prevCard = queryClient.getQueryData<ApiCard>(["card", id]);
      queryClient.setQueryData<ApiCard>(["card", id], (old) =>
        old ? { ...old, isArchived: false, archivedAt: null } : old
      );

      return { prevCard };
    },
    onError: (_err, id, context) => {
      if (context?.prevCard) queryClient.setQueryData(["card", id], context.prevCard);
    },
  });

  const restore = async (id: EntityId) => {
    try {
      const response = await restoreMutation.mutateAsync(id);
      const restored = response?.restoreContext !== "no_columns" && !!response?.card;
      if (restored) {
        if (response?.card) {
          queryClient.setQueryData<ApiCard>(["card", id], response.card);
        }
        if (response?.targetColumn) {
          replaceTargetColumnInColumns(response.targetColumn);
        } else if (response?.card) {
          addRestoredCardToColumns(response.card);
        }
        removeFromArchivedCache(id);
      }
      return response;
    } finally {
      void invalidateAfterRestore(id).catch(() => {});
    }
  };

  const removeForever = useMutation({
    mutationFn: (id: EntityId) => deleteCardForever(id),
    onMutate: async () => {
      const cancels = [
        queryClient.cancelQueries({ queryKey: ["board", boardKey, "cards", "archived"] }),
      ];
      if (boardKey) {
        cancels.push(
          queryClient.cancelQueries({
            queryKey: ["board", boardKey, "columns", "archived"],
          })
        );
      }
      await Promise.all(cancels);
    },
    onSuccess: (_data, id) => {
      removeFromArchivedCache(id);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardKey, "cards", "archived"] });
      if (boardKey) {
        queryClient.invalidateQueries({
          queryKey: ["board", boardKey, "columns", "archived"],
        });
      }
    },
  });

  return {
    useCard,
    update: update.mutateAsync,
    restore,
    removeForever: removeForever.mutateAsync,
    updateOptimistic,
  };
}
