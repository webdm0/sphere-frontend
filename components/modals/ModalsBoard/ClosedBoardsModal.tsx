"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ApiBoardListItem } from "@/types";
import ArchiveModalSkeleton from "@/components/skeletons/ArchiveModalSkeleton";
import styles from "./ClosedBoardsModal.module.css";
import form from "@/components/common/form.module.css";
import FolderIcon from "@/components/icons/FolderIcon";
import { useBodyScrollLock } from "@/hooks/ui/useBodyScrollLock";
import { useModalDismiss } from "@/hooks/ui/useModalDismiss";
import { useEscapeClose } from "@/hooks/ui/useEscapeClose";
import { useFocusTrap } from "@/hooks/ui/useFocusTrap";
import ConfirmPopover from "@/components/modals/common/ConfirmPopover";
import ModalCloseButton from "@/components/modals/common/ModalCloseButton";
import {
  emptyStateMotion,
  listItemMotion,
} from "@/components/modals/common/modalMotions";
import { useClosedBoardsState } from "@/hooks/board/useClosedBoardsState";
import ClosedBoardRow from "@/components/modals/ModalsBoard/ClosedBoardRow";
import { ScopedTooltipProvider } from "@/components/ui/ScopedTooltipProvider";
import type { EntityId } from "@/types";
import { useIncrementalArchiveRender } from "@/hooks/archive/useIncrementalArchiveRender";

const getBoardMeta = (board: ApiBoardListItem) => {
  if (board.isMine) return "Mine";
  if (board.ownerName) return `Shared by ${board.ownerName}`;
  if (board.isShared) return "Shared board";
  return "Board";
};

interface ClosedBoardsListProps {
  boards: ApiBoardListItem[];
  pendingBoardPlaceholders: ApiBoardListItem[];
  hasBoardItems: boolean;
  restoringIds: Set<EntityId>;
  deletingIds: Set<EntityId>;
  onRestore: (board: ApiBoardListItem) => Promise<void>;
  onOpenDelete: (board: ApiBoardListItem, target: HTMLElement) => void;
  onClose: () => void;
}

