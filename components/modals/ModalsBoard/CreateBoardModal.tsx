import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "@/components/common/form.module.css";
import { UserDto } from "@/types";
import { useModalDismiss } from "@/hooks/ui/useModalDismiss";
import { useBodyScrollLock } from "@/hooks/ui/useBodyScrollLock";
import { useUserSearchDropdown } from "@/hooks/user/useUserSearchDropdown";
import { useEscapeClose } from "@/hooks/ui/useEscapeClose";
import { useFocusTrap } from "@/hooks/ui/useFocusTrap";
import UserSearchDropdown from "@/components/modals/common/UserSearchDropdown";
import ModalCloseButton from "@/components/modals/common/ModalCloseButton";
import type { EntityId } from "@/types";

interface CreateBoardModalProps {
  create: (params: { title: string; userIds: EntityId[] }) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
  isDemo?: boolean;
  returnFocusOnClose?: boolean;
}

export default function CreateBoardModal({
  isOpen,
  onClose,
  create,
  isDemo = false,
  returnFocusOnClose = true,
}: CreateBoardModalProps) {
  const [name, setName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { modalRef, handleMouseDown, handleMouseUp } =
    useModalDismiss<HTMLDivElement>(onClose);
  const isMountedRef = useRef(true);
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

  const selectedUserIds = useMemo(
    () => new Set(selectedUsers.map((user) => user.id)),
    [selectedUsers]
  );
  const {
    query,
    dropdownOpen,
    filteredUsers,
    setQuery,
    closeDropdown,
    onQueryChange,
  } = useUserSearchDropdown({
    isOpen: isOpen && !isDemo,
    excludedIds: selectedUserIds,
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || isDemo) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeDropdown, isDemo, isOpen]);

  const handleUserSelect = (user: UserDto) => {
    setSelectedUsers((prev) => {
      if (prev.some((item) => item.id === user.id)) return prev;
      return [...prev, user];
    });
    setQuery("");
    closeDropdown();
  };

  const handleUserRemove = (id: EntityId) => {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!name.trim()) return;

    setLoading(true);

    const createPromise = create({
      title: name,
      userIds: isDemo ? [] : selectedUsers.map((u) => u.id),
    })
      .catch(() => undefined)
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
        }
      });

    setName("");
    setQuery("");
    setSelectedUsers([]);
    onClose();

    return createPromise;
  };

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-board-title"
          >
            <form onSubmit={handleSubmit} className={`${styles.form} relative`}>
              <ModalCloseButton onClick={onClose} />
              <h2
                id="create-board-title"
                className={`text-xl sm:text-2xl text-center ${styles.glitchText}`}
              >
                Create board
              </h2>
              <input
                type="text"
                placeholder="Board name"
                className={styles.input}
                value={name}
                minLength={1}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />

              <UserSearchDropdown
                ref={dropdownRef}
                query={query}
                dropdownOpen={isDemo ? false : dropdownOpen}
                users={isDemo ? [] : filteredUsers}
                onQueryChange={onQueryChange}
                onSelect={handleUserSelect}
                onClose={isDemo ? undefined : closeDropdown}
                placeholder={isDemo ? "Invites disabled" : undefined}
                disabled={isDemo}
              />
              {!isDemo && selectedUsers.length > 0 && (
                <div className={styles.userListWrapper}>
                  <div className={styles.userList}>
                    <AnimatePresence>
                      {selectedUsers.map((user) => (
                        <motion.span
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className={styles.userTag}
                        >
                          <span className={styles.name}>{user.username}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${user.username}`}
                            onClick={() => handleUserRemove(user.id)}
                            className="focus-ring"
                          >
                            <svg width="10" height="10" viewBox="0 0 12 12">
                              <path d="M3 3l6 6m0-6L3 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                            </svg>
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`${styles.button} w-full mt-4 focus-ring`}
                disabled={loading}
              >
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
