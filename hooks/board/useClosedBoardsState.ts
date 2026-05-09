import { useEffect, useMemo, useState } from "react";
import type { ApiBoardListItem } from "@/types";
import { useConfirmPopover } from "@/hooks/ui/useConfirmPopover";
import type { EntityId } from "@/types";

interface UseClosedBoardsStateArgs {
  isOpen: boolean;
  boards: ApiBoardListItem[];
}

export function useClosedBoardsState({
  isOpen,
  boards,
}: UseClosedBoardsStateArgs) {
  const [restoringIds, setRestoringIds] = useState<Set<EntityId>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<EntityId>>(new Set());
  const [archivedBoardIds, archivedBoardKey] = useMemo(() => {
    const ids = new Set(boards.map((board) => board.id));
    const key = Array.from(ids).sort().join("|");
    return [ids, key] as const;
  }, [boards]);

  const {
    popover: confirmPopover,
    isVisible: confirmVisible,
    popoverRef: confirmPopoverRef,
    openPopover: openConfirmPopover,
    closePopover: closeConfirmPopover,
  } = useConfirmPopover<{ id: EntityId }>();

  useEffect(() => {
    if (!isOpen) {
      setRestoringIds(new Set());
      setDeletingIds(new Set());
      closeConfirmPopover();
    }
  }, [closeConfirmPopover, isOpen]);

  useEffect(() => {
    if (!restoringIds.size) return;
    const currentIds = new Set(boards.map((board) => board.id));
    setRestoringIds((prev) => {
      if (!prev.size) return prev;
      const next = new Set<EntityId>();
      prev.forEach((id) => {
        if (currentIds.has(id)) next.add(id);
      });
      if (next.size !== prev.size) return next;
      let identical = true;
      next.forEach((id) => {
        if (!prev.has(id)) identical = false;
      });
      return identical ? prev : next;
    });
  }, [boards, restoringIds]);

  useEffect(() => {
    if (!deletingIds.size) return;
    const currentIds = new Set(boards.map((board) => board.id));
    setDeletingIds((prev) => {
      if (!prev.size) return prev;
      const next = new Set<EntityId>();
      prev.forEach((id) => {
        if (currentIds.has(id)) next.add(id);
      });
      if (next.size !== prev.size) return next;
      let identical = true;
      next.forEach((id) => {
        if (!prev.has(id)) identical = false;
      });
      return identical ? prev : next;
    });
  }, [boards, deletingIds]);

  return {
    restoringIds,
    setRestoringIds,
    deletingIds,
    setDeletingIds,
    archivedBoardIds,
    archivedBoardKey,
    confirmPopover,
    confirmVisible,
    confirmPopoverRef,
    openConfirmPopover,
    closeConfirmPopover,
  };
}
