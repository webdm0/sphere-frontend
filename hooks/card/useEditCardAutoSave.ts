import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type {
  ApiCard,
  EntityId,
  RestoreCardResponseDto,
  UpdateCardInput,
  UpdateCardRequestDto,
} from "@/types";

interface UseEditCardAutoSaveArgs {
  card?: ApiCard | null;
  cardId: EntityId;
  isBoardReadOnly: boolean;
  isReadOnly: boolean;
  update: (params: { id: EntityId; data: UpdateCardRequestDto }) => Promise<ApiCard>;
  updateOptimistic: (id: EntityId, changes: Partial<ApiCard>) => void;
  restore: (id: EntityId) => Promise<RestoreCardResponseDto | undefined>;
  onRestore?: (response: RestoreCardResponseDto | undefined) => void;
  onCardUpdated?: (updated: Partial<ApiCard>) => void;
  onToggleArchive?: (cardId: EntityId, nextArchived: boolean) => Promise<void> | void;
  onClose: () => void;
  previousTitleRef: MutableRefObject<string>;
  setTitleDraft: (value: string) => void;
}

export function useEditCardAutoSave({
  card,
  cardId,
  isBoardReadOnly,
  isReadOnly,
  update,
  updateOptimistic,
  restore,
  onRestore,
  onCardUpdated,
  onToggleArchive,
  onClose,
  previousTitleRef,
  setTitleDraft,
}: UseEditCardAutoSaveArgs) {
  const notifyUpdated = useCallback(
    (updated: Partial<ApiCard>) => {
      if (onCardUpdated) onCardUpdated(updated);
    },
    [onCardUpdated]
  );

  const handleAutoSave = useCallback(
    async (changes?: UpdateCardInput) => {
      if (!card) return;
      if (isBoardReadOnly) return;

      const nextTitle = changes?.title ?? card.title ?? "";
      const isTitleInvalid = nextTitle.length < 1 || nextTitle.length > 80;
      if (isTitleInvalid) {
        const fallbackTitle = previousTitleRef.current || card.title || "";
        setTitleDraft(fallbackTitle);
        return;
      }

      const isArchivingChange =
        changes && Object.prototype.hasOwnProperty.call(changes, "isArchived");
      const wantsRestore =
        isArchivingChange && changes?.isArchived === false && card.isArchived;

      if (wantsRestore) {
        updateOptimistic(cardId, { isArchived: false });
        const response = await restore(cardId);
        onRestore?.(response);
        notifyUpdated({ ...card, isArchived: false });
        return;
      }

      if (isReadOnly && !isArchivingChange) return;
      if (!changes || Object.keys(changes).length === 0) return;

      const { isArchived, ...rest } = changes;
      const updatePayload: UpdateCardRequestDto =
        isArchived === true ? { ...rest, isArchived: true } : rest;

      const updated = await update({
        id: cardId,
        data: updatePayload,
      });

      previousTitleRef.current = updated.title ?? previousTitleRef.current;
      notifyUpdated(updated);
    },
    [
      card,
      cardId,
      isBoardReadOnly,
      isReadOnly,
      notifyUpdated,
      onRestore,
      previousTitleRef,
      restore,
      setTitleDraft,
      update,
      updateOptimistic,
    ]
  );

  const handleArchiveToggle = useCallback(
    (nextArchived: boolean) => {
      if (isBoardReadOnly) return;
      if (card && onToggleArchive) {
        void onToggleArchive(card.id, nextArchived);
      } else {
        void handleAutoSave({ isArchived: nextArchived });
      }
      onClose();
    },
    [card, handleAutoSave, isBoardReadOnly, onClose, onToggleArchive]
  );

  return { handleAutoSave, handleArchiveToggle };
}
