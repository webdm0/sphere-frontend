"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import type { ApiArchivedCard, ApiColumn, ApiColumnCard, EntityId } from "@/types";
import styles from "./ArchiveModal.module.css";
import ArchiveModalSkeleton from "@/components/skeletons/ArchiveModalSkeleton";
import ArchiveIcon from "@/components/icons/ArchiveIcon";
import {
  emptyStateMotion,
  listItemMotion,
} from "@/components/modals/common/modalMotions";
import ArchiveItemActions from "@/components/modals/ModalsArchive/ArchiveItemActions";
import { isPending } from "@/components/modals/ModalsArchive/archiveUtils";
import { useIncrementalArchiveRender } from "@/hooks/archive/useIncrementalArchiveRender";

interface ArchiveColumnsTabProps {
  isBoardReadOnly: boolean;
  isColumnsLoading: boolean;
  archivedColumns: ApiColumn[];
  pendingColumnPlaceholders: ApiColumn[];
  hasColumnItems: boolean;
  expandedColumns: Set<EntityId>;
  restoringColumnIds: Set<EntityId>;
  deletingColumnIds: Set<EntityId>;
  restoringCardIds: Set<EntityId>;
  deletingCardIds: Set<EntityId>;
  onToggleExpanded: (id: EntityId) => void;
  onRestoreColumn: (column: ApiColumn) => void;
  onOpenPopover: (type: "card" | "column", id: EntityId, target: HTMLElement) => void;
  onOpenCardModal: (cardId: EntityId) => void;
  onRestoreCard: (card: ApiArchivedCard | ApiColumnCard) => void;
}

interface ArchivedColumnCardsListProps {
  cards: ApiColumnCard[];
  isBoardReadOnly: boolean;
  restoringCardIds: Set<EntityId>;
  deletingCardIds: Set<EntityId>;
  onOpenPopover: (type: "card" | "column", id: EntityId, target: HTMLElement) => void;
  onOpenCardModal: (cardId: EntityId) => void;
  onRestoreCard: (card: ApiArchivedCard | ApiColumnCard) => void;
}

function ArchivedColumnCardsList({
  cards,
  isBoardReadOnly,
  restoringCardIds,
  deletingCardIds,
  onOpenPopover,
  onOpenCardModal,
  onRestoreCard,
}: ArchivedColumnCardsListProps) {
  const {
    hasMore,
    listRef,
    visibleItems: visibleCards,
  } = useIncrementalArchiveRender(cards);

  return (
    <div className={styles.columnCards} ref={listRef}>
      {visibleCards.map((card) => {
        const isPendingCard = isPending(
          restoringCardIds,
          deletingCardIds,
          card.id
        );

        return (
          <div
            key={card.id}
            className={`${styles.row} ${styles.archivedInnerCard} ${isPendingCard ? styles.pending : ""} ${
              !isPendingCard ? "focus-ring" : ""
            }`}
            onClick={() => {
              if (isPendingCard) return;
              onOpenCardModal(card.id);
            }}
            role={!isPendingCard ? "button" : undefined}
            tabIndex={!isPendingCard ? 0 : undefined}
            onKeyDown={(event) => {
              if (isPendingCard) return;
              if (event.currentTarget !== event.target) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenCardModal(card.id);
              }
            }}
          >
            <div className={styles.card}>
              <div className={styles.cardTitle}>{card.title}</div>
            </div>

            <ArchiveItemActions
              isBoardReadOnly={isBoardReadOnly}
              isPending={isPendingCard}
              restoreLabel="Restore card"
              deleteLabel="Delete card"
              restoreSize={20}
              deleteSize={20}
              onRestore={() => onRestoreCard(card)}
              onOpenDelete={(target) =>
                onOpenPopover("card", card.id, target)
              }
            />
          </div>
        );
      })}

      {hasMore && <div className={styles.loadMoreSentinel} aria-hidden="true" />}
    </div>
  );
}

