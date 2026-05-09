"use client";
import { useState, useRef, useEffect, useId, useCallback, useMemo } from "react";
import type { KeyboardEvent } from "react";
import styles from "./GlassSelect.module.css";

export interface GlassSelectOption {
  value: string | number;
  label: string;
}

interface GlassSelectProps {
  options: GlassSelectOption[];
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export default function GlassSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  readOnly = false,
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const isReadOnly = readOnly && !disabled;
  const optionIdBase = `${listboxId}-option`;

  const closeDropdown = useCallback((returnFocus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const closeFromEscape = useCallback(() => {
    if (!openedByKeyboard) {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
    }
    closeDropdown(openedByKeyboard);
  }, [closeDropdown, openedByKeyboard]);

  const focusOptionAt = useCallback(
    (index: number) => {
      const el = document.getElementById(
        `${optionIdBase}-${index}`
      ) as HTMLButtonElement | null;
      el?.focus({ preventScroll: true });
    },
    [optionIdBase]
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDropdown, open]);

  const current = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );
  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!open) return;
    if (options.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
    if (openedByKeyboard) {
      requestAnimationFrame(() => {
        focusOptionAt(nextIndex);
      });
    }
  }, [open, options.length, selectedIndex, openedByKeyboard, focusOptionAt]);

  useEffect(() => {
    if (!open) return;
    if (activeIndex < 0) return;
    if (!openedByKeyboard) return;
    const raf = requestAnimationFrame(() => {
      focusOptionAt(activeIndex);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeIndex, focusOptionAt, open, openedByKeyboard]);

  const openDropdown = (byKeyboard = false) => {
    if (disabled) return;
    setOpenedByKeyboard(byKeyboard);
    setShouldRender(true);
    setOpen(true);
  };

  const toggleOpen = (byKeyboard = false) => {
    if (disabled) return;
    if (open) {
      closeDropdown();
      return;
    }
    openDropdown(byKeyboard);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeFromEscape();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openDropdown(true);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      openDropdown(true);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleOpen(true);
    }
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    if (event.currentTarget !== event.target) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeFromEscape();
      return;
    }
    if (options.length === 0) return;

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next =
            prev < 0
              ? 0
              : (prev + 1) % options.length;
          requestAnimationFrame(() => focusOptionAt(next));
          return next;
        });
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next =
            prev < 0
              ? options.length - 1
              : (prev - 1 + options.length) % options.length;
          requestAnimationFrame(() => focusOptionAt(next));
          return next;
        });
        break;
      }
      case "Home": {
        event.preventDefault();
        setActiveIndex(0);
        requestAnimationFrame(() => focusOptionAt(0));
        break;
      }
      case "End": {
        event.preventDefault();
        const lastIndex = options.length - 1;
        setActiveIndex(lastIndex);
        requestAnimationFrame(() => focusOptionAt(lastIndex));
        break;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        if (isReadOnly) return;
        const opt = options[activeIndex];
        if (!opt) return;
        onChange(opt.value);
        closeDropdown(true);
        break;
      }
      default:
        break;
    }
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (!open) return;
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        event.stopPropagation();
        const next = (index + 1) % options.length;
        setActiveIndex(next);
        focusOptionAt(next);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        event.stopPropagation();
        const next = (index - 1 + options.length) % options.length;
        setActiveIndex(next);
        focusOptionAt(next);
        break;
      }
      case "Home": {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex(0);
        focusOptionAt(0);
        break;
      }
      case "End": {
        event.preventDefault();
        event.stopPropagation();
        const lastIndex = options.length - 1;
        setActiveIndex(lastIndex);
        focusOptionAt(lastIndex);
        break;
      }
      case "Escape": {
        event.preventDefault();
        event.stopPropagation();
        closeFromEscape();
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      className={`${styles.wrapper} ${disabled ? styles.disabled : ""} ${
        isReadOnly ? styles.readOnly : ""
      }`}
      ref={ref}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && ref.current?.contains(next)) return;
        closeDropdown();
      }}
    >
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.active : ""}`}
        onClick={(event) => {
          toggleOpen(event.detail === 0);
        }}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        data-interactive="true"
      >
        {current ? current.label : placeholder}
        <span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19.5L17 14.5L12 13L7 14.5L12 19.5ZM12 9.5C12 7.833 11 4.5 7 4.5" />
          </svg>
        </span>
      </button>

      {shouldRender && !disabled && (
        <div
          className={styles.dropdown}
          data-state={open ? "open" : "closed"}
          aria-hidden={!open}
          id={listboxId}
          role="listbox"
          ref={listboxRef}
          tabIndex={-1}
          onKeyDown={handleListboxKeyDown}
          onMouseLeave={() => {
            setActiveIndex(selectedIndex >= 0 ? selectedIndex : -1);
          }}
          onAnimationEnd={() => {
            if (!open) setShouldRender(false);
          }}
        >
          {options.map((opt, index) => (
            <button
              key={opt.value}
              id={`${optionIdBase}-${index}`}
              className={`${styles.option} ${
                opt.value === value ? styles.selected : ""
              } ${index === activeIndex ? styles.optionActive : ""} ${
                isReadOnly ? styles.optionReadOnly : ""
              }`}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              tabIndex={open && index === activeIndex ? 0 : -1}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onMouseEnter={() => {
                setActiveIndex(index);
              }}
              onClick={() => {
                if (isReadOnly) return;
                onChange(opt.value);
                closeDropdown(true);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
