"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import type { ApiBoardListItem } from "@/types";
import RestoreIcon from "@/components/icons/RestoreIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import { ScopedTooltipTrigger } from "@/components/ui/ScopedTooltipProvider";
import { slugify } from "@/utils/slugify";
import styles from "./ClosedBoardsModal.module.css";
import { listItemMotion } from "@/components/modals/common/modalMotions";

type ClosedBoardRowProps = Omit<HTMLMotionProps<"div">, "children"> & {
  board: ApiBoardListItem;
  isPending: boolean;
  canManage: boolean;
  onRestore: (board: ApiBoardListItem) => void;
  onDelete: (target: HTMLElement) => void;
  onClose: () => void;
};

const getBoardMeta = (board: ApiBoardListItem) => {
  if (board.isMine) return "Mine";
  if (board.ownerName) return `Shared by ${board.ownerName}`;
  if (board.isShared) return "Shared board";
  return "Board";
};

const ClosedBoardRow = forwardRef<HTMLDivElement, ClosedBoardRowProps>(
  (
    {
      board,
      isPending,
      canManage,
      onRestore,
      onDelete,
      onClose,
      className,
      style,
      ...motionProps
    },
    ref
  ) => {
    const boardHref = `/b/${board.id}/${slugify(board.title || "board")}`;
    const cardBody = (
      <>
        <ScopedTooltipTrigger className={styles.titleTooltip} text={board.title}>
          <p className={styles.title}>{board.title}</p>
        </ScopedTooltipTrigger>
        <p className={styles.sub}>{getBoardMeta(board)}</p>
      </>
    );

    return (
      <motion.div
        ref={ref}
        layout="position"
        {...listItemMotion}
        {...motionProps}
        className={`${styles.row} ${isPending ? styles.pending : ""} ${className ?? ""}`}
        style={{ cursor: isPending ? "progress" : "pointer", ...style }}
      >
        {isPending ? (
          <div className={styles.card}>{cardBody}</div>
        ) : (
          <Link
            href={boardHref}
            className={styles.card}
            prefetch={false}
            tabIndex={0}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              onClose();
            }}
          >
            {cardBody}
          </Link>
        )}
        {canManage && (
          <div className={styles.actions}>
            <ScopedTooltipTrigger text="Restore board">
              <button
                type="button"
                aria-label="Restore board"
                className={`${styles.iconBtn} ${styles.restore} focus-ring`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(board);
                }}
                disabled={isPending}
              >
                <RestoreIcon size={22} color="var(--text-secondary)" />
              </button>
            </ScopedTooltipTrigger>
            <ScopedTooltipTrigger text="Delete board">
              <button
                type="button"
                aria-label="Delete board"
                className={`${styles.iconBtn} ${styles.delete} focus-ring`}
                onClick={(e) => {
                  if (isPending) return;
                  e.stopPropagation();
                  onDelete(e.currentTarget);
                }}
                disabled={isPending}
              >
                <TrashIcon size={22} color="var(--text-secondary)" />
              </button>
            </ScopedTooltipTrigger>
          </div>
        )}
      </motion.div>
    );
  }
);

ClosedBoardRow.displayName = "ClosedBoardRow";

export default ClosedBoardRow;
