"use client";

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface SmoothHeightProps {
  children: React.ReactNode;
  className?: string;
  measureKey?: string;
}

export const SmoothHeight = ({
  children,
  className,
  measureKey,
}: SmoothHeightProps) => {
  const [height, setHeight] = useState<number | "auto">("auto");
  const [canAnimate, setCanAnimate] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const settleFrameRef = useRef<number | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const node = contentRef.current;
    if (!node) return;

    const nextHeight = node.scrollHeight;
    setHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const clearScheduledMeasures = useCallback(() => {
    if (settleFrameRef.current != null) {
      cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }

    if (settleTimeoutRef.current != null) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    measure();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextHeight =
          entry.target instanceof HTMLElement
            ? entry.target.scrollHeight
            : entry.contentRect.height;
        setHeight((prev) => (prev === nextHeight ? prev : nextHeight));
      }
    });

    resizeObserver.observe(node);

    const frame = requestAnimationFrame(() => {
      setCanAnimate(true);
    });

    return () => {
      clearScheduledMeasures();
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [clearScheduledMeasures, measure]);

  useLayoutEffect(() => {
    clearScheduledMeasures();
    measure();

    settleFrameRef.current = requestAnimationFrame(() => {
      settleFrameRef.current = null;
      measure();
    });

    settleTimeoutRef.current = window.setTimeout(() => {
      settleTimeoutRef.current = null;
      measure();
    }, 180);

    return () => {
      clearScheduledMeasures();
    };
  }, [clearScheduledMeasures, measure, measureKey]);

  return (
    <motion.div
      animate={{ height }}
      transition={{
        type: canAnimate ? "spring" : "tween",
        stiffness: 340,
        damping: 32,
        restDelta: 0.01,
        duration: canAnimate ? undefined : 0,
      }}
      style={{
        overflow: "hidden",
        minHeight: 0,
        flex: "0 0 auto",
        width: "100%",
        alignSelf: "stretch",
      }}
      className={className}
    >
      <div
        ref={contentRef}
        style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {children}
      </div>
    </motion.div>
  );
};
