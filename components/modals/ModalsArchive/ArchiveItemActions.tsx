"use client";

import RestoreIcon from "@/components/icons/RestoreIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import { useScopedTooltip } from "@/components/ui/ScopedTooltipProvider";
import styles from "./ArchiveModal.module.css";

interface ArchiveItemActionsProps {
  isBoardReadOnly: boolean;
  isPending: boolean;
  restoreLabel: string;
  deleteLabel: string;
  restoreSize: number;
  deleteSize: number;
  onRestore: () => void;
  onOpenDelete: (target: HTMLElement) => void;
}

export default function ArchiveItemActions({
  isBoardReadOnly,
  isPending,
  restoreLabel,
  deleteLabel,
  restoreSize,
  deleteSize,
  onRestore,
  onOpenDelete,
}: ArchiveItemActionsProps) {
  const { hideTooltip, showTooltip } = useScopedTooltip();

  if (isBoardReadOnly) return null;

  return (
    <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={restoreLabel}
        className={`${styles.iconBtn} ${styles.restore} focus-ring`}
        onMouseEnter={(event) =>
          showTooltip(event.currentTarget, restoreLabel)
        }
        onMouseLeave={hideTooltip}
        onFocus={(event) => showTooltip(event.currentTarget, restoreLabel)}
        onBlur={hideTooltip}
        onClick={() => {
          hideTooltip();
          if (isPending || isBoardReadOnly) return;
          onRestore();
        }}
        disabled={isPending || isBoardReadOnly}
      >
        <RestoreIcon size={restoreSize} color="var(--text-secondary)" />
      </button>
      <button
        type="button"
        aria-label={deleteLabel}
        className={`${styles.iconBtn} ${styles.delete} focus-ring`}
        onMouseEnter={(event) =>
          showTooltip(event.currentTarget, deleteLabel)
        }
        onMouseLeave={hideTooltip}
        onFocus={(event) => showTooltip(event.currentTarget, deleteLabel)}
        onBlur={hideTooltip}
        onClick={(e) => {
          hideTooltip();
          if (isPending || isBoardReadOnly) return;
          e.stopPropagation();
          onOpenDelete(e.currentTarget);
        }}
        disabled={isPending || isBoardReadOnly}
      >
        <TrashIcon size={deleteSize} color="var(--text-secondary)" />
      </button>
    </div>
  );
}
