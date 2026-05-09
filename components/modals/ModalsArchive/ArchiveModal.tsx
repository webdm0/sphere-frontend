import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import styles from "./ArchiveModal.module.css";
import form from "@/components/common/form.module.css";
import type { ApiColumn, ApiArchivedCard } from "@/types";
import { useCards } from "@/hooks/card/useCards";
import { useCardModal } from "@/hooks/card/useCardModal";
import { useBodyScrollLock } from "@/hooks/ui/useBodyScrollLock";
import { useModalDismiss } from "@/hooks/ui/useModalDismiss";
import { useEscapeClose } from "@/hooks/ui/useEscapeClose";
import { useFocusTrap } from "@/hooks/ui/useFocusTrap";
import ConfirmPopover from "@/components/modals/common/ConfirmPopover";
import ModalCloseButton from "@/components/modals/common/ModalCloseButton";
import { useArchiveModalState } from "@/hooks/archive/useArchiveModalState";
import ArchiveColumnsTab from "@/components/modals/ModalsArchive/ArchiveColumnsTab";
import ArchiveCardsTab from "@/components/modals/ModalsArchive/ArchiveCardsTab";
import { ScopedTooltipProvider } from "@/components/ui/ScopedTooltipProvider";
import type { EntityId } from "@/types";

const loadEditCardModal = () =>
  import("@/components/modals/ModalsCard/EditCardModal");

const EditCardModal = dynamic(loadEditCardModal, {
  ssr: false,
  loading: () => null,
});

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnFocusOnClose?: boolean;
  archivedColumns: ApiColumn[];
  archivedCards: ApiArchivedCard[];
  pendingArchivedColumns: ApiColumn[];
  pendingArchivedCards: ApiArchivedCard[];
  columnTitles: Record<string, string>;
  isCardsLoading: boolean;
  isColumnsLoading: boolean;
  boardId: EntityId;
  isBoardReadOnly: boolean;
  restoreColumn: (id: string) => Promise<unknown>;
  deleteColumnForever: (id: string) => Promise<unknown>;
  activeTab: "cards" | "columns";
  setActiveTab: (tab: "cards" | "columns") => void;
}

