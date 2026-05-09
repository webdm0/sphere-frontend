"use client";

import { motion } from "framer-motion";
import type { BoardMemberDto } from "@/types";
import styles from "@/components/common/form.module.css";

type UiMember = BoardMemberDto & { pendingAdd?: boolean };

interface MemberRowProps {
  user: UiMember;
  isYou: boolean;
  isOwnerMember: boolean;
  isPending: boolean;
  isAdding: boolean;
  actionDisabled: boolean;
  showConfirm: boolean;
  canManageMembers: boolean;
  onRemove: () => void;
  onRequestKick: () => void;
  onCancelKick: () => void;
}

export default function MemberRow({
  user,
  isYou,
  isOwnerMember,
  isPending,
  isAdding,
  actionDisabled,
  showConfirm,
  canManageMembers,
  onRemove,
  onRequestKick,
  onCancelKick,
}: MemberRowProps) {
  let tagLabel: string | null = null;
  if (isAdding) tagLabel = "Pending";
  else if (isYou && isOwnerMember) tagLabel = "You (Owner)";
  else if (isYou) tagLabel = "You";
  else if (isOwnerMember) tagLabel = "Owner";
  else if (isPending) tagLabel = "Pending";

  return (
    <motion.div
      key={user.userId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={styles.memberItem}
      data-member-item="true"
    >
      <div className="text-sm">
        <span className={styles.username}>{user.username}</span>
      </div>

      <div className={styles.memberActions}>
        {tagLabel && <span className={styles.Tag}>{tagLabel}</span>}

        {canManageMembers && !isYou && !isAdding && (
          isPending ? (
            <button
              type="button"
              aria-label="Remove pending member"
              disabled={actionDisabled}
              onClick={onRemove}
              className={`${styles.removeBtn} focus-ring`}
            >
              <svg width="10" height="10" viewBox="0 0 12 12">
                <path
                  d="M3 3l6 6m0-6L3 9"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : showConfirm ? (
            <div className={styles.confirmKickWrapper}>
              <button onClick={onRemove} className={`${styles.Tag} focus-ring`}>
                Kick
              </button>
              <button onClick={onCancelKick} className={`${styles.Tag} focus-ring`}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Remove member"
              disabled={actionDisabled}
              onClick={onRequestKick}
              className={`${styles.removeBtn} focus-ring`}
            >
              <svg width="10" height="10" viewBox="0 0 12 12">
                <path
                  d="M3 3l6 6m0-6L3 9"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )
        )}
      </div>
    </motion.div>
  );
}