function ClosedBoardsList({
  boards,
  pendingBoardPlaceholders,
  hasBoardItems,
  restoringIds,
  deletingIds,
  onRestore,
  onOpenDelete,
  onClose,
}: ClosedBoardsListProps) {
  const {
    hasMore,
    listRef,
    visibleItems: visibleBoards,
  } = useIncrementalArchiveRender(boards);

  return (
    <div className={styles.list} ref={listRef}>
      <AnimatePresence initial={false} mode="popLayout">
        {pendingBoardPlaceholders.map((board) => (
          <motion.div
            key={`pending-board-${board.id}`}
            layout="position"
            {...listItemMotion}
            className={`${styles.row} ${styles.pending}`}
            style={{ cursor: "progress" }}
          >
            <div className={styles.card}>
              <p className={styles.title}>
                {board.title || "Closing board..."}
              </p>
              <p className={styles.sub}>{getBoardMeta(board)}</p>
            </div>
          </motion.div>
        ))}

        {visibleBoards.map((board) => {
          const isPending = restoringIds.has(board.id) || deletingIds.has(board.id);
          return (
            <ClosedBoardRow
              key={board.id}
              board={board}
              isPending={isPending}
              canManage={board.isMine}
              onRestore={onRestore}
              onDelete={(target) => onOpenDelete(board, target)}
              onClose={onClose}
            />
          );
        })}
      </AnimatePresence>

      {hasMore && <div className={styles.loadMoreSentinel} aria-hidden="true" />}

      <AnimatePresence initial={false}>
        {!hasBoardItems && (
          <motion.div
            key="boards-empty"
            {...emptyStateMotion}
            className={styles.emptySpacer}
          >
            <FolderIcon size={64} color="var(--text-secondary)" />
            <h3 className="mb-2">No closed boards</h3>
            <p className="text-sm leading-relaxed">Closed boards will appear here.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ClosedBoardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnFocusOnClose?: boolean;
  boards: ApiBoardListItem[];
  pendingBoards: ApiBoardListItem[];
  isLoading: boolean;
  onRestore: (board: ApiBoardListItem) => Promise<void>;
  onDelete: (id: EntityId) => Promise<void>;
}

export default function ClosedBoardsModal({
  isOpen,
  onClose,
  boards,
  pendingBoards,
  isLoading,
  onRestore,
  onDelete,
  returnFocusOnClose = true,
}: ClosedBoardsModalProps) {
  const [actionError, setActionError] = useState("");
  const {
    restoringIds,
    setRestoringIds,
    deletingIds,
    setDeletingIds,
    archivedBoardIds,
    confirmPopover,
    confirmVisible,
    confirmPopoverRef,
    openConfirmPopover,
    closeConfirmPopover,
  } = useClosedBoardsState({ isOpen, boards });
  useBodyScrollLock(isOpen);
  const pendingBoardPlaceholders = useMemo(
    () => pendingBoards.filter((board) => !archivedBoardIds.has(board.id)),
    [pendingBoards, archivedBoardIds]
  );
  const hasBoardItems = boards.length > 0 || pendingBoardPlaceholders.length > 0;

  const handleRestore = async (board: ApiBoardListItem) => {
    if (restoringIds.has(board.id) || deletingIds.has(board.id)) return;
    setActionError("");
    setRestoringIds((prev) => new Set(prev).add(board.id));

    try {
      await onRestore(board);
    } catch {
      setActionError("Failed to restore board.");
      setRestoringIds((prev) => {
        if (!prev.has(board.id)) return prev;
        const next = new Set(prev);
        next.delete(board.id);
        return next;
      });
    }
  };

  const handleDelete = async (id: EntityId) => {
    if (deletingIds.has(id) || restoringIds.has(id)) return;
    setActionError("");
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await onDelete(id);
    } catch {
      setActionError("Failed to delete board.");
      setDeletingIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const showSkeleton = isLoading && boards.length === 0;

  const handleBackdropClose = () => {
    closeConfirmPopover();
    onClose();
  };

  const { modalRef, handleMouseDown, handleMouseUp } =
    useModalDismiss(handleBackdropClose);
  useEscapeClose(isOpen, handleBackdropClose);
  useFocusTrap(modalRef, isOpen, { initialFocus: "none", shouldReturnFocus: returnFocusOnClose });
  useEffect(() => {
    if (!isOpen) return;
    if (returnFocusOnClose) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== modalRef.current) {
      active.blur();
    }
  }, [isOpen, returnFocusOnClose, modalRef]);

  useEffect(() => {
    if (isOpen) return;
    setActionError("");
  }, [isOpen]);
  const focusableSelector = useMemo(
    () =>
      [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        "input:not([disabled]):not([type=\"hidden\"])",
        "select:not([disabled])",
        "[tabindex]:not([tabindex=\"-1\"])",
        "[contenteditable=\"true\"]",
      ].join(","),
    []
  );

  useEffect(() => {
    if (!confirmVisible) return;
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const popoverEl = confirmPopoverRef.current;
      if (!popoverEl || !popoverEl.contains(event.target as Node)) return;

      const modalEl = modalRef.current;
      if (!modalEl) return;

      const nodes = Array.from(
        modalEl.querySelectorAll<HTMLElement>(focusableSelector)
      );
      if (!nodes.length) return;

      const trigger = confirmPopover?.trigger ?? null;
      const currentIndex = trigger ? nodes.indexOf(trigger) : -1;
      const startIndex =
        currentIndex === -1 ? (event.shiftKey ? nodes.length - 1 : 0) : currentIndex;

      const nextIndex = event.shiftKey
        ? startIndex <= 0
          ? nodes.length - 1
          : startIndex - 1
        : startIndex >= nodes.length - 1
          ? 0
          : startIndex + 1;

      event.preventDefault();
      const next = nodes[nextIndex];
      closeConfirmPopover({ returnFocus: false });
      next?.focus({ preventScroll: true });
    };

    document.addEventListener("keydown", handleTab, true);
    return () => document.removeEventListener("keydown", handleTab, true);
  }, [
    closeConfirmPopover,
    confirmPopover?.trigger,
    confirmVisible,
    confirmPopoverRef,
    focusableSelector,
    modalRef,
  ]);

  return (
    <ScopedTooltipProvider>
      <>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              <motion.div
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="closed-boards-title"
              >
                <ModalCloseButton onClick={handleBackdropClose} />
                <h2
                  id="closed-boards-title"
                  className={`text-xl sm:text-2xl text-center ${form.glitchText}`}
                >
                  Closed boards
                </h2>

                <div className={styles.content}>
                  {showSkeleton ? (
                    <ArchiveModalSkeleton />
                  ) : (
                    <ClosedBoardsList
                      boards={boards}
                      pendingBoardPlaceholders={pendingBoardPlaceholders}
                      hasBoardItems={hasBoardItems}
                      restoringIds={restoringIds}
                      deletingIds={deletingIds}
                      onRestore={handleRestore}
                      onOpenDelete={(board, target) =>
                        openConfirmPopover({ id: board.id }, target, String(board.id))
                      }
                      onClose={onClose}
                    />
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {actionError ? (
                    <motion.div
                      key="closed-boards-error"
                      className="overflow-hidden"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p
                        className="text-sm text-gray-600 text-center"
                        role="alert"
                        aria-live="polite"
                      >
                        {actionError}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {confirmPopover && (
          <ConfirmPopover
            rect={confirmPopover.rect}
            visible={confirmVisible}
            popoverRef={confirmPopoverRef}
            text="This board will be permanently deleted."
            actionLabel="Confirm delete"
            className={styles.popover}
            openClassName={styles.popoverOpen}
            textClassName={styles.popoverText}
            actionClassName={`${styles.popoverAction} focus-ring`}
            onConfirm={() => handleDelete(confirmPopover.data.id)}
            onRequestClose={closeConfirmPopover}
          />
        )}
      </>
    </ScopedTooltipProvider>
  );
}
