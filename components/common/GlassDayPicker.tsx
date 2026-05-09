'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import 'react-day-picker/dist/style.css';
import styles from './GlassDayPicker.module.css';

interface Props {
  value?: string | null;
  onChange: (iso: string | null) => void;
  minDate?: Date;
  label?: string;
  placeholder?: string;
  align?: "left" | "right";
  disabled?: boolean;
  readOnly?: boolean;
}

export default function GlassDayPicker({
  value,
  onChange,
  minDate,
  label,
  placeholder = 'Select date',
  align,
  disabled = false,
  readOnly = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const popupId = useId();
  const isReadOnly = readOnly && !disabled;

  const selected = value ? parseISO(value) : undefined;

  const applyDayTabIndex = (preferred?: HTMLButtonElement | null) => {
    const container = popupRef.current;
    if (!container) return null;
    const dayButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".rdp-day_button")
    );
    dayButtons.forEach((btn) => {
      btn.tabIndex = -1;
    });
    const selectedBtn = container.querySelector<HTMLButtonElement>(
      ".rdp-day_selected .rdp-day_button"
    );
    const todayBtn = container.querySelector<HTMLButtonElement>(
      ".rdp-day_today .rdp-day_button"
    );
    const firstEnabled = dayButtons.find((btn) => !btn.disabled) ?? null;
    const target = preferred ?? selectedBtn ?? todayBtn ?? firstEnabled;
    if (target && !target.disabled) {
      target.tabIndex = 0;
    }
    const navButtons = container.querySelectorAll<HTMLButtonElement>(
      ".rdp-nav button"
    );
    navButtons.forEach((btn) => {
      btn.tabIndex = btn.disabled ? -1 : 0;
    });
    return target ?? null;
  };

  const closePopup = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const closeFromEscape = useCallback(() => {
    if (!openedByKeyboard) {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
    }
    closePopup(openedByKeyboard);
  }, [closePopup, openedByKeyboard]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closePopup();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [closePopup, open]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const container = popupRef.current;
      if (!container) return;
      const target = applyDayTabIndex();
      if (openedByKeyboard) {
        target?.focus();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open, value, openedByKeyboard]);

  const handleSelect = (d: Date | undefined) => {
    if (disabled || isReadOnly) return;
    if (!d) {
      onChange(null);
      closePopup(true);
      return;
    }
    onChange(format(d, "yyyy-MM-dd"));
    closePopup(true);
  };

  const display = selected ? format(selected, 'yyyy-MM-dd') : '';

  const toggleOpen = (byKeyboard = false) => {
    if (disabled) return;
    if (open) {
      closePopup();
      return;
    }
    setOpenedByKeyboard(byKeyboard);
    setShouldRender(true);
    setOpen(true);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpenedByKeyboard(true);
        setShouldRender(true);
        setOpen(true);
      }
    }
    if (event.key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      closeFromEscape();
    }
  };

  const handlePopupKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeFromEscape();
    }
  };

  return (
    <div
      className={`${styles.wrapper} ${disabled ? styles.disabled : ''} ${
        isReadOnly ? styles.readOnly : ''
      }`}
      ref={ref}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && ref.current?.contains(next)) return;
        closePopup();
      }}
    >
      {label && <div className={styles.label}>{label}</div>}

      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.active : ''}`}
        onClick={(event) => {
          toggleOpen(event.detail === 0);
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popupId}
        disabled={disabled}
        data-interactive="true"
        ref={triggerRef}
      >
        <span className={display ? styles.value : styles.placeholder}>
          {display || placeholder}
        </span>
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
            <path d="M14 22H10C6.23 22 4.34 22 3.17 20.83C2 19.66 2 17.77 2 14V12C2 8.23 2 6.34 3.17 5.17C4.34 4 6.23 4 10 4H14C17.77 4 19.66 4 20.83 5.17C22 6.34 22 8.23 22 12V14C22 17.77 22 19.66 20.83 20.83C20.18 21.48 19.3 21.77 18 21.9" />
            <path d="M7 4V2.5" />
            <path d="M17 4V2.5" />
            <path d="M21.5 9H10.75M2 9H5.875" />
          </svg>
        </span>
      </button>

      {shouldRender && !disabled && (
        <div
          className={`${styles.popup} ${
            align === "left" ? styles.alignLeft : styles.alignRight
          } ${isReadOnly ? styles.popupReadOnly : ""}`}
          id={popupId}
          role="dialog"
          aria-modal={open}
          aria-hidden={!open}
          data-state={open ? "open" : "closed"}
          onKeyDown={handlePopupKeyDown}
          onFocusCapture={(event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !target.classList.contains("rdp-day_button")) return;
            applyDayTabIndex(target as HTMLButtonElement);
          }}
          onMouseDown={(event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const focusable = target.closest(
              'button,[role="button"],[tabindex],a[href],input,select,textarea'
            );
            if (!focusable) {
              event.preventDefault();
            }
          }}
          ref={popupRef}
          onAnimationEnd={() => {
            if (!open) setShouldRender(false);
          }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => handleSelect(d)}
            fromDate={minDate}
            numberOfMonths={1}
            className="rdp-custom"
            onMonthChange={() => {
              requestAnimationFrame(() => {
                applyDayTabIndex();
              });
            }}
          />
          <div className={styles.popupActions}>
            <button
              className={styles.clearBtn}
              disabled={isReadOnly}
              onClick={() => {
                if (isReadOnly) return;
                onChange(null);
                closePopup(true);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
