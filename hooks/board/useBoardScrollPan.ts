"use client";

import { useEffect, useRef } from "react";

export function useBoardScrollPan(isLoading: boolean) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let isDown = false,
      startX = 0,
      scrollLeft = 0,
      frame: number | null = null;

    const isBlockedTarget = (target: HTMLElement) => {
      return Boolean(
        target.closest("[data-card='true']") ||
          target.closest("[data-card-drag-handle='true']") ||
          target.closest("[data-pan-block='true']") ||
          target.closest("[data-role='column-header']") ||
          target.closest("[data-interactive='true']") ||
          target.closest(
            "input, textarea, select, button, [contenteditable='true']"
          )
      );
    };

    const start = (clientX: number, target: HTMLElement) => {
      if (!(target instanceof HTMLElement)) return;
      if (isBlockedTarget(target)) return;
      isDown = true;
      startX = clientX;
      scrollLeft = el.scrollLeft;
    };

    const move = (clientX: number) => {
      if (!isDown) return;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        el.scrollLeft = scrollLeft - (clientX - startX);
      });
    };

    const end = () => {
      isDown = false;
      if (frame) cancelAnimationFrame(frame);
      frame = null;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!(e.target instanceof HTMLElement)) return;
      start(e.clientX, e.target);
      if (isDown) e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (e.buttons === 0) {
        end();
        return;
      }
      move(e.clientX);
    };
    const onMouseUp = () => end();

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      end();
    };
  }, [isLoading]);

  return scrollRef;
}
