"use client";

import styles from "@/components/boards/BoardsList.module.css";
import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { ApiBoardListItem, UiBoardListItem } from "@/types";
import type { useBoardModals } from "@/hooks/board/useBoardModals";
import type { EntityId } from "@/types";

type BoardModals = ReturnType<typeof useBoardModals>;

interface BoardCardMenuProps {
  board: UiBoardListItem;
  modals: BoardModals;
  confirmAction: "close" | "leave" | null;
  setConfirmAction: (value: "close" | "leave" | null) => void;
  archiveClosedBoard: (board: ApiBoardListItem) => Promise<void>;
  leave: (id: EntityId) => Promise<unknown>;
}

export default function BoardCardMenu({
  board,
  modals,
  confirmAction,
  setConfirmAction,
  archiveClosedBoard,
  leave,
}: BoardCardMenuProps) {
  const menuWrapperRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleMenuItemKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  const getMenuItems = useCallback(() => {
    return (
      menuRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? []
    );
  }, []);

  const focusFirstItem = useCallback(() => {
    const items = getMenuItems();
    if (items.length === 0) return;
    items[0]?.focus();
  }, [getMenuItems]);

  const focusLastItem = useCallback(() => {
    const items = getMenuItems();
    if (items.length === 0) return;
    items[items.length - 1]?.focus();
  }, [getMenuItems]);

  const isMenuOpen = useCallback(() => {
    return menuRef.current?.classList.contains(styles.menuOpen) ?? false;
  }, []);

  const openMenu = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return;
    menu.classList.add(styles.menuOpen);
    requestAnimationFrame(() => focusFirstItem());
  }, [focusFirstItem]);

  const closeMenu = useCallback(
    (returnFocus = false) => {
      const menu = menuRef.current;
      if (!menu) return;
      menu.classList.remove(styles.menuOpen);
      setConfirmAction(null);
      if (returnFocus) {
        menuBtnRef.current?.focus();
      }
    },
    [setConfirmAction]
  );

  useEffect(() => {
    if (!isMenuOpen()) return;
    requestAnimationFrame(() => focusFirstItem());
  }, [confirmAction, focusFirstItem, isMenuOpen]);

  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!isMenuOpen()) return;
      const items = getMenuItems();
      if (items.length === 0) return;
      const currentIndex = Array.from(items).findIndex(
        (item) => item === document.activeElement
      );

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
          items[nextIndex]?.focus();
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
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
          closeMenu(true);
          break;
        }
        case "Tab": {
          closeMenu(false);
          break;
        }
        default:
          break;
      }
    },
    [closeMenu, getMenuItems, isMenuOpen]
  );

  return (
    <div
      className={styles.menuWrapper}
      ref={menuWrapperRef}
      onKeyDownCapture={handleMenuKeyDown}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && menuWrapperRef.current?.contains(next)) return;
        closeMenu(false);
      }}
    >
      <button
        ref={menuBtnRef}
        type="button"
        aria-label="Open board actions"
        className={`${styles.menuBtn} focus-ring`}
        onClick={(e) => {
          e.stopPropagation();
          modals.select(board);
          if (isMenuOpen()) {
            closeMenu(false);
          } else {
            openMenu();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            if (isMenuOpen()) {
              event.preventDefault();
              closeMenu(true);
            }
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu();
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
            requestAnimationFrame(() => focusLastItem());
          }
        }}
      >
        ⋯
      </button>
      <div
        id={`menu-${board.id}`}
        ref={menuRef}
        className={styles.menu}
        role="menu"
        aria-hidden={!isMenuOpen()}
      >
        {confirmAction === "close" ? (
          <>
            <div
              onClick={async (e) => {
                e.stopPropagation();
                await archiveClosedBoard(board);
                setConfirmAction(null);
              }}
              className={`${styles.menuItem} focus-ring`}
              role="menuitem"
              tabIndex={-1}
              data-menu-item
              onKeyDown={handleMenuItemKeyDown}
            >
              Confirm Close
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction(null);
              }}
              className={`${styles.menuItem} focus-ring`}
              role="menuitem"
              tabIndex={-1}
              data-menu-item
              onKeyDown={handleMenuItemKeyDown}
            >
              Cancel
            </div>
          </>
        ) : confirmAction === "leave" ? (
          <>
            <div
              onClick={async (e) => {
                e.stopPropagation();
                await leave(board.id);
                setConfirmAction(null);
              }}
              className={`${styles.menuItem} focus-ring`}
              role="menuitem"
              tabIndex={-1}
              data-menu-item
              onKeyDown={handleMenuItemKeyDown}
            >
              Confirm Leave
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction(null);
              }}
              className={`${styles.menuItem} focus-ring`}
              role="menuitem"
              tabIndex={-1}
              data-menu-item
              onKeyDown={handleMenuItemKeyDown}
            >
              Cancel
            </div>
          </>
        ) : (
          <>
            {board.isMine && (
              <>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    modals.select(board);
                    modals.openEdit();
                    closeMenu(false);
                  }}
                  className={`${styles.menuItem} focus-ring`}
                  role="menuitem"
                  tabIndex={-1}
                  data-menu-item
                  onKeyDown={handleMenuItemKeyDown}
                >
                  Rename
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmAction("close");
                  }}
                  className={`${styles.menuItem} focus-ring`}
                  role="menuitem"
                  tabIndex={-1}
                  data-menu-item
                  onKeyDown={handleMenuItemKeyDown}
                >
                  Close
                </div>
              </>
            )}
            {!board.isMine && (
              <div
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction("leave");
              }}
              className={`${styles.menuItem} focus-ring`}
              role="menuitem"
              tabIndex={-1}
              data-menu-item
              onKeyDown={handleMenuItemKeyDown}
              >
                Leave
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
