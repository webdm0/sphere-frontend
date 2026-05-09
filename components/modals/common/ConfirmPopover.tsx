"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { createPortal } from "react-dom";

interface ConfirmPopoverProps {
  rect: DOMRect;
  visible: boolean;
  popoverRef: MutableRefObject<HTMLDivElement | null>;
  text: string;
  actionLabel?: string;
  className?: string;
  openClassName?: string;
  textClassName?: string;
  actionClassName?: string;
  onConfirm: () => void;
  onRequestClose: () => void;
}

export default function ConfirmPopover({
  rect,
  visible,
  popoverRef,
  text,
  actionLabel,
  className,
  openClassName,
  textClassName,
  actionClassName,
  onConfirm,
  onRequestClose,
}: ConfirmPopoverProps) {
  const actionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    actionRef.current?.focus({ preventScroll: true });
  }, [visible]);

  return createPortal(
    <div
      ref={popoverRef}
      className={`${className ?? ""} ${visible ? openClassName ?? "" : ""}`}
      style={{
        top: rect.bottom + 8,
        left: rect.right,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={textClassName}>{text}</div>
      <button
        ref={actionRef}
        type="button"
        className={actionClassName}
        aria-label={actionLabel ?? text}
        onClick={(e) => {
          e.stopPropagation();
          onRequestClose();
          onConfirm();
        }}
      ></button>
    </div>,
    document.body
  );
}
