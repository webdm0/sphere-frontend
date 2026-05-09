"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./PortalTooltip.module.css";

interface PortalTooltipProps {
  text: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

export default function PortalTooltip({
  text,
  children,
  side = "bottom",
  className = "",
}: PortalTooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [renderedText, setRenderedText] = useState(text);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateTooltipPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    const gap = 8;

    let top = 0;
    const left = rect.left + rect.width / 2;

    if (side === "bottom") {
      top = rect.bottom + gap;
    } else {
      top = rect.top - gap;
    }

    setCoords({ top: Math.round(top), left: Math.round(left) });
  }, [side]);

  const showTooltip = () => {
    updateTooltipPosition();
    setShow(true);
  };

  const hideTooltip = () => {
    setShow(false);
  };

  useEffect(() => {
    if (show) {
      const handleScroll = () => setShow(false);
      window.addEventListener("scroll", handleScroll, { capture: true });
      return () => window.removeEventListener("scroll", handleScroll, { capture: true });
    }
  }, [show]);

  const isVisible = show;

  useEffect(() => {
    if (isVisible) {
      setRenderedText(text);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRenderedText(text);
    }, 160);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isVisible, text]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && triggerRef.current?.contains(next)) return;
          hideTooltip();
        }}
      >
        {children}
      </div>

      {mounted &&
        createPortal(
          <div
            className={styles.tooltip}
            data-side={side}
            data-show={isVisible}
            style={{
              top: coords.top,
              left: coords.left,
            }}
          >
            {renderedText}
          </div>,
          document.body
        )}
    </>
  );
}