function ArchiveColumnsTab({
  isBoardReadOnly,
  isColumnsLoading,
  archivedColumns,
  pendingColumnPlaceholders,
  hasColumnItems,
  expandedColumns,
  restoringColumnIds,
  deletingColumnIds,
  restoringCardIds,
  deletingCardIds,
  onToggleExpanded,
  onRestoreColumn,
  onOpenPopover,
  onOpenCardModal,
  onRestoreCard,
}: ArchiveColumnsTabProps) {
  const {
    hasMore,
    listRef,
    visibleItems: visibleArchivedColumns,
  } = useIncrementalArchiveRender(archivedColumns);

  return (
    <div className={styles.list} ref={listRef}>
      {isColumnsLoading &&
      archivedColumns.length === 0 &&
      pendingColumnPlaceholders.length === 0 ? (
        <ArchiveModalSkeleton />
      ) : (
        <>
          <AnimatePresence initial={false} mode="popLayout">
            {pendingColumnPlaceholders.map((col) => (
              <motion.div
                key={`pending-column-${col.id}`}
                layout="position"
                {...listItemMotion}
                className={`${styles.archivedColumnRow} ${styles.pending}`}
                style={{ cursor: isBoardReadOnly ? "default" : "progress" }}
              >
                <div className={styles.card}>
                  <div className={styles.title}>
                    {col.title || "Moving column..."}
                  </div>
                  <div className={styles.sub}>
                    {col.cards?.length ?? 0} cards
                  </div>
                </div>
              </motion.div>
            ))}

            {visibleArchivedColumns.map((col) => {
              const isExpanded = expandedColumns.has(col.id);
              const isPendingColumn = isPending(
                restoringColumnIds,
                deletingColumnIds,
                col.id
              );
              const hasCards = col.cards.length > 0;

              return (
                <motion.div key={col.id} layout="position" {...listItemMotion}>
                  <div
                    className={`${styles.archivedColumnRow} ${isPendingColumn ? styles.pending : ""} ${
                      !isPendingColumn && hasCards ? "focus-ring" : ""
                    }`}
                    style={{
                      cursor: isPendingColumn
                        ? "progress"
                        : hasCards
                          ? "pointer"
                          : "default",
                    }}
                    role={!isPendingColumn && hasCards ? "button" : undefined}
                    tabIndex={!isPendingColumn && hasCards ? 0 : undefined}
                    onClick={() => {
                      if (isPendingColumn) return;
                      if (hasCards) onToggleExpanded(col.id);
                    }}
                    onKeyDown={(event) => {
                      if (isPendingColumn || !hasCards) return;
                      if (event.currentTarget !== event.target) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onToggleExpanded(col.id);
                      }
                    }}
                  >
                    <div className={styles.card}>
                      <div className={styles.title}>{col.title}</div>
                      <div className={styles.sub}>{col.cards.length} cards</div>
                    </div>

                    <ArchiveItemActions
                      isBoardReadOnly={isBoardReadOnly}
                      isPending={isPendingColumn}
                      restoreLabel="Restore column"
                      deleteLabel="Delete column"
                      restoreSize={22}
                      deleteSize={22}
                      onRestore={() => onRestoreColumn(col)}
                      onOpenDelete={(target) =>
                        onOpenPopover("column", col.id, target)
                      }
                    />
                  </div>

                  <AnimatePresence>
                    {isExpanded && hasCards && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        <ArchivedColumnCardsList
                          cards={col.cards}
                          isBoardReadOnly={isBoardReadOnly}
                          restoringCardIds={restoringCardIds}
                          deletingCardIds={deletingCardIds}
                          onOpenPopover={onOpenPopover}
                          onOpenCardModal={onOpenCardModal}
                          onRestoreCard={onRestoreCard}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {hasMore && <div className={styles.loadMoreSentinel} aria-hidden="true" />}

          <AnimatePresence initial={false}>
            {!hasColumnItems && (
              <motion.div
                key="columns-empty"
                {...emptyStateMotion}
                className={styles.emptySpacer}
              >
                <ArchiveIcon size={64} color="var(--text-secondary)" />
                <h3 className="mb-2">Archive is empty</h3>
                <p className="text-sm leading-relaxed">
                  Start archiving columns to see them here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default memo(ArchiveColumnsTab);