export default function ArchiveModal({
  isOpen,
  onClose,
  returnFocusOnClose = true,
  archivedColumns,
  archivedCards,
  pendingArchivedColumns,
  pendingArchivedCards,
  isCardsLoading,
  isColumnsLoading,
  activeTab,
  setActiveTab,
  boardId,
  isBoardReadOnly,
  restoreColumn,
  deleteColumnForever,
}: ArchiveModalProps) {
  const { restore, removeForever } = useCards(undefined, boardId);
  const { isEditOpen, openEdit, closeEdit } = useCardModal();
  const [hasMountedEditCardModal, setHasMountedEditCardModal] = useState(false);
  const {
    toasts,
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
    cardOpenedByKeyboard,
    handleOpenCardModal,
    handleCloseCardModal,
    handleCardUpdated,
    handleRestoreCard,
    handleRestoreColumn,
    handleDeleteForever,
    handleArchiveToggleFromModal,
    handleRestoreToast,
  } = useArchiveModalState({
    isOpen,
    archivedColumns,
    archivedCards,
    pendingArchivedColumns,
    pendingArchivedCards,
    isBoardReadOnly,
    restoreCard: restore,
    removeCardForever: removeForever,
    restoreColumn,
    deleteColumnForever,
    openEdit,
    closeEdit,
  });

  useEffect(() => {
    if (!isEditOpen || selectedCardId === null) return;
    setHasMountedEditCardModal(true);
  }, [isEditOpen, selectedCardId]);

  useBodyScrollLock(isOpen);

  const handleArchiveClose = () => {
    onClose();
    handleCloseCardModal();
  };

  const { modalRef, handleMouseDown, handleMouseUp } =
    useModalDismiss(handleArchiveClose);
  const isParentTrapActive = isOpen && !isEditOpen;
  useEscapeClose(isParentTrapActive, handleArchiveClose);
  useFocusTrap(modalRef, isParentTrapActive, {
    initialFocus: "none",
    shouldReturnFocus: returnFocusOnClose,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (returnFocusOnClose) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== modalRef.current) {
      active.blur();
    }
  }, [isOpen, returnFocusOnClose, modalRef]);

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
        {createPortal(
          <div className={styles.toastLayer} aria-live="polite">
            <AnimatePresence>
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  className={styles.toast}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.24 }}
                >
                  <div className={styles.toastText}>{toast.message}</div>
                  {toast.note && (
                    <div className={styles.toastNote}>{toast.note}</div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
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
                className={`${styles.modal} ${isBoardReadOnly ? styles.readOnly : ""}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="archive-title"
              >
                <ModalCloseButton onClick={handleArchiveClose} />
                <h2
                  id="archive-title"
                  className={`text-xl sm:text-2xl text-center ${form.glitchText}`}
                >
                  Archive
                </h2>

                <div className={styles.tabsWrapper}>
                  <div className={styles.tabs}>
                    <button
                      className={
                        activeTab === "cards"
                          ? `${styles.tabItem} ${styles.tabActive} focus-ring`
                          : `${styles.tabItem} focus-ring`
                      }
                      onClick={() => setActiveTab("cards")}
                    >
                      Cards
                    </button>

                    <button
                      className={
                        activeTab === "columns"
                          ? `${styles.tabItem} ${styles.tabActive} focus-ring`
                          : `${styles.tabItem} focus-ring`
                      }
                      onClick={() => setActiveTab("columns")}
                    >
                      Columns
                    </button>
                  </div>
                </div>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={styles.content}
                >
                  {activeTab === "columns" && (
                    <ArchiveColumnsTab
                      isBoardReadOnly={isBoardReadOnly}
                      isColumnsLoading={isColumnsLoading}
                      archivedColumns={archivedColumns}
                      pendingColumnPlaceholders={pendingColumnPlaceholders}
                      hasColumnItems={hasColumnItems}
                      expandedColumns={expandedColumns}
                      restoringColumnIds={restoringColumnIds}
                      deletingColumnIds={deletingColumnIds}
                      restoringCardIds={restoringCardIds}
                      deletingCardIds={deletingCardIds}
                      onToggleExpanded={toggleExpandedColumn}
                      onRestoreColumn={handleRestoreColumn}
                      onOpenPopover={handleOpenPopover}
                      onOpenCardModal={handleOpenCardModal}
                      onRestoreCard={handleRestoreCard}
                    />
                  )}

                  {activeTab === "cards" && (
                    <ArchiveCardsTab
                      isBoardReadOnly={isBoardReadOnly}
                      isCardsLoading={isCardsLoading}
                      archivedCards={archivedCards}
                      pendingCardPlaceholders={pendingCardPlaceholders}
                      hasCardItems={hasCardItems}
                      restoringCardIds={restoringCardIds}
                      deletingCardIds={deletingCardIds}
                      onOpenCardModal={handleOpenCardModal}
                      onRestoreCard={handleRestoreCard}
                      onOpenPopover={handleOpenPopover}
                    />
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {confirmPopover && (
          <ConfirmPopover
            rect={confirmPopover.rect}
            visible={confirmVisible}
            popoverRef={confirmPopoverRef}
            text={
              confirmPopover.data.type === "card"
                ? "This card will be permanently deleted."
                : "This column will be permanently deleted."
            }
            actionLabel="Confirm delete"
            className={styles.popover}
            openClassName={styles.popoverOpen}
            textClassName={styles.popoverText}
            actionClassName={`${styles.popoverAction} focus-ring`}
            onConfirm={() =>
              handleDeleteForever(
                confirmPopover.data.type,
                confirmPopover.data.id
              )
            }
            onRequestClose={closeConfirmPopover}
          />
        )}

        {hasMountedEditCardModal ? (
          <EditCardModal
            isOpen={isOpen && isEditOpen && selectedCardId !== null}
            onClose={handleCloseCardModal}
            cardId={selectedCardId ?? ""}
            openedByKeyboard={cardOpenedByKeyboard}
            onCardUpdated={handleCardUpdated}
            boardId={boardId}
            readOnly={isBoardReadOnly}
            onRestore={handleRestoreToast}
            onToggleArchive={handleArchiveToggleFromModal}
          />
        ) : null}
      </>
    </ScopedTooltipProvider>
  );
}
