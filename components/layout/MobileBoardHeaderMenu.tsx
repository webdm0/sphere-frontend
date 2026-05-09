"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import EyeIcon from "@/components/icons/EyeIcon";
import ArchiveIcon from "@/components/icons/ArchiveIcon";
import MembersIcon from "@/components/icons/MembersIcon";
import styles from "@/components/layout/MobileBoardHeaderMenu.module.css";

interface MobileBoardHeaderMenuProps {
  user: { username: string; email: string };
  showMyCards: boolean;
  onToggleMyCards?: () => void;
  onOpenArchive?: () => void;
  onOpenArchiveKeyboard?: () => void;
  onAddUsers: () => void;
  onAddUsersKeyboard?: () => void;
  onLogout: () => void;
}

export default function MobileBoardHeaderMenu({
  user,
  showMyCards,
  onToggleMyCards,
  onOpenArchive,
  onOpenArchiveKeyboard,
  onAddUsers,
  onAddUsersKeyboard,
  onLogout,
}: MobileBoardHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; right: number }>({
    top: 0,
    right: 16,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const syncPanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPanelPosition({
      top: Math.round(rect.bottom + 8),
      right: Math.max(8, Math.round(window.innerWidth - rect.right)),
    });
  }, []);

  const closeMenu = useCallback(
    (returnFocus = false) => {
      setIsOpen(false);
      if (!returnFocus) return;

      if (openedByKeyboard) {
        triggerRef.current?.focus({ preventScroll: true });
      } else {
        triggerRef.current?.blur();
      }
    },
    [openedByKeyboard]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenu(true);
    };

    syncPanelPosition();
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", syncPanelPosition);
    window.addEventListener("scroll", syncPanelPosition, true);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", syncPanelPosition);
      window.removeEventListener("scroll", syncPanelPosition, true);
    };
  }, [closeMenu, isOpen, syncPanelPosition]);

  useEffect(() => {
    if (!isOpen) return;
    if (!openedByKeyboard) return;

    const firstAction = menuRef.current?.querySelector<HTMLElement>(
      '[data-mobile-item="true"]'
    );
    firstAction?.focus({ preventScroll: true });
  }, [isOpen, openedByKeyboard]);

  const openMembers = (byKeyboard: boolean) => {
    closeMenu(false);
    if (byKeyboard) {
      onAddUsersKeyboard?.();
      return;
    }
    onAddUsers();
  };

  const openArchive = (byKeyboard: boolean) => {
    closeMenu(false);
    if (byKeyboard) {
      onOpenArchiveKeyboard?.();
      return;
    }
    onOpenArchive?.();
  };

  const toggleMyCards = () => {
    closeMenu(false);
    onToggleMyCards?.();
  };

  const logout = () => {
    closeMenu(false);
    onLogout();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open header menu"
        aria-expanded={isOpen}
        aria-controls="mobile-header-menu"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""} focus-ring`}
        onClick={(event) => {
          const byKeyboard = event.detail === 0;
          setOpenedByKeyboard(byKeyboard);
          setIsOpen((prev) => {
            const next = !prev;
            if (next) syncPanelPosition();
            return next;
          });
        }}
      >
        <span className={styles.triggerLine} />
        <span className={styles.triggerLine} />
      </button>

      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ""}`}
        onClick={() => closeMenu(true)}
      />

      <div
        id="mobile-header-menu"
        ref={menuRef}
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}
        style={{
          top: `${panelPosition.top}px`,
          right: `${panelPosition.right}px`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Header menu"
      >
        <div className={styles.profile}>
          <p className={styles.username}>{user.username}</p>
          <p className={styles.email}>
            {user.email}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            data-mobile-item="true"
            className={`${styles.menuItem} focus-ring`}
            onClick={toggleMyCards}
          >
            <EyeIcon size={14} color={showMyCards ? "var(--text-strong)" : "var(--text-secondary)"} />
            <span>{showMyCards ? "Showing my cards" : "Show my cards"}</span>
          </button>

          <button
            type="button"
            data-mobile-item="true"
            className={`${styles.menuItem} focus-ring`}
            onClick={(event) => {
              openArchive(event.detail === 0);
            }}
          >
            <ArchiveIcon size={14} color="var(--text-secondary)" />
            <span>Archive</span>
          </button>

          <button
            type="button"
            data-mobile-item="true"
            className={`${styles.menuItem} focus-ring`}
            onClick={(event) => {
              openMembers(event.detail === 0);
            }}
          >
            <MembersIcon size={14} color="var(--text-secondary)" />
            <span>View members</span>
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.actions}>
          <Link
            href="/"
            data-mobile-item="true"
            className={`${styles.menuItem} focus-ring`}
            onClick={() => closeMenu(false)}
          >
            <span>Landing page</span>
          </Link>

          <button
            type="button"
            data-mobile-item="true"
            className={`${styles.menuItem} focus-ring`}
            onClick={logout}
          >
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
