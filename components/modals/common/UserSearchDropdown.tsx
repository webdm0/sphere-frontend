"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useRef,
} from "react";
import type { UserDto } from "@/types";
import styles from "@/components/common/form.module.css";

const FOCUSABLE_SELECTOR = [
  "a[href]:not([tabindex=\"-1\"])",
  "button:not([disabled]):not([tabindex=\"-1\"])",
  "textarea:not([disabled]):not([tabindex=\"-1\"])",
  "input:not([disabled]):not([type=\"hidden\"]):not([tabindex=\"-1\"])",
  "select:not([disabled]):not([tabindex=\"-1\"])",
  "[tabindex]:not([tabindex=\"-1\"])",
  "[contenteditable=\"true\"]:not([tabindex=\"-1\"])",
].join(",");

interface UserSearchDropdownProps {
  query: string;
  dropdownOpen: boolean;
  users: UserDto[];
  onQueryChange: (value: string) => void;
  onSelect: (user: UserDto) => void;
  onClose?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const UserSearchDropdown = forwardRef<HTMLDivElement, UserSearchDropdownProps>(
  (
    {
      query,
      dropdownOpen,
      users,
      onQueryChange,
      onSelect,
      onClose,
      placeholder = "Add user by username",
      disabled = false,
    },
    ref
  ) => {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    const setRootRef = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    const getOptions = useCallback(() => {
      return (
        listRef.current?.querySelectorAll<HTMLElement>("[data-option]") ?? []
      );
    }, []);

    const focusOptionAt = useCallback(
      (index: number) => {
        const options = getOptions();
        if (options.length === 0) return;
        const targetIndex = Math.max(0, Math.min(index, options.length - 1));
        options[targetIndex]?.focus();
      },
      [getOptions]
    );

    const focusFirstOption = useCallback(() => {
      focusOptionAt(0);
    }, [focusOptionAt]);

    const focusLastOption = useCallback(() => {
      const options = getOptions();
      if (options.length === 0) return;
      focusOptionAt(options.length - 1);
    }, [focusOptionAt, getOptions]);

    const focusNextFromInput = useCallback(
      (shiftKey: boolean) => {
        const container =
          rootRef.current?.closest('[role="dialog"]') ??
          rootRef.current?.closest("form");
        if (!container || !inputRef.current) return;
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusables.length === 0) return;
        const inputIndex = focusables.indexOf(inputRef.current);
        if (inputIndex === -1) return;
        const nextIndex = shiftKey
          ? inputIndex <= 0
            ? focusables.length - 1
            : inputIndex - 1
          : inputIndex >= focusables.length - 1
            ? 0
            : inputIndex + 1;
        focusables[nextIndex]?.focus();
      },
      []
    );

    return (
      <div
        className="relative"
        ref={setRootRef}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && rootRef.current?.contains(next)) return;
          onClose?.();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className={styles.input}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const exactMatch = users.find(
              (u) => u.username.toLowerCase() === query.toLowerCase()
            );
            if (exactMatch) {
              onSelect(exactMatch);
            }
          }}
          onKeyDownCapture={(e) => {
            if (!dropdownOpen) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              focusFirstOption();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              focusLastOption();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose?.();
            }
          }}
          disabled={disabled}
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls={dropdownOpen ? listId : undefined}
        />

        {dropdownOpen && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className={`${styles.dropdownList} absolute top-full mt-1 left-0 w-full z-10 max-h-48 overflow-y-auto`}
            onKeyDown={(e) => {
              const options = getOptions();
              if (options.length === 0) return;
              const currentIndex = Array.from(options).findIndex(
                (item) => item === document.activeElement
              );

              switch (e.key) {
                case "ArrowDown": {
                  e.preventDefault();
                  const nextIndex =
                    currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;
                  focusOptionAt(nextIndex);
                  break;
                }
                case "ArrowUp": {
                  e.preventDefault();
                  const nextIndex =
                    currentIndex === -1
                      ? options.length - 1
                      : (currentIndex - 1 + options.length) % options.length;
                  focusOptionAt(nextIndex);
                  break;
                }
                case "Home": {
                  e.preventDefault();
                  focusOptionAt(0);
                  break;
                }
                case "End": {
                  e.preventDefault();
                  focusOptionAt(options.length - 1);
                  break;
                }
                case "Escape": {
                  e.preventDefault();
                  onClose?.();
                  inputRef.current?.focus();
                  break;
                }
                case "Tab": {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose?.();
                  focusNextFromInput(e.shiftKey);
                  break;
                }
                default:
                  break;
              }
            }}
          >
            {users.map((user) => (
              <li
                key={user.id}
                className={styles.dropdownItem}
            onClick={() => {
              onSelect(user);
              inputRef.current?.focus({ preventScroll: true });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(user);
                inputRef.current?.focus({ preventScroll: true });
              }
            }}
                role="option"
                aria-selected={false}
                tabIndex={-1}
                data-option
              >
                {user.username}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

UserSearchDropdown.displayName = "UserSearchDropdown";

export default UserSearchDropdown;
