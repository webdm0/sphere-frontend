"use client";

import { forwardRef, memo, useCallback, useEffect, useRef, useState } from "react";
import styles from "./Card.module.css";
import EyeIcon from "@/components/icons/EyeIcon";
import { useCardSortable } from "@/hooks/card/useCardSortable";
import PortalTooltip from "@/components/ui/PortalTooltip";
import type { EntityId } from "@/types";

interface CardProps {
  id: string;
  index: number;
  title: string;
  fromColumn: string;
  draggable?: boolean;
  assigneeId?: EntityId | null;
  isOptimistic?: boolean;
  isEditLocked?: boolean;
  readOnly?: boolean;
  currentUserMemberId?: EntityId | null;
  onOpen?: (cardId: string, byKeyboard?: boolean, target?: HTMLElement) => void;
}

const CardBase = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      id,
      index,
      title,
      fromColumn,
      draggable = true,
      assigneeId,
      isOptimistic = false,
      isEditLocked = false,
      readOnly = false,
      currentUserMemberId,
      onOpen,
    },
    ref
  ) => {
    const openedByKeyboardRef = useRef(false);
    const lastInputModeRef = useRef<"touch" | "pointer" | "keyboard" | null>(
      null,
    );
    const wasDraggingRef = useRef(false);
    const [isTouchPulseActive, setIsTouchPulseActive] = useState(false);
    const { ref: sortableRef, handleRef: sortableHandleRef, isDragging, canDrag } =
      useCardSortable({
        id,
        index,
        columnId: fromColumn,
        draggable,
        readOnly,
        isOptimistic,
      });

    const isAssignedToMe =
      assigneeId != null &&
      currentUserMemberId != null &&
      String(assigneeId) === String(currentUserMemberId);

    const isInteractive = Boolean(onOpen) && !isOptimistic && !isEditLocked;

    const handleRef = useCallback(
      (node: HTMLDivElement | null) => {
        sortableRef(node);
        if (!ref) return;
        if (typeof ref === "function") ref(node);
        else ref.current = node;
      },
      [ref, sortableRef]
    );

    const isDragHandleTarget = useCallback((target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return target.closest("[data-card-drag-handle='true']") != null;
    }, []);

    const handleOpen = useCallback(
      (target?: HTMLElement) => {
        if (!onOpen || isDragging || isOptimistic || isEditLocked) return;
        onOpen(id, openedByKeyboardRef.current, target);
      },
      [id, isDragging, isEditLocked, isOptimistic, onOpen]
    );

    useEffect(() => {
      if (isDragging && !wasDraggingRef.current) {
        setIsTouchPulseActive(lastInputModeRef.current === "touch");
      } else if (!isDragging && wasDraggingRef.current) {
        setIsTouchPulseActive(false);
      }

      wasDraggingRef.current = isDragging;
    }, [isDragging]);

    return (
      <div
        ref={handleRef}
        data-card="true"
        data-card-id={id}
        {...(isOptimistic || isEditLocked ? { "aria-disabled": true } : {})}
        {...(isInteractive ? { role: "button", tabIndex: 0 } : {})}
        className={`${styles.card} ${
          isOptimistic ? styles.cardPending : ""
        } ${readOnly ? styles.cardReadOnly : ""} ${
          isTouchPulseActive ? styles.cardTouchPulse : ""
        }`}
        onPointerDownCapture={(event) => {
          lastInputModeRef.current =
            event.pointerType === "touch" ? "touch" : "pointer";
        }}
        onKeyDownCapture={() => {
          lastInputModeRef.current = "keyboard";
        }}
        onClick={(e) => {
          openedByKeyboardRef.current = e.detail === 0;
          handleOpen(e.currentTarget);
        }}
        onKeyDown={(event) => {
          if (!isInteractive || isDragging) return;
          if (isDragHandleTarget(event.target)) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openedByKeyboardRef.current = true;
            onOpen?.(id, true, event.currentTarget as HTMLElement);
          }
        }}
      >
        <p
          ref={canDrag ? sortableHandleRef : undefined}
          className={`${styles.dragHandle} ${canDrag ? "focus-ring" : ""}`.trim()}
          data-card-drag-handle="true"
          role={canDrag ? "button" : undefined}
          tabIndex={canDrag ? 0 : -1}
          aria-label={canDrag ? `Drag card ${title || "Untitled"}` : undefined}
        >
          {title || "Untitled"}
        </p>

        {isAssignedToMe && (
          <div className={styles.assignedIcon}>
            <PortalTooltip text="Assigned to me">
              <EyeIcon size={16} color="var(--text-secondary)" />
            </PortalTooltip>
          </div>
        )}
      </div>
    );
  }
);

CardBase.displayName = "Card";
const Card = memo(CardBase);
Card.displayName = "Card";
export default Card;
