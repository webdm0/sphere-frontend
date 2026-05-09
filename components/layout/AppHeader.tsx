"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback, useId } from "react";
import styles from "@/components/layout/headerDropdown.module.css";

interface AppHeaderProps {
  user: { username: string; email: string };
  onLogout: () => void;
}

export default function AppHeader({ user, onLogout }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownId = useId();

  const closeDropdown = useCallback((returnFocus = false) => {
    if (returnFocus) {
      if (openedByKeyboard) {
        triggerRef.current?.focus({ preventScroll: true });
      } else {
        triggerRef.current?.blur();
      }
    } else {
      triggerRef.current?.blur();
    }
    setOpen(false);
  }, [openedByKeyboard]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeDropdown, open]);

  useEffect(() => {
    if (!open) return;
    if (!openedByKeyboard) return;
    const items = dropdownRef.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]'
    );
    if (!items || items.length === 0) return;
    requestAnimationFrame(() => items[0]?.focus());
  }, [open, openedByKeyboard]);

  const [localPart, ...domainParts] = user.email.split("@");
  const domainPart = domainParts.join("@");
  const hasDomainPart = domainPart.length > 0;
  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open) return;
      const items = dropdownRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]'
      );
      if (!items || items.length === 0) return;
      const currentIndex = Array.from(items).findIndex(
        (item) => item === document.activeElement
      );

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          setOpenedByKeyboard(true);
          const nextIndex =
            currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
          items[nextIndex]?.focus();
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          setOpenedByKeyboard(true);
          const nextIndex =
            currentIndex === -1
              ? items.length - 1
              : (currentIndex - 1 + items.length) % items.length;
          items[nextIndex]?.focus();
          break;
        }
        case "Home": {
          event.preventDefault();
          items[0]?.focus();
          break;
        }
        case "End": {
          event.preventDefault();
          items[items.length - 1]?.focus();
          break;
        }
        case "Escape": {
          event.preventDefault();
          closeDropdown(true);
          break;
        }
        default:
          break;
      }
    },
    [closeDropdown, open]
  );

  return (
    <header className="flex justify-end">
      <div
        className="relative"
        ref={dropdownRef}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && dropdownRef.current?.contains(next)) return;
          closeDropdown();
        }}
      >
        <button
          onClick={(e) => {
            setOpenedByKeyboard(e.detail === 0);
            setOpen((prev) => !prev);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              if (open) closeDropdown(true);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpenedByKeyboard(true);
              setOpen(true);
              requestAnimationFrame(() => {
                const firstItem = dropdownRef.current?.querySelector<HTMLElement>(
                  '[role="menuitem"]'
                );
                firstItem?.focus();
              });
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpenedByKeyboard(true);
              setOpen(true);
              requestAnimationFrame(() => {
                const items = dropdownRef.current?.querySelectorAll<HTMLElement>(
                  '[role="menuitem"]'
                );
                if (!items || items.length === 0) return;
                items[items.length - 1]?.focus();
              });
            }
          }}
          className={`${styles.avatarButton} focus-ring w-9 h-9 rounded-full 
             bg-[var(--bg-panel)] text-xs 
             border border-[var(--border-soft)]
             shadow-sm
             flex items-center justify-center`}
          data-interactive="true"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={dropdownId}
          ref={triggerRef}
        >
          {user.username[0]}
        </button>

        <div
          id={dropdownId}
          role="menu"
          aria-hidden={!open}
          className={`${styles.dropdown} ${open ? styles.menuOpen : ""}`}
          onKeyDown={handleMenuKeyDown}
        >
          <div className={styles.dropdownHeader}>
            <p className={styles.username}>{user.username}</p>
            <p className={styles.email}>
              {hasDomainPart ? (
                <>
                  <span className={styles.emailLocal}>{localPart}</span>
                  <span className={styles.emailDomain}>@{domainPart}</span>
                </>
              ) : (
                user.email
              )}
            </p>

          </div>
          <Link
            href="/"
            onClick={() => closeDropdown(false)}
            className={`${styles.dropdownItem} focus-ring`}
            data-interactive="true"
            role="menuitem"
            tabIndex={-1}
          >
            Homepage
          </Link>
          <button
            onClick={onLogout}
            className={`${styles.dropdownItem} focus-ring`}
            data-interactive="true"
            role="menuitem"
            tabIndex={-1}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
