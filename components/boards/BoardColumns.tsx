"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { memo, useMemo, type RefObject } from "react";
import SortableColumn from "@/components/common/SortableColumn";
import ColumnBottomDropzone from "@/components/boards/ColumnBottomDropzone";
import Column from "@/components/columns/Column";
import SkeletonColumn from "@/components/skeletons/SkeletonColumn";
import AcceptIcon from "@/components/icons/AcceptIcon";
import DeclineIcon from "@/components/icons/DeclineIcon";
import styles from "@/components/boards/SingleBoardView.module.css";
import type { ApiColumnCard, EntityId } from "@/types";
import { isTempId } from "@/utils/entityId";

type UiCard = Omit<ApiColumnCard, "id"> & { id: string };

type ColumnLike = {
  id: string;
  title: string;
  cards: UiCard[];
};

function isAssignedToMember(card: UiCard, memberId: EntityId) {
  return card.assigneeId != null && String(card.assigneeId) === String(memberId);
}

interface BoardColumnsProps {
  boardId: string;
  columns: ColumnLike[];
  isLoading: boolean;
  isBoardReadOnly: boolean;
  isDndLocked?: boolean;
  isEditLocked?: boolean;
  showMyCards: boolean;
  currentUserMemberId?: EntityId | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  isCreating: boolean;
  newColumnTitle: string;
  onStartCreateColumn: () => void;
  onCloseCreateColumn: () => void;
  onNewColumnTitleChange: (value: string) => void;
  onCreateColumn: () => void | Promise<void>;
  onColumnTitleUpdate: (id: string, newTitle: string) => Promise<void>;
  onOpenCard: (cardId: string, byKeyboard?: boolean, target?: HTMLElement) => void;
  onCreateCardErrorToast?: (message: string, note?: string) => void;
}

function BoardColumns({
  boardId,
  columns,
  isLoading,
  isBoardReadOnly,
  isDndLocked = false,
  isEditLocked = false,
  showMyCards,
  currentUserMemberId,
  scrollRef,
  isCreating,
  newColumnTitle,
  onStartCreateColumn,
  onCloseCreateColumn,
  onNewColumnTitleChange,
  onCreateColumn,
  onColumnTitleUpdate,
  onOpenCard,
  onCreateCardErrorToast,
}: BoardColumnsProps) {
  const filteredColumns = useMemo(() => {
    if (!showMyCards) return columns;
    if (currentUserMemberId == null) return columns;

    return columns.map((column) => {
      const myCards = column.cards.filter((card) =>
        isAssignedToMember(card, currentUserMemberId),
      );

      if (myCards.length === column.cards.length) return column;

      return { ...column, cards: myCards };
    });
  }, [columns, currentUserMemberId, showMyCards]);

  const canAddColumn = !isBoardReadOnly;

  if (isLoading && columns.length === 0) {
    return (
      <div className={styles.columnsContainer}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.columnWrapper}>
            <SkeletonColumn />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={styles.columnsContainer}
      data-scrollbar="x"
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest(
            "input, textarea, select, button, [contenteditable='true']"
          )
        )
          return;
        const ae = document.activeElement as HTMLElement | null;
        if (!ae) return;
        const isFormEl =
          ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.isContentEditable;
        if (isFormEl && !ae.contains(target)) {
          ae.blur();
        }
      }}
    >
      <LayoutGroup>
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredColumns.map((column, columnIndex) => {
            const isPending = isTempId(column.id);
            return (
              <SortableColumn
                key={column.id}
                id={column.id}
                index={columnIndex}
                disabled={isPending || isBoardReadOnly || isDndLocked}
                readOnly={isBoardReadOnly}
                footer={
                  <ColumnBottomDropzone
                    columnId={column.id}
                    disabled={isPending || isBoardReadOnly || isDndLocked}
                  />
                }
              >
                <Column
                  boardId={boardId}
                  columnId={column.id}
                  title={column.title}
                  cards={column.cards}
                  onTitleUpdate={onColumnTitleUpdate}
                  onOpenCard={onOpenCard}
                  currentUserMemberId={currentUserMemberId}
                  autoAssignToCurrentUserOnCreate={showMyCards}
                  defaultAssigneeIdOnCreate={
                    showMyCards ? currentUserMemberId ?? null : null
                  }
                  isPending={isPending}
                  isReadOnly={isBoardReadOnly}
                  isDndLocked={isDndLocked}
                  isEditLocked={isEditLocked}
                  onErrorToast={onCreateCardErrorToast}
                />
              </SortableColumn>
            );
          })}
        </AnimatePresence>
        {canAddColumn && (
          <motion.div
            layout="position"
            data-draggable="column"
            data-pan-block="true"
            transition={{
              layout: {
                type: "spring",
                stiffness: 320,
                damping: 34,
                mass: 0.95,
              },
            }}
          >
            <div
              className={`${styles.addColumnTile} ${isCreating ? styles.activeTile : ""}`}
              role={isCreating ? undefined : "button"}
              tabIndex={isCreating ? -1 : 0}
              data-draggable="column"
              onClick={() => {
                if (isCreating) return;
                onStartCreateColumn();
              }}
              onKeyDown={(e) => {
                if (isCreating) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onStartCreateColumn();
                }
              }}
              onBlur={(event) => {
                if (!isCreating) return;
                const nextTarget = event.relatedTarget as Node | null;
                if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                onCloseCreateColumn();
              }}
            >
              <div
                className={`${styles.addColumnLabel} ${
                  isCreating ? styles.addColumnLabelHidden : ""
                }`}
                aria-hidden={isCreating}
              >
                <span className={styles.plusLarge}>+</span>
                <span>Column</span>
              </div>
              {isCreating ? (
                <div className={styles.addInner}>
                  <input
                    type="text"
                    value={newColumnTitle}
                    minLength={1}
                    maxLength={32}
                    onChange={(e) => onNewColumnTitleChange(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") await onCreateColumn();
                      if (e.key === "Escape") {
                        onCloseCreateColumn();
                      }
                    }}
                    autoFocus
                    placeholder="Column title"
                    className={styles.addInput}
                  />
                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      aria-label="Cancel column creation"
                      className={`${styles.iconBtn} focus-ring`}
                      onClick={onCloseCreateColumn}
                    >
                      <DeclineIcon />
                    </button>
                    <button
                      type="button"
                      aria-label="Create column"
                      className={`${styles.iconBtn} focus-ring`}
                      onClick={onCreateColumn}
                      disabled={!newColumnTitle.trim()}
                    >
                      <AcceptIcon />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </LayoutGroup>
    </div>
  );
}

export default memo(BoardColumns);
