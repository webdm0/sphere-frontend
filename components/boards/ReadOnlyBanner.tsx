"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import styles from "@/components/boards/SingleBoardView.module.css";

type MotionPreset = Pick<
  HTMLMotionProps<"div">,
  "initial" | "animate" | "exit" | "transition"
>;

interface ReadOnlyBannerProps {
  isReadOnly: boolean;
  canRestore: boolean;
  isRestoring: boolean;
  motionPreset: MotionPreset;
  onRestoreClick: (target: HTMLElement) => void;
}

export default function ReadOnlyBanner({
  isReadOnly,
  canRestore,
  isRestoring,
  motionPreset,
  onRestoreClick,
}: ReadOnlyBannerProps) {
  return (
    <AnimatePresence initial={false}>
      {isReadOnly && (
        <motion.div
          className={`${styles.readOnlyCard} ${
            canRestore ? styles.readOnlyCardAction : ""
          }`}
          {...motionPreset}
        >
          <span className={styles.readOnlyText}>
            Closed board &mdash; view only.
          </span>
          {canRestore && (
            <button
              type="button"
              onClick={(e) => {
                if (isRestoring) return;
                e.stopPropagation();
                onRestoreClick(e.currentTarget);
              }}
              className={`${styles.readOnlyRestoreText} focus-ring`}
              disabled={isRestoring}
              data-interactive="true"
              aria-label="Restore board"
            >
              Restore
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
