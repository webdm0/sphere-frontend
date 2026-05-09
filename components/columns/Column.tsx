"use client";

import React, {
  useRef,
  forwardRef,
  memo,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useDroppable } from "@dnd-kit/react";
import {
  defaultCollisionDetection,
  pointerDistance,
  type CollisionDetector,
} from "@dnd-kit/collision";
import { CollisionPriority } from "@dnd-kit/abstract";
import styles from "@/components/columns/Column.module.css";
import { useColumn } from "@/hooks/column/useColumn";
import { ApiColumnCard } from "@/types";
import { DragHandleContext } from "@/components/common/SortableColumn";
import { useColumnTitleEdit } from "@/hooks/column/useColumnTitleEdit";
import ColumnCardsList from "@/components/columns/ColumnCardsList";
import ColumnCardInput from "@/components/columns/ColumnCardInput";
import { SmoothHeight } from "@/components/ui/SmoothHeight";
import type { EntityId } from "@/types";

type UiCard = Omit<ApiColumnCard, "id"> & { id: string };

interface ColumnProps {
  boardId: string;
  columnId: string;
  title: string;
  cards: UiCard[];
  disableCardDrag?: boolean;
  autoAssignToCurrentUserOnCreate?: boolean;
  defaultAssigneeIdOnCreate?: EntityId | null;
  onTitleUpdate: (id: string, newTitle: string) => Promise<void>;
  onOpenCard?: (cardId: string, byKeyboard?: boolean, target?: HTMLElement) => void;
  currentUserMemberId?: EntityId | null;
  dragHandleRef?: (element: Element | null) => void;
  initialScroll?: number;
  isPending?: boolean;
  isReadOnly?: boolean;
  isDndLocked?: boolean;
  isEditLocked?: boolean;
  onErrorToast?: (message: string, note?: string) => void;
}

const columnDropCollisionDetector: CollisionDetector = (input) => {
  const pointer = input.dragOperation.position.current;
  const rect = input.droppable.shape?.boundingRectangle;

  if (!pointer || !rect) {
    return defaultCollisionDetection(input);
  }

  if (pointer.y <= rect.bottom) {
    return defaultCollisionDetection(input);
  }

  if (pointer.x < rect.left || pointer.x > rect.right) {
    return null;
  }

  return pointerDistance(input);
};

