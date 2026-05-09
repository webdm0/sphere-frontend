"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import type { ApiArchivedCard, EntityId } from "@/types";
import styles from "./ArchiveModal.module.css";
import ArchiveModalSkeleton from "@/components/skeletons/ArchiveModalSkeleton";
import ArchiveIcon from "@/components/icons/ArchiveIcon";
import {
  emptyStateMotion,
  listItemMotion,
} from "@/components/modals/common/modalMotions";
import ArchiveItemActions from "@/components/modals/ModalsArchive/ArchiveItemActions";
import {
  getArchivedCardColumnInfo,
  isPending,
} from "@/components/modals/ModalsArchive/archiveUtils";
import { useIncrementalArchiveRender } from "@/hooks/archive/useIncrementalArchiveRender";

interface ArchiveCardsTabProps {
  isBoardReadOnly: boolean;
  isCardsLoading: boolean;
  archivedCards: ApiArchivedCard[];
  pendingCardPlaceholders: ApiArchivedCard[];
  hasCardItems: boolean;
  restoringCardIds: Set<EntityId>;
  deletingCardIds: Set<EntityId>;
  onOpenCardModal: (cardId: EntityId) => void;
  onRestoreCard: (card: ApiArchivedCard) => void;
  onOpenPopover: (type: "card" | "column", id: EntityId, target: HTMLElement) => void;
}

function ArchiveCardsTab({
  isBoardReadOnly,
  isCardsLoading,
  archivedCards,
  pendingCardPlaceholders,
  hasCardItems,
  restoringCardIds,
  deletingCardIds,
  onOpenCardModal,
  onRestoreCard,
  onOpenPopover,
}: ArchiveCardsTabProps) {
  const {
    hasMore,
    listRef,
    visibleItems: visibleArchivedCards,
  } = useIncrementalArchiveRender(archivedCards);

  return (
    <div className={styles.list} ref={listRef}>
      {isCardsLoading &&
      archivedCards.length === 0 &&
      pendingCardPlaceholders.length === 0 ? (
        <ArchiveModalSkeleton />
      ) : (
        <>
          <AnimatePresence initial={false} mode="popLayout">
            {pendingCardPlaceholders.map((card) => (
              <motion.div
                key={`pending-card-${card.id}`}
                layout="position"
                {...listItemMotion}
                className={`${styles.row} ${styles.pending}`}
              >
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    {card.title || "Moving card..."}
                  </div>

                  <div className={styles.cardSub}>
                    {card.columnTitle ? `From: ${card.columnTitle}` : "Moving to archive"}
                  </div>
                </div>
              </motion.div>
            ))}

            {visibleArchivedCards.map((card) => {
              const columnInfo = getArchivedCardColumnInfo(
                card.columnStatus,
                card.columnTitle
              );
              const isPendingCard = isPending(
                restoringCardIds,
                deletingCardIds,
                card.id
              );

              return (
                <motion.div
                  key={card.id}
                  layout="position"
                  {...listItemMotion}
                  className={`${styles.row} ${isPendingCard ? styles.pending : ""} ${
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
                    <div className={styles.cardSub}>{columnInfo}</div>
                  </div>

                  <ArchiveItemActions
                    isBoardReadOnly={isBoardReadOnly}
                    isPending={isPendingCard}
                    restoreLabel="Restore card"
                    deleteLabel="Delete card"
                    restoreSize={22}
                    deleteSize={22}
                    onRestore={() => onRestoreCard(card)}
                    onOpenDelete={(target) =>
                      onOpenPopover("card", card.id, target)
                    }
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {hasMore && <div className={styles.loadMoreSentinel} aria-hidden="true" />}

          <AnimatePresence initial={false}>
            {!hasCardItems && (
              <motion.div
                key="cards-empty"
                {...emptyStateMotion}
                className={styles.emptySpacer}
              >
                <ArchiveIcon size={64} color="var(--text-secondary)" className={styles.ghostIcon} />
                <h3 className="mb-2">Archive is empty</h3>
                <p className="text-sm leading-relaxed">
                  Start archiving cards to see them here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default memo(ArchiveCardsTab);
