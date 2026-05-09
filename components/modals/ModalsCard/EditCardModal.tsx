'use client';
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCards } from "@/hooks/card/useCards";
import { ApiCard, EntityId, RestoreCardResponseDto } from "@/types";
import styles from "./EditCardModal.module.css";
import EditCardFields from "@/components/modals/ModalsCard/EditCardFields";
import { createPortal } from "react-dom";
import SkeletonCardModal from "@/components/skeletons/SkeletonCardModal"
import { useBoardMembers } from "@/hooks/board/useBoardMembers";
import { useModalDismiss } from "@/hooks/ui/useModalDismiss";
import { useEditCardDrafts } from "@/hooks/card/useEditCardDrafts";
import { useEditCardAutoSave } from "@/hooks/card/useEditCardAutoSave";
import { useBodyScrollLock } from "@/hooks/ui/useBodyScrollLock";
import { useEscapeClose } from "@/hooks/ui/useEscapeClose";
import { useFocusTrap } from "@/hooks/ui/useFocusTrap";
import ModalCloseButton from "@/components/modals/common/ModalCloseButton";

const MAX_CARD_CONTENT_LENGTH = 4000;

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: EntityId;
  onCardUpdated?: (updated: Partial<ApiCard>) => void;
  boardId: string;
  readOnly?: boolean;
  onRestore?: (response: RestoreCardResponseDto | undefined) => void;
  onToggleArchive?: (cardId: EntityId, nextArchived: boolean) => Promise<void> | void;
  openedByKeyboard?: boolean;
}

export default function EditCardModal({
  isOpen,
  onClose,
  cardId,
  onCardUpdated,
  boardId,
  readOnly = false,
  onRestore,
  onToggleArchive,
  openedByKeyboard = false,
}: EditCardModalProps) {
  const { useCard, update, updateOptimistic, restore } = useCards(
    undefined,
    boardId
  );
  const { data: membersData } = useBoardMembers(boardId, { enabled: isOpen });
  const members = membersData?.members ?? [];
  const { data: card } = useCard(isOpen ? cardId : undefined);

  const { modalRef, handleMouseDown, handleMouseUp } = useModalDismiss(onClose);
  useBodyScrollLock(isOpen);
  useEscapeClose(isOpen, onClose);
  useFocusTrap(modalRef, isOpen, {
    initialFocus: "none",
    shouldReturnFocus: openedByKeyboard,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (openedByKeyboard) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== modalRef.current) {
      active.blur();
    }
  }, [isOpen, openedByKeyboard, modalRef]);

  const isBoardReadOnly = readOnly;
  const isReadOnly = isBoardReadOnly || !!card?.isArchived;

  const {
    titleTextareaRef,
    previousTitleRef,
    titleDraft,
    setTitleDraft,
    contentDraft,
    setContentDraft,
    adjustTitleHeight,
    capturePreviousTitle,
  } = useEditCardDrafts({ card, isOpen });

  const { handleAutoSave, handleArchiveToggle } = useEditCardAutoSave({
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
  });

  if (typeof window === "undefined") return null;

  return createPortal(
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
            className={`${styles.modal} ${card?.isArchived ? styles.archived : ""} ${
              isBoardReadOnly ? styles.readOnly : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-card-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <h2 id="edit-card-title" className="sr-only">
              Edit card
            </h2>
            <ModalCloseButton onClick={onClose} />
            {!card ? (
              <SkeletonCardModal />
            ) : (
              <>
                <header className={styles.header}>
                  <textarea
                    ref={titleTextareaRef}
                    className={styles.titleInput}
                    value={titleDraft}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      const next = e.target.value;
                      setTitleDraft(next);
                      adjustTitleHeight(e.target);
                    }}
                    onFocus={() => {
                      capturePreviousTitle();
                    }}
                    onBlur={() => handleAutoSave({ title: titleDraft })}
                    placeholder="Card title"
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                    minLength={1}
                    maxLength={80}
                    rows={1}
                  />
                </header>

                <textarea
                  className={styles.textarea}
                  value={contentDraft}
                  onChange={(e) => {
                    if (isReadOnly) return;
                    setContentDraft(e.target.value);
                  }}
                  onBlur={() => {
                    if (contentDraft === (card.content ?? "")) return;
                    handleAutoSave({ content: contentDraft });
                  }}
                  placeholder="Write a description..."
                  rows={5}
                  maxLength={MAX_CARD_CONTENT_LENGTH}
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />


                <EditCardFields
                  card={card}
                  members={members}
                  isReadOnly={isReadOnly}
                  isArchiveToggleDisabled={isBoardReadOnly}
                  onAutoSave={handleAutoSave}
                  onArchiveToggle={handleArchiveToggle}
                />
              </>
            )}
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
