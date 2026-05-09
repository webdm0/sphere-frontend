import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ApiArchivedCard,
  ApiCard,
  ApiColumn,
  ApiColumnCard,
  EntityId,
  RestoreCardResponseDto,
} from "@/types";
import { buildRestoreToast } from "@/components/modals/ModalsArchive/restoreToast";
import { useConfirmPopover } from "@/hooks/ui/useConfirmPopover";

interface UseArchiveModalStateArgs {
  isOpen: boolean;
  archivedColumns: ApiColumn[];
  archivedCards: ApiArchivedCard[];
  pendingArchivedColumns: ApiColumn[];
  pendingArchivedCards: ApiArchivedCard[];
  isBoardReadOnly: boolean;
  restoreCard: (id: EntityId) => Promise<RestoreCardResponseDto | undefined>;
  removeCardForever: (id: EntityId) => Promise<null>;
  restoreColumn: (id: string) => Promise<unknown>;
  deleteColumnForever: (id: string) => Promise<unknown>;
  openEdit: (byKeyboard?: boolean) => void;
  closeEdit: () => void;
}

export function useArchiveModalState({
  isOpen,
  archivedColumns,
  archivedCards,
  pendingArchivedColumns,
  pendingArchivedCards,
  isBoardReadOnly,
  restoreCard,
  removeCardForever,
  restoreColumn,
  deleteColumnForever,
  openEdit,
  closeEdit,
}: UseArchiveModalStateArgs) {
  const [toasts, setToasts] = useState<
    { id: string; message: string; note?: string }[]
  >([]);
  const toastTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [selectedCardId, setSelectedCardId] = useState<EntityId | null>(null);
  const {
    popover: confirmPopover,
    isVisible: confirmVisible,
    popoverRef: confirmPopoverRef,
    openPopover: openConfirmPopover,
    closePopover: closeConfirmPopover,
  } = useConfirmPopover<{ type: "card" | "column"; id: EntityId }>();
  const [expandedColumns, setExpandedColumns] = useState<Set<EntityId>>(new Set());
  const [restoringCardIds, setRestoringCardIds] = useState<Set<EntityId>>(new Set());
  const [cardOpenedByKeyboard, setCardOpenedByKeyboard] = useState(false);
  const [restoringColumnIds, setRestoringColumnIds] = useState<Set<EntityId>>(new Set());
  const [deletingCardIds, setDeletingCardIds] = useState<Set<EntityId>>(new Set());
  const [deletingColumnIds, setDeletingColumnIds] = useState<Set<EntityId>>(new Set());

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

  const pendingCardPlaceholders = useMemo(
    () => pendingArchivedCards.filter((card) => !archivedCardIds.has(card.id)),
    [pendingArchivedCards, archivedCardIds]
  );

  const pendingColumnPlaceholders = useMemo(
    () => pendingArchivedColumns.filter((col) => !archivedColumnIds.has(col.id)),
    [pendingArchivedColumns, archivedColumnIds]
  );

  const hasColumnItems =
    archivedColumns.length > 0 || pendingColumnPlaceholders.length > 0;
  const hasCardItems =
    archivedCards.length > 0 || pendingCardPlaceholders.length > 0;

  useEffect(() => {
    const timeouts = toastTimeouts.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    setRestoringCardIds((prev) => {
      const next = new Set<EntityId>();
      prev.forEach((id) => {
        if (archivedCardIds.has(id)) next.add(id);
      });
      if (next.size === prev.size) {
        let identical = true;
        next.forEach((id) => {
          if (!prev.has(id)) identical = false;
        });
        if (identical) return prev;
      }
      return next;
    });
  }, [archivedCardKey, archivedCardIds]);

  useEffect(() => {
    setRestoringColumnIds((prev) => {
      const next = new Set<EntityId>();
      prev.forEach((id) => {
        if (archivedColumnIds.has(id)) next.add(id);
      });
      if (next.size === prev.size) {
        let identical = true;
        next.forEach((id) => {
          if (!prev.has(id)) identical = false;
        });
        if (identical) return prev;
      }
      return next;
    });
  }, [archivedColumnKey, archivedColumnIds]);

  useEffect(() => {
    setDeletingCardIds((prev) => {
      const next = new Set<EntityId>();
      prev.forEach((id) => {
        if (archivedCardIds.has(id)) next.add(id);
      });
      if (next.size === prev.size) {
        let identical = true;
        next.forEach((id) => {
          if (!prev.has(id)) identical = false;
        });
        if (identical) return prev;
      }
      return next;
    });
  }, [archivedCardKey, archivedCardIds]);

  useEffect(() => {
    setDeletingColumnIds((prev) => {
      const next = new Set<EntityId>();
      prev.forEach((id) => {
        if (archivedColumnIds.has(id)) next.add(id);
      });
      if (next.size === prev.size) {
        let identical = true;
        next.forEach((id) => {
          if (!prev.has(id)) identical = false;
        });
        if (identical) return prev;
      }
      return next;
    });
  }, [archivedColumnKey, archivedColumnIds]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCardId(null);
      closeEdit();
      closeConfirmPopover();
      setExpandedColumns(new Set());
      setDeletingCardIds(new Set());
      setDeletingColumnIds(new Set());
    }
  }, [closeConfirmPopover, closeEdit, isOpen]);

  const pushToast = (message: string, note?: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, note }]);

    toastTimeouts.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      delete toastTimeouts.current[id];
    }, 2500);
  };

  const handleRestoreToast = (response: RestoreCardResponseDto | undefined) => {
    const toast = buildRestoreToast(response);
    if (toast) pushToast(toast.message, toast.note);
  };

  const handleDeleteForever = async (type: "card" | "column", id: EntityId) => {
    if (isBoardReadOnly) return;
    if (type === "card") {
      if (deletingCardIds.has(id) || restoringCardIds.has(id)) return;

      setDeletingCardIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      const cardTitle =
        archivedCards.find((c) => c.id === id)?.title ??
        archivedColumns.flatMap((col) => col.cards).find((c) => c.id === id)
          ?.title;

      try {
        await removeCardForever(id);
      } catch {
        setDeletingCardIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (cardTitle) pushToast(`Couldn't delete "${cardTitle}"`);
      }
    } else {
      if (deletingColumnIds.has(id) || restoringColumnIds.has(id)) return;

      setDeletingColumnIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      const columnTitle = archivedColumns.find((c) => c.id === id)?.title;

      try {
        await deleteColumnForever(id);
      } catch {
        setDeletingColumnIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (columnTitle) pushToast(`Couldn't delete "${columnTitle}"`);
      }
    }
  };

  const handleRestoreCard = async (card: ApiArchivedCard | ApiColumnCard) => {
    if (isBoardReadOnly) return;
    if (restoringCardIds.has(card.id) || deletingCardIds.has(card.id)) return;

    setRestoringCardIds((prev) => {
      if (prev.has(card.id)) return prev;
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });

    let succeeded = false;
    try {
      const response = await restoreCard(card.id);
      handleRestoreToast(response);
      const restored =
        response?.restoreContext !== "no_columns" && !!response?.card;
      succeeded = restored;
      setRestoringCardIds((prev) => {
        if (!prev.has(card.id)) return prev;
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    } catch {
      pushToast(`Couldn't restore "${card.title}"`);
    } finally {
      if (!succeeded) {
        setRestoringCardIds((prev) => {
          if (!prev.has(card.id)) return prev;
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        });
      }
    }
  };

  const handleRestoreColumn = async (column: ApiColumn) => {
    if (isBoardReadOnly) return;
    if (restoringColumnIds.has(column.id) || deletingColumnIds.has(column.id))
      return;

    setRestoringColumnIds((prev) => {
      if (prev.has(column.id)) return prev;
      const next = new Set(prev);
      next.add(column.id);
      return next;
    });

    let succeeded = false;
    try {
      await restoreColumn(column.id);
      succeeded = true;
      setRestoringColumnIds((prev) => {
        if (!prev.has(column.id)) return prev;
        const next = new Set(prev);
        next.delete(column.id);
        return next;
      });
    } catch {
      pushToast(`Couldn't restore "${column.title}"`);
    } finally {
      if (!succeeded) {
        setRestoringColumnIds((prev) => {
          if (!prev.has(column.id)) return prev;
          const next = new Set(prev);
          next.delete(column.id);
          return next;
        });
      }
    }
  };

  const handleArchiveToggleFromModal = async (
    cardId: EntityId,
    nextArchived: boolean
  ) => {
    if (isBoardReadOnly) return;
    if (nextArchived) return;

    const cardFromList =
      archivedCards.find((c) => c.id === cardId) ??
      archivedColumns.flatMap((col) => col.cards).find((c) => c.id === cardId);

    if (cardFromList) {
      await handleRestoreCard(cardFromList);
    }
  };

  const handleCardUpdated = (updated: Partial<ApiCard>) => {
    if (updated.isArchived === false) {
      setSelectedCardId(null);
      closeEdit();
    }
  };

  const handleOpenCardModal = (cardId: EntityId, byKeyboard = false) => {
    setSelectedCardId(cardId);
    setCardOpenedByKeyboard(byKeyboard);
    openEdit(byKeyboard);
  };

  const handleCloseCardModal = () => {
    closeEdit();
    setSelectedCardId(null);
  };

  const handleOpenPopover = (
    type: "card" | "column",
    id: EntityId,
    target: HTMLElement
  ) => {
    if (isBoardReadOnly) return;
    openConfirmPopover({ type, id }, target, `${type}-${id}`);
  };

  const toggleExpandedColumn = (id: EntityId, enabled?: boolean) => {
    setExpandedColumns((prev) => {
      const next = new Set(prev);
      const has = next.has(id);
      if (enabled === undefined) {
        if (has) next.delete(id);
        else next.add(id);
      } else if (enabled) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  return {
    cardOpenedByKeyboard,
    toasts,
    pushToast,
    handleRestoreToast,
    confirmPopover,
    confirmVisible,
    confirmPopoverRef,
    handleOpenPopover,
    closeConfirmPopover,
    expandedColumns,
    toggleExpandedColumn,
    restoringCardIds,
    restoringColumnIds,
    deletingCardIds,
    deletingColumnIds,
    pendingCardPlaceholders,
    pendingColumnPlaceholders,
    hasColumnItems,
    hasCardItems,
    selectedCardId,
    handleOpenCardModal,
    handleCloseCardModal,
    handleCardUpdated,
    handleRestoreCard,
    handleRestoreColumn,
    handleDeleteForever,
    handleArchiveToggleFromModal,
  };
}
