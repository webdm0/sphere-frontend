"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import MembersIcon from "@/components/icons/MembersIcon";
import AcceptIcon from "@/components/icons/AcceptIcon";
import DeclineIcon from "@/components/icons/DeclineIcon";
import BoardCardSkeleton from "@/components/skeletons/BoardCardSkeleton";
import BoardCardMenu from "@/components/boards/BoardCardMenu";
import {
  ScopedTooltipProvider,
  ScopedTooltipTrigger,
} from "@/components/ui/ScopedTooltipProvider";
import styles from "@/components/boards/BoardsList.module.css";
import { slugify } from "@/utils/slugify";
import type { ApiBoardListItem, UiBoardListItem } from "@/types";
import type { RefObject, Dispatch, SetStateAction } from "react";
import type { useBoardModals } from "@/hooks/board/useBoardModals";
import type { EntityId } from "@/types";

type BoardModals = ReturnType<typeof useBoardModals>;

interface BoardsGridProps {
  tab: "all" | "mine" | "shared";
  boards: UiBoardListItem[];
  isLoading: boolean;
  filteredBoards: UiBoardListItem[];
  modals: BoardModals;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onCommitTitle: () => Promise<void>;
  onCloseEdit: () => void;
  prefetchBoard: (board: { id: EntityId; title: string }) => void;
  schedulePrefetchBoard: (board: { id: EntityId; title: string }) => void;
  cancelScheduledPrefetch: () => void;
  confirmActionMap: Record<string, "close" | "leave" | null>;
  setConfirmActionMap: Dispatch<SetStateAction<Record<string, "close" | "leave" | null>>>;
  archiveClosedBoard: (board: ApiBoardListItem) => Promise<void>;
  leave: (id: EntityId) => Promise<unknown>;
  accept: (id: EntityId) => Promise<void>;
  decline: (id: EntityId) => Promise<void>;
  onCreateBoard: (origin: "keyboard" | "pointer") => void;
}

export default function BoardsGrid({
  tab,
  boards,
  isLoading,
  filteredBoards,
  modals,
  textareaRef,
  onCommitTitle,
  onCloseEdit,
  prefetchBoard,
  schedulePrefetchBoard,
  cancelScheduledPrefetch,
  confirmActionMap,
  setConfirmActionMap,
  archiveClosedBoard,
  leave,
  accept,
  decline,
  onCreateBoard,
}: BoardsGridProps) {
  return (
    <ScopedTooltipProvider>
      <AnimatePresence mode="wait">
        {isLoading && boards.length === 0 ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <BoardCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={styles.grid}
          >
            <AnimatePresence mode="popLayout">
              {filteredBoards.map((board) => {
                const isInvitePending = board.isShared && !board.isAccepted;
                const isCreating = Boolean(board.isCreating);
                const isPending = isInvitePending || isCreating;
                const isEditing =
                  modals.selected?.id === board.id && modals.isEditOpen;
                const boardKey = board.clientId ?? board.id;
                const boardHref = `/b/${board.id}/${slugify(board.title)}`;
                const confirmAction = confirmActionMap[board.id] ?? null;

                return (
                  <motion.div
                    key={boardKey}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    onPointerEnter={() => !isPending && schedulePrefetchBoard(board)}
                    onPointerLeave={cancelScheduledPrefetch}
                    onTouchStart={() => !isPending && prefetchBoard(board)}
                  >
                    <div
                      className={`${styles.card} ${
                        isCreating ? styles.cardPending : ""
                      }`}
                      style={{ cursor: isPending ? "default" : "pointer" }}
                    >
                      {isCreating && (
                        <div
                          className={styles.cardPendingOverlay}
                          aria-hidden="true"
                        />
                      )}
                      {isPending || isEditing ? (
                        <div className={styles.cardArea}>
                          {isEditing ? (
                            <textarea
                              ref={textareaRef}
                              className={styles.editInput}
                              minLength={1}
                              maxLength={100}
                              value={modals.selected?.title || ""}
                              onChange={(e) => {
                                const el = textareaRef.current;
                                if (el) {
                                  el.style.height = "auto";
                                  el.style.height = `${el.scrollHeight}px`;
                                }
                                modals.select({
                                  ...board,
                                  title: e.target.value,
                                });
                              }}
                              onBlur={onCommitTitle}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  await onCommitTitle();
                                }

                                if (e.key === "Escape") {
                                  onCloseEdit();
                                }
                              }}
                              autoFocus
                              rows={1}
                            />
                          ) : (
                            <ScopedTooltipTrigger
                              text={board.title}
                              className={styles.cardTitle}
                            >
                              {board.title}
                            </ScopedTooltipTrigger>
                          )}

                          {isInvitePending && (
                            <div className={styles.bottomSection}>
                              <ScopedTooltipTrigger
                                text={`Invitation from ${board.ownerName}`}
                                className={`${styles.dot} ${styles.dotActive}`}
                              >
                                <div />
                              </ScopedTooltipTrigger>
                              <div className={styles.invitedBy}>
                                <MembersIcon size={12} color="var(--text-secondary)" />{" "}
                                {board.ownerName}
                              </div>
                              <div className={styles.actionsRow}>
                                <button
                                  type="button"
                                  aria-label="Decline invite"
                                  className={`${styles.bigIconBtn} focus-ring`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    decline(board.id);
                                  }}
                                >
                                  <ScopedTooltipTrigger text="Decline invite">
                                    <DeclineIcon />
                                  </ScopedTooltipTrigger>
                                </button>
                                <button
                                  type="button"
                                  aria-label="Accept invite"
                                  className={`${styles.bigIconBtn} focus-ring`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    accept(board.id);
                                  }}
                                >
                                  <ScopedTooltipTrigger text="Accept invite">
                                    <AcceptIcon />
                                  </ScopedTooltipTrigger>
                                </button>
                              </div>
                            </div>
                          )}

                          {tab === "all" && !isInvitePending && (
                            <div className={styles.cardBadge}>
                              {board.isMine ? "Mine" : "Shared"}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={boardHref}
                          className={`${styles.cardArea} ${styles.cardAreaLink} focus-ring`}
                          onFocus={() => prefetchBoard(board)}
                        >
                          <ScopedTooltipTrigger
                            text={board.title}
                            className={styles.cardTitle}
                          >
                            {board.title}
                          </ScopedTooltipTrigger>

                          {tab === "all" && !isInvitePending && (
                            <div className={styles.cardBadge}>
                              {board.isMine ? "Mine" : "Shared"}
                            </div>
                          )}
                        </Link>
                      )}

                      {!isPending && (
                        <BoardCardMenu
                          board={board}
                          modals={modals}
                          confirmAction={confirmAction}
                          setConfirmAction={(value) =>
                            setConfirmActionMap((prev) => ({
                              ...prev,
                              [board.id]: value,
                            }))
                          }
                          archiveClosedBoard={archiveClosedBoard}
                          leave={leave}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <motion.div layout>
              <div
                className={`${styles.cardCreate} focus-ring`}
                onClick={() => onCreateBoard("pointer")}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onCreateBoard("keyboard");
                  }
                }}
              >
                <span className={styles.plus}>+</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScopedTooltipProvider>
  );
}
