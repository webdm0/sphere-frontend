"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import RestorePopover from "@/components/boards/RestorePopover";
import boardStyles from "@/components/boards/SingleBoardView.module.css";
import formStyles from "@/components/common/form.module.css";
import { useRestorePopover } from "@/hooks/board/useRestorePopover";

const DEMO_POPOVER_TEXT = <>1-hour demo access. Limited features.</>;

interface AuthPageShellProps {
  children: ReactNode;
  onTryDemo: () => Promise<void>;
  isTryingDemo?: boolean;
}

export default function AuthPageShell({
  children,
  onTryDemo,
  isTryingDemo = false,
}: AuthPageShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const {
    popover,
    isVisible: popoverVisible,
    popoverRef,
    openPopover: openRestorePopover,
    closePopover: closeRestorePopover,
  } = useRestorePopover();
  const focusableSelector = useMemo(
    () =>
      [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        'input:not([disabled]):not([type="hidden"])',
        "select:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ].join(","),
    [],
  );

  useEffect(() => {
    if (!popoverVisible) return;
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const popoverEl = popoverRef.current;
      if (!popoverEl || !popoverEl.contains(event.target as Node)) return;

      const containerEl = shellRef.current;
      if (!containerEl) return;

      const nodes = Array.from(
        containerEl.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (!nodes.length) return;

      const trigger = popover?.trigger ?? null;
      const currentIndex = trigger ? nodes.indexOf(trigger) : -1;
      const startIndex =
        currentIndex === -1
          ? event.shiftKey
            ? nodes.length - 1
            : 0
          : currentIndex;
      const nextIndex = event.shiftKey
        ? startIndex <= 0
          ? nodes.length - 1
          : startIndex - 1
        : startIndex >= nodes.length - 1
          ? 0
          : startIndex + 1;

      event.preventDefault();
      closeRestorePopover({ returnFocus: false });
      nodes[nextIndex]?.focus({ preventScroll: true });
    };

    document.addEventListener("keydown", handleTab, true);
    return () => document.removeEventListener("keydown", handleTab, true);
  }, [
    closeRestorePopover,
    focusableSelector,
    popover?.trigger,
    popoverRef,
    popoverVisible,
  ]);

  return (
    <>
      <div ref={shellRef}>
        <div className="fixed inset-x-0 top-0 z-20 px-6 sm:px-12 py-4 sm:py-8 pointer-events-none">
          <div className="flex items-center justify-end">
            <button
              type="button"
              className={`${boardStyles.readOnlyRestoreText} focus-ring pointer-events-auto`}
              disabled={isTryingDemo}
              onClick={(event) => openRestorePopover(event.currentTarget)}
            >
              Try demo
            </button>
          </div>
        </div>

        {children}
      </div>
      {popover && (
        <RestorePopover
          rect={popover.rect}
          visible={popoverVisible}
          isRestoring={isTryingDemo}
          popoverRef={popoverRef}
          onRequestClose={closeRestorePopover}
          onConfirmRestore={async () => {
            try {
              await onTryDemo();
            } catch {
            }
          }}
          text={DEMO_POPOVER_TEXT}
          actionLabel="Try demo"
          actionClassName={isTryingDemo ? formStyles.buttonLoading : undefined}
          closeOnConfirm={false}
        />
      )}
    </>
  );
}
