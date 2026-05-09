import { useEffect } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
  "[contenteditable=\"true\"]",
].join(",");

type FocusTrapOptions = {
  initialFocus?: "first" | "container" | "none";
  shouldReturnFocus?: boolean;
};

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  isActive: boolean,
  options: FocusTrapOptions = {}
) {
  const initialFocus = options.initialFocus ?? "first";
  const shouldReturnFocus = options.shouldReturnFocus ?? true;

  useEffect(() => {
    if (!isActive) return;
    if (typeof document === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    const focusContainer = () => {
      const hadTabIndex = container.hasAttribute("tabindex");
      if (!hadTabIndex) container.setAttribute("tabindex", "-1");
      container.focus({ preventScroll: true });
      if (!hadTabIndex) container.removeAttribute("tabindex");
    };

    if (initialFocus === "first" && focusable.length > 0) {
      focusable[0].focus({ preventScroll: true });
    } else if (initialFocus === "first" && focusable.length === 0) {
      focusContainer();
    } else if (initialFocus === "container") {
      focusContainer();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const current = document.activeElement as HTMLElement | null;
      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (nodes.length === 0) {
        event.preventDefault();
        focusContainer();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey) {
        if (!current || current === first || !container.contains(current)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (!current || current === last || !container.contains(current)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (shouldReturnFocus && previouslyFocused) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [containerRef, initialFocus, isActive, shouldReturnFocus]);
}
