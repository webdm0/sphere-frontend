"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import tooltipStyles from "./PortalTooltip.module.css";

type TooltipSide = "top" | "bottom";

type TooltipState = {
  left: number;
  top: number;
  text: string;
  side: TooltipSide;
  visible: boolean;
};

type ScopedTooltipContextValue = {
  hideTooltip: () => void;
  showTooltip: (
    target: HTMLElement,
    text: string,
    side?: TooltipSide
  ) => void;
};

const ScopedTooltipContext = createContext<ScopedTooltipContextValue | null>(
  null
);

export function ScopedTooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => {
      if (!prev || !prev.visible) return prev;
      return { ...prev, visible: false };
    });
  }, []);

  const showTooltip = useCallback(
    (target: HTMLElement, text: string, side: TooltipSide = "bottom") => {
      const rect = target.getBoundingClientRect();
      const gap = 8;

      setTooltip({
        left: Math.round(rect.left + rect.width / 2),
        top: Math.round(side === "bottom" ? rect.bottom + gap : rect.top - gap),
        text,
        side,
        visible: true,
      });
    },
    []
  );

  useEffect(() => {
    if (!tooltip?.visible) return;

    const handleViewportChange = () => {
      hideTooltip();
    };

    window.addEventListener("scroll", handleViewportChange, { capture: true });
    window.addEventListener("resize", handleViewportChange);

    return () => {
      window.removeEventListener("scroll", handleViewportChange, {
        capture: true,
      });
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [hideTooltip, tooltip?.visible]);

  const value = useMemo(
    () => ({
      hideTooltip,
      showTooltip,
    }),
    [hideTooltip, showTooltip]
  );

  return (
    <ScopedTooltipContext.Provider value={value}>
      {children}
      {mounted && tooltip ? (
        createPortal(
          <div
            className={tooltipStyles.tooltip}
            data-side={tooltip.side}
            data-show={tooltip.visible ? "true" : "false"}
            style={{
              top: tooltip.top,
              left: tooltip.left,
            }}
          >
            {tooltip.text}
          </div>,
          document.body
        )
      ) : null}
    </ScopedTooltipContext.Provider>
  );
}

export function useScopedTooltip() {
  const context = useContext(ScopedTooltipContext);
  if (!context) {
    throw new Error("useScopedTooltip must be used within ScopedTooltipProvider");
  }
  return context;
}

interface ScopedTooltipTriggerProps {
  text: string;
  children: React.ReactNode;
  side?: TooltipSide;
  className?: string;
}

export function ScopedTooltipTrigger({
  text,
  children,
  side = "bottom",
  className = "",
}: ScopedTooltipTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const { hideTooltip, showTooltip } = useScopedTooltip();

  return (
    <div
      ref={triggerRef}
      className={className}
      onMouseEnter={(event) => showTooltip(event.currentTarget, text, side)}
      onMouseLeave={hideTooltip}
      onFocus={(event) => showTooltip(event.currentTarget, text, side)}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && triggerRef.current?.contains(next)) return;
        hideTooltip();
      }}
      onMouseDown={hideTooltip}
    >
      {children}
    </div>
  );
}
