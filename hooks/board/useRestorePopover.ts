"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useRestorePopover() {
  const [popover, setPopover] = useState<{
    rect: DOMRect;
    trigger?: HTMLElement;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const closePopover = useCallback((options: { returnFocus?: boolean } = {}) => {
    setIsVisible(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      setPopover(null);
    }, 180);
    const trigger = lastTriggerRef.current;
    lastTriggerRef.current = null;
    const shouldReturnFocus = options.returnFocus ?? true;
    if (shouldReturnFocus && trigger && trigger.isConnected) {
      trigger.focus({ preventScroll: true });
    }
  }, []);

  const openPopover = useCallback(
    (target: HTMLElement) => {
      if (popover) {
        closePopover();
        return;
      }
      const rect = target.getBoundingClientRect();
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      lastTriggerRef.current = target;
      setIsVisible(false);
      setPopover({ rect, trigger: target });
      requestAnimationFrame(() => setIsVisible(true));
    },
    [closePopover, popover]
  );

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      lastTriggerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!popover) return;
    const close = () => closePopover();
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [closePopover, popover]);

  useEffect(() => {
    if (!popover) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closePopover({ returnFocus: false });
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [closePopover, popover]);

  useEffect(() => {
    if (!popover) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePopover();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [closePopover, popover]);

  return {
    popover,
    isVisible,
    popoverRef,
    openPopover,
    closePopover,
  };
}