const ColumnBase = forwardRef<HTMLDivElement, ColumnProps>(
  (
    {
      boardId,
      columnId,
      title,
      cards,
      disableCardDrag = false,
      autoAssignToCurrentUserOnCreate = false,
      defaultAssigneeIdOnCreate = null,
      onTitleUpdate,
      onOpenCard,
      currentUserMemberId,
      dragHandleRef,
      initialScroll,
      isPending = false,
      isReadOnly = false,
      isDndLocked = false,
      isEditLocked = false,
      onErrorToast,
    },
    ref,
  ) => {
    const dragHandleContext = useContext(DragHandleContext);
    const resolvedDragHandleRef = dragHandleRef ?? dragHandleContext;
    const isColumnDragEnabled =
      Boolean(resolvedDragHandleRef) && !isReadOnly && !isPending && !isDndLocked;

    const {
      newCardTitle,
      setNewCardTitle,
      handleKeyDown: handleCardInputKeyDown,
      handleCreateCard,
    } = useColumn({
      columnId,
      boardId,
      isReadOnly,
      assignToCurrentUserOnCreate: autoAssignToCurrentUserOnCreate,
      defaultAssigneeId: defaultAssigneeIdOnCreate,
      onErrorToast,
    });

    const handleCardTitleChange = useCallback(
      (value: string) => {
        if (isReadOnly) return;
        setNewCardTitle(value);
      },
      [isReadOnly, setNewCardTitle],
    );

    const scrollRef = useRef<HTMLDivElement>(null);
    const {
      ref: setDropzoneRef,
      isDropTarget: isCardDropTarget,
    } = useDroppable({
      id: `column-drop-${columnId}`,
      type: "column-drop",
      accept: "card",
      collisionDetector: columnDropCollisionDetector,
      collisionPriority: CollisionPriority.Low,
      data: { columnId },
      disabled: isReadOnly || isDndLocked || isPending,
    });

    const setCardsContainerRef = useCallback(
      (node: HTMLDivElement | null) => {
        scrollRef.current = node;
        setDropzoneRef(node);
      },
      [setDropzoneRef]
    );

    useEffect(() => {
      if (scrollRef.current && typeof initialScroll === "number") {
        scrollRef.current.scrollTop = initialScroll;
      }
    }, [initialScroll]);

    const {
      isEditing,
      tempTitle,
      textareaRef,
      handleHeaderClick,
      handleChange,
      handleKeyDown: handleTitleKeyDown,
      handleBlur,
    } = useColumnTitleEdit({
      title,
      columnId,
      isPending,
      isEditLocked,
      isReadOnly,
      onTitleUpdate,
    });
    const cardsMeasureKey = cards.map((card) => String(card.id)).join("|");

    return (
      <div
        ref={(node) => {
          if (typeof ref === "function") ref(node);
          else if (ref)
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
        }}
        className={`${styles.column} ${isPending ? styles.columnPending : ""}`}
        data-state={isPending ? "pending" : "ready"}
      >
        <div
          ref={resolvedDragHandleRef}
          className={`${styles.columnHeader} ${
            isColumnDragEnabled ? `${styles.columnHeaderDragHandle} focus-ring` : ""
          }`.trim()}
          onClick={handleHeaderClick}
          onPointerDown={() => {
            textareaRef.current?.setAttribute("data-pointer-focus", "true");
          }}
          data-role="column-header"
          role={isColumnDragEnabled ? "button" : undefined}
          tabIndex={isColumnDragEnabled ? 0 : undefined}
          aria-label={isColumnDragEnabled ? `Drag column ${title}` : undefined}
        >
          <textarea
            ref={textareaRef}
            className={`${styles.titleInput} ${
              isEditing && !isPending && !isReadOnly
                ? styles.titleEditing
                : isReadOnly || isPending
                  ? styles.titleReadOnly
                  : styles.titleReadonly
            }`}
            value={tempTitle}
            minLength={1}
            maxLength={32}
            readOnly={!isEditing || isPending || isEditLocked || isReadOnly}
            disabled={isReadOnly}
            onChange={(e) => {
              handleChange(e.target.value);
            }}
            onKeyDown={handleTitleKeyDown}
            onBlur={() => {
              textareaRef.current?.removeAttribute("data-pointer-focus");
              handleBlur();
            }}
            rows={1}
          />
        </div>

        <div className={styles.columnBody}>
          <div
            ref={setCardsContainerRef}
            className={`${styles.cardsContainer} ${
              isCardDropTarget ? styles.columnOver : ""
            }`}
            data-scroll="cards"
            data-column-id={columnId}
            data-pan-block={isReadOnly ? "true" : undefined}
          >
            <SmoothHeight measureKey={cardsMeasureKey}>
              <ColumnCardsList
                cards={cards}
                columnId={columnId}
                disableCardDrag={disableCardDrag}
                currentUserMemberId={currentUserMemberId}
                isReadOnly={isReadOnly}
                isDndLocked={isDndLocked}
                isEditLocked={isEditLocked}
                onOpenCard={onOpenCard}
              />
            </SmoothHeight>
          </div>

          <ColumnCardInput
            value={newCardTitle}
            isPending={isPending}
            isReadOnly={isReadOnly}
            onChange={handleCardTitleChange}
            onKeyDown={handleCardInputKeyDown}
            onSubmit={() => void handleCreateCard()}
          />
          {isPending && (
            <div
              className={styles.columnPendingOverlay}
              aria-label="Creating column"
            />
          )}
        </div>
      </div>
    );
  },
);

ColumnBase.displayName = "Column";
const Column = memo(ColumnBase);
Column.displayName = "Column";
export default Column;
