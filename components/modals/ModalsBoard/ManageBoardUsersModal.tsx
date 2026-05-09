'use client';

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "@/components/common/form.module.css";
import { useBoardMembers } from "@/hooks/board/useBoardMembers";
import SkeletonMembers from "@/components/skeletons/SkeletonMembers";
import { useModalDismiss } from "@/hooks/ui/useModalDismiss";
import { useBodyScrollLock } from "@/hooks/ui/useBodyScrollLock";
import { useEscapeClose } from "@/hooks/ui/useEscapeClose";
import { useFocusTrap } from "@/hooks/ui/useFocusTrap";
import { useManageBoardUsersState } from "@/hooks/board/useManageBoardUsersState";
import MemberRow from "@/components/modals/ModalsBoard/MemberRow";
import UserSearchDropdown from "@/components/modals/common/UserSearchDropdown";
import ModalCloseButton from "@/components/modals/common/ModalCloseButton";
import type { EntityId } from "@/types";

const normalizeIdentity = (value?: string) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isSameUserIdentity = (
  user: { username: string; email?: string },
  currentUsername?: string,
  currentEmail?: string
) => {
  const normalizedCurrentEmail = normalizeIdentity(currentEmail);
  const normalizedCurrentUsername = normalizeIdentity(currentUsername);

  if (normalizedCurrentEmail) {
    return normalizeIdentity(user.email) === normalizedCurrentEmail;
  }
  if (!normalizedCurrentUsername) return false;
  return normalizeIdentity(user.username) === normalizedCurrentUsername;
};

interface ManageBoardUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: EntityId;
  currentUsername?: string;
  currentEmail?: string;
  isBoardOwner?: boolean;
  readOnly?: boolean;
  returnFocusOnClose?: boolean;
}

export default function ManageBoardUsersModal({
  isOpen,
  onClose,
  boardId,
  currentUsername,
  currentEmail,
  isBoardOwner,
  readOnly = false,
  returnFocusOnClose = true,
}: ManageBoardUsersModalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { modalRef, handleMouseDown, handleMouseUp } = useModalDismiss(onClose);
  useBodyScrollLock(isOpen);
  useEscapeClose(isOpen, onClose);
  useFocusTrap(modalRef, isOpen, {
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

  const {
    data: membersData,
    isLoading,
    addMember,
    removeMember,
    ownerId,
    isOwner,
  } = useBoardMembers(boardId, {
    enabled: isOpen,
    currentUsername,
    currentEmail,
    isBoardOwner,
  });
  const canManageMembers = isOwner && !readOnly;

  const {
    error,
    query,
    dropdownOpen,
    pendingAddIds,
    pendingRemoveIds,
    confirmKickId,
    existingMembers,
    filteredUsers,
    isInitialMembersPending,
    onQueryChange,
    closeDropdown,
    requestKick,
    cancelKick,
    handleUserSelect,
    handleUserRemove,
  } = useManageBoardUsersState({
    isOpen,
    membersData,
    isLoading,
    readOnly,
    addMember,
    removeMember,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
      if (!(event.target as HTMLElement)?.closest('[data-member-item="true"]')) {
        cancelKick();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cancelKick, closeDropdown, isOpen]);

  return (
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
            className={`${styles.form} relative`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-members-title"
          >
            <ModalCloseButton onClick={onClose} />

            <h2
              id="manage-members-title"
              className={`text-xl sm:text-2xl text-center ${styles.glitchText}`}
            >
              Board members
            </h2>

            {canManageMembers && (
              <div className="mt-4">
                <UserSearchDropdown
                  ref={dropdownRef}
                  query={query}
                  dropdownOpen={dropdownOpen}
                  users={filteredUsers}
                  onQueryChange={onQueryChange}
                  onSelect={handleUserSelect}
                  onClose={closeDropdown}
                />
              </div>
            )}

            <AnimatePresence initial={false}>
              {error ? (
                <motion.div
                  key="manage-members-error"
                  className="overflow-hidden"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p
                    className="text-sm text-gray-600 text-center"
                    role="alert"
                    aria-live="polite"
                  >
                    {error}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="mt-4">
              {isInitialMembersPending ? (
                <SkeletonMembers />
              ) : (
                <div className={styles.membersWrapper}>
                  <h3 className={styles.membersTitle}>Current members:</h3>

                  <div className={styles.membersList}>
                        <AnimatePresence>

                    {existingMembers.map((user) => {
                      const isYou = isSameUserIdentity(
                        user,
                        currentUsername,
                        currentEmail
                      );
                      const isOwnerMember = user.userId === ownerId;
                      const isPending = user.pendingAdd ? true : !user.isAccepted;
                      const isAdding = pendingAddIds.has(user.userId);
                      const isRemoving = pendingRemoveIds.has(user.userId);
                      const actionDisabled = isAdding || isRemoving || readOnly;
                      const showConfirm = !actionDisabled && confirmKickId === user.userId;
                      return (
                        <MemberRow
                          key={user.userId}
                          user={user}
                          isYou={isYou}
                          isOwnerMember={isOwnerMember}
                          isPending={isPending}
                          isAdding={isAdding}
                          actionDisabled={actionDisabled}
                          showConfirm={showConfirm}
                          canManageMembers={canManageMembers}
                          onRemove={() => handleUserRemove(user.userId)}
                          onRequestKick={() => requestKick(user.userId)}
                          onCancelKick={cancelKick}
                        />
                      );
                    })}
                        </AnimatePresence>

                  </div>
                </div>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
