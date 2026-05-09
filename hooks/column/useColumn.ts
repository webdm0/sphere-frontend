import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCard, updateCard } from "@/services/api";
import { ApiColumn, type EntityId } from "@/types";
import { createTempId } from "@/utils/entityId";

type UseColumnParams = {
  columnId: string;
  boardId: string;
  isReadOnly?: boolean;
  assignToCurrentUserOnCreate?: boolean;
  defaultAssigneeId?: EntityId | null;
  onErrorToast?: (message: string, note?: string) => void;
};

export function useColumn({
  columnId,
  boardId,
  isReadOnly = false,
  assignToCurrentUserOnCreate = false,
  defaultAssigneeId = null,
  onErrorToast,
}: UseColumnParams) {
  const [newCardTitle, setNewCardTitleState] = useState("");
  const queryClient = useQueryClient();
  const tempCardOrderRef = useRef<number>(-1);
  const pendingCreateCardTitlesRef = useRef<Set<string>>(new Set());

  const columnsQueryKey = ["board", String(boardId), "columns"] as const;

  const createCardMut = useMutation({
    mutationFn: (title: string) =>
      createCard(columnId, title, "", assignToCurrentUserOnCreate),
    onMutate: async (title) => {
      const trimmed = title.trim();
      const tempId = createTempId("card");
      const current = queryClient.getQueryData<ApiColumn[]>(columnsQueryKey);
      const maxOrder =
        current
          ?.find((col) => col.id === columnId)
          ?.cards.reduce((max, card) => Math.max(max, card.order), -1) ?? -1;
      const tempOrder = Math.max(tempCardOrderRef.current, maxOrder) + 1;
      tempCardOrderRef.current = tempOrder;
      const desiredAssigneeId = assignToCurrentUserOnCreate
        ? defaultAssigneeId ?? null
        : null;

      setNewCardTitleState("");

      await queryClient.cancelQueries({ queryKey: columnsQueryKey });
      queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
        if (!old) return old;

        return old.map((col) => {
          if (col.id !== columnId) return col;

          const optimisticCard = {
            id: tempId,
            title: trimmed,
            order: tempOrder,
            columnId: col.id,
            assigneeId: desiredAssigneeId,
            archivedAt: null,
            isArchived: false,
            archivedManually: false,
          };

          return { ...col, cards: [...col.cards, optimisticCard] };
        });
      });

      return {
        tempId,
        title: trimmed,
        tempOrder,
        desiredAssigneeId,
      };
    },
    onError: (_err, _title, context) => {
      if (context?.tempId != null) {
        queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
          if (!old) return old;

          let touched = false;
          const next = old.map((col) => {
            const nextCards = col.cards.filter((c) => c.id !== context.tempId);
            if (nextCards.length === col.cards.length) return col;
            touched = true;
            return { ...col, cards: nextCards };
          });

          return touched ? next : old;
        });
      }
      if (context?.title) {
        setNewCardTitleState((current) =>
          current.trim() ? current : context.title
        );
      }
    },
    onSuccess: (card, _title, context) => {
      if (!context) return;
      const desiredAssigneeId = context.desiredAssigneeId ?? null;

      queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
        if (!old) return old;

        return old.map((col) => {
          if (col.id !== card.columnId) return col;

          const withoutTemp = context.tempId
            ? col.cards.filter((c) => c.id !== context.tempId)
            : col.cards;
          const resolvedOrder = context.tempOrder ?? card.order;
          const resolvedCard = {
            id: card.id,
            title: card.title,
            order: resolvedOrder,
            columnId: card.columnId,
            assigneeId: card.assigneeId ?? desiredAssigneeId,
            isArchived: card.isArchived ?? false,
            archivedAt: card.archivedAt ?? null,
            archivedManually: card.archivedManually ?? false,
          };

          const existingIndex = withoutTemp.findIndex((c) => c.id === card.id);
          const nextCardsBase =
            existingIndex === -1
              ? [...withoutTemp, resolvedCard]
              : withoutTemp.map((existing, index) =>
                  index === existingIndex ? { ...existing, ...resolvedCard } : existing
                );

          const nextCards = nextCardsBase.sort((a, b) => a.order - b.order);

          return { ...col, cards: nextCards };
        });
      });

      if (
        desiredAssigneeId != null &&
        String(card.assigneeId ?? "") !== String(desiredAssigneeId)
      ) {
        void updateCard(card.id, { assigneeId: desiredAssigneeId })
          .then((updatedCard) => {
            queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
              if (!old) return old;

              let touched = false;
              const next = old.map((col) => {
                const cardIndex = col.cards.findIndex((c) => c.id === updatedCard.id);
                if (cardIndex === -1) return col;

                const currentCard = col.cards[cardIndex];
                if (
                  String(currentCard.assigneeId ?? "") ===
                  String(updatedCard.assigneeId ?? "")
                ) {
                  return col;
                }

                touched = true;
                const nextCards = [...col.cards];
                nextCards[cardIndex] = {
                  ...currentCard,
                  assigneeId: updatedCard.assigneeId ?? null,
                };
                return { ...col, cards: nextCards };
              });

              return touched ? next : old;
            });
          })
          .catch(() => {
            onErrorToast?.("Card created, but assignee was not applied.");
          });

        return;
      }
    },
  });

  const handleCreateCard = useCallback(async () => {
    if (isReadOnly) return;
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;
    const pendingKey = trimmed.toLocaleLowerCase();
    if (pendingCreateCardTitlesRef.current.has(pendingKey)) return;
    pendingCreateCardTitlesRef.current.add(pendingKey);

    try {
      await createCardMut.mutateAsync(trimmed);
    } catch {
      onErrorToast?.("Failed to create card.");
    } finally {
      pendingCreateCardTitlesRef.current.delete(pendingKey);
    }
  }, [createCardMut, isReadOnly, newCardTitle, onErrorToast]);

  const setNewCardTitle = (value: string) => {
    setNewCardTitleState(value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    if (e.key === "Enter") {
      if (!newCardTitle.trim()) return;
      e.preventDefault();
      void handleCreateCard();
    }
  };

  return {
    newCardTitle,
    setNewCardTitle,
    handleKeyDown,
    handleCreateCard,
  };
}
