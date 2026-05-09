"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "@/components/boards/SingleBoardView.module.css";

interface RestorePopoverProps {
  rect: DOMRect;
  visible: boolean;
  isRestoring: boolean;
  popoverRef: MutableRefObject<HTMLDivElement | null>;
  onRequestClose: () => void;
  onConfirmRestore: () => void;
  text?: ReactNode;
  actionLabel?: string;
  actionClassName?: string;
  closeOnConfirm?: boolean;
}

export default function RestorePopover({
  rect,
  visible,
  isRestoring,
  popoverRef,
  onRequestClose,
  onConfirmRestore,
  text = "This board will be restored.",
  actionLabel = "Restore board",
  actionClassName,
  closeOnConfirm = true,
}: RestorePopoverProps) {
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const popoverWidth = 200;
  const viewportGap = 8;
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : rect.right;
  const isTinyViewport = viewportWidth <= 329;
  const clampedPopoverWidth = Math.min(
    popoverWidth,
    Math.max(1, viewportWidth - viewportGap * 2)
  );
  const minRightAnchor = popoverWidth + viewportGap;
  const maxRightAnchor = Math.max(minRightAnchor, viewportWidth - viewportGap);
  const safeRightAnchor = Math.min(
    Math.max(rect.right, minRightAnchor),
    maxRightAnchor
  );
  const triggerCenter = rect.left + rect.width / 2;
  const halfPopover = clampedPopoverWidth / 2;
  const minCenterAnchor = halfPopover + viewportGap;
  const maxCenterAnchor = Math.max(
    minCenterAnchor,
    viewportWidth - halfPopover - viewportGap
  );
  const safeCenterAnchor = Math.min(
    Math.max(triggerCenter, minCenterAnchor),
    maxCenterAnchor
  );
  const safeAnchorLeft = isTinyViewport ? safeCenterAnchor : safeRightAnchor;

  useEffect(() => {
    if (!visible) return;
    actionRef.current?.focus({ preventScroll: true });
  }, [visible]);

  return createPortal(
    <div
      ref={popoverRef}
      className={`${styles.restorePopover} ${
        visible ? styles.restorePopoverOpen : ""
      }`}
      style={{
        top: rect.bottom + 8,
        left: safeAnchorLeft,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={styles.restorePopoverText}>{text}</div>
      <button
        ref={actionRef}
        type="button"
        className={`${styles.restorePopoverAction} ${actionClassName ?? ""} focus-ring`}
        aria-label={actionLabel}
        onClick={(e) => {
          e.stopPropagation();
          if (closeOnConfirm) {
            onRequestClose();
          }
          onConfirmRestore();
        }}
        disabled={isRestoring}
      ></button>
    </div>,
    document.body
  );
}
