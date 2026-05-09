import { useCallback, useEffect, useRef, useState } from "react";

interface ConfirmPopoverState<T> {
  rect: DOMRect;
  data: T;
  key?: string;
  trigger?: HTMLElement;
}

type CloseOptions = { returnFocus?: boolean };

export function useConfirmPopover<T>() {
  const [popover, setPopover] = useState<ConfirmPopoverState<T> | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const lastTabIndexRef = useRef<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const restoreTrigger = () => {
    const trigger = lastTriggerRef.current;
    if (!trigger) return;
    if (lastTabIndexRef.current === null) {
      trigger.removeAttribute("tabindex");
    } else {
      trigger.setAttribute("tabindex", lastTabIndexRef.current);
    }
    lastTriggerRef.current = null;
    lastTabIndexRef.current = null;
  };

  const closePopover = useCallback((options: CloseOptions = {}) => {
    setIsVisible(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      setPopover(null);
    }, 180);
    const trigger = lastTriggerRef.current;
    restoreTrigger();
    const shouldReturnFocus = options.returnFocus ?? true;
    if (shouldReturnFocus && trigger && trigger.isConnected) {
      trigger.focus({ preventScroll: true });
    }
  }, []);

  const openPopover = useCallback(
    (data: T, target: HTMLElement, key?: string) => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (popover && key && popover.key === key) {
        closePopover();
        return;
      }
      const rect = target.getBoundingClientRect();
      lastTriggerRef.current = target;
      lastTabIndexRef.current = target.getAttribute("tabindex");
      target.setAttribute("tabindex", "-1");
      setIsVisible(false);
      setPopover({ rect, data, key, trigger: target });
      requestAnimationFrame(() => setIsVisible(true));
    },
    [closePopover, popover]
  );

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      restoreTrigger();
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
