"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type {
  DragEndEvent as DragEndHandler,
  DragMoveEvent as DragMoveHandler,
  DragOverEvent as DragOverHandler,
  DragStartEvent as DragStartHandler,
} from "@dnd-kit/react";
import { arrayMove } from "@dnd-kit/helpers";
import { isSortable } from "@dnd-kit/react/sortable";
import type { EntityId } from "@/types";
import { isTempId } from "@/utils/entityId";
import { toRawDndId } from "@/utils/dndIds";

type CardLike = {
  id: string;
  title?: string;
  assigneeId?: EntityId | null;
  columnId?: EntityId | null;
  order?: number;
};

type ColumnLike = {
  id: string;
  order?: number;
  cards: CardLike[];
};

interface UseBoardDndParams<TColumn extends ColumnLike> {
  localColumns: TColumn[];
  setLocalColumns: Dispatch<SetStateAction<TColumn[]>>;
  boardScrollRef?: RefObject<HTMLDivElement | null>;
  isBoardReadOnly: boolean;
  isDndLocked?: boolean;
  onErrorToast?: (message: string, note?: string) => void;
  onArchiveAccepted?: () => void;
  commitColumnReorder: (columns: TColumn[]) => void;
  commitCardReorder: (columns: TColumn[], targetColumnId: string) => void;
  archiveColumnById: (columnId: string) => Promise<unknown>;
  archiveCardById: (cardId: string) => Promise<unknown>;
}

type DraggingItemType = "card" | "column" | null;

type DndTargetType =
  | "card"
  | "column"
  | "column-drop"
  | "column-bottom-drop"
  | "archive"
  | null;

type DragStartEvent = Parameters<DragStartHandler>[0];
type DragMoveEvent = Parameters<DragMoveHandler>[0];
type DragOverEvent = Parameters<DragOverHandler>[0];
type DragEndEvent = Parameters<DragEndHandler>[0];

type KeyboardScrollRequest = {
  columnId: string;
  cardId: string;
  cardIndex: number;
  direction: "ArrowUp" | "ArrowDown";
};

type SortableDragSource = {
  id: string | number;
  type: unknown;
  element?: Element;
  index: number;
  initialIndex: number;
  group?: string | number;
  initialGroup?: string | number;
};

function normalizeType(type: unknown): DraggingItemType {
  if (type === "card" || type === "column") return type;
  return null;
}

function normalizeTargetType(type: unknown): DndTargetType {
  if (
    type === "card" ||
    type === "column" ||
    type === "column-drop" ||
    type === "column-bottom-drop" ||
    type === "archive"
  ) {
    return type;
  }

  return null;
}

function isSortableDragSource(source: unknown): source is SortableDragSource {
  return (
    Boolean(source) &&
    isSortable(source as never) &&
    "initialIndex" in (source as object)
  );
}

function setArchiveHandoffHidden(
  element: Element | undefined,
  hidden: boolean,
) {
  if (!(element instanceof HTMLElement)) return;

  if (hidden) {
    element.setAttribute("data-archiving", "true");
    element.style.visibility = "hidden";
    element.style.pointerEvents = "none";
    return;
  }

  element.removeAttribute("data-archiving");
  element.style.removeProperty("visibility");
  element.style.removeProperty("pointer-events");
}

function extractColumnIdFromDropzoneId(
  id: unknown,
  prefix = "column-drop-",
): string | null {
  if (typeof id !== "string") return null;

  if (id.startsWith(prefix)) {
    return id.slice(prefix.length);
  }

  return null;
}

function resolveTargetColumnId(
  target: DragEndEvent["operation"]["target"] | null | undefined,
  targetType: DndTargetType,
): string | null {
  if (!target) return null;

  if (targetType === "column") {
    return toRawDndId(target.id, "column");
  }

  if (targetType === "column-drop" || targetType === "column-bottom-drop") {
    const dataColumnId = (target.data as { columnId?: unknown } | undefined)
      ?.columnId;

    if (dataColumnId != null) {
      return toRawDndId(dataColumnId, "column") ?? String(dataColumnId);
    }

    const parsed = extractColumnIdFromDropzoneId(
      target.id,
      targetType === "column-bottom-drop"
        ? "column-bottom-drop-"
        : "column-drop-",
    );

    if (parsed) {
      return parsed;
    }

    return toRawDndId(target.id, "column") ?? String(target.id);
  }

  return null;
}

function findColumnIdByCardId<TColumn extends ColumnLike>(
  columns: TColumn[],
  cardId: string,
): string | null {
  for (const column of columns) {
    if (column.cards.some((card) => String(card.id) === cardId)) {
      return String(column.id);
    }
  }

  return null;
}

function findCardLocation<TColumn extends ColumnLike>(
  columns: TColumn[],
  cardId: string,
): { columnId: string; columnIndex: number; cardIndex: number } | null {
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex];
    const cardIndex = column.cards.findIndex(
      (card) => String(card.id) === cardId,
    );

    if (cardIndex >= 0) {
      return {
        columnId: String(column.id),
        columnIndex,
        cardIndex,
      };
    }
  }

  return null;
}

function didCardLocationChange<TColumn extends ColumnLike>(
  beforeColumns: TColumn[],
  afterColumns: TColumn[],
  cardId: string,
): boolean {
  const before = findCardLocation(beforeColumns, cardId);
  const after = findCardLocation(afterColumns, cardId);

  if (!before || !after) return false;

  return (
    before.columnId !== after.columnId || before.cardIndex !== after.cardIndex
  );
}

function isKeyboardNativeEvent(event: unknown): event is KeyboardEvent {
  return typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent;
}

const FALLBACK_CARD_BLOCK_SIZE = 72;
const MIN_CARD_BLOCK_SIZE = 44;
const KEYBOARD_SCROLL_MAX_RETRIES = 3;
const KEYBOARD_SCROLL_TRIGGER_BUFFER_CARDS = 3;
const KEYBOARD_SCROLL_MIN_DELTA = 0.5;
const KEYBOARD_SCROLL_STEP_CARDS = 1;
const HORIZONTAL_AUTO_SCROLL_EDGE_THRESHOLD = 120;
const HORIZONTAL_AUTO_SCROLL_MIN_STEP = 8;
const HORIZONTAL_AUTO_SCROLL_MAX_STEP = 28;
const CARD_PREVIEW_RESET_DELAY_MS = 48;

function getCardsContainerByColumnId(columnId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;

  const containers = document.querySelectorAll<HTMLElement>(
    "[data-scroll='cards'][data-column-id]",
  );

  for (const container of containers) {
    if (container.dataset.columnId === columnId) {
      return container;
    }
  }

  return null;
}

function estimateCardBlockSize(container: HTMLElement): number {
  if (typeof window === "undefined") {
    return FALLBACK_CARD_BLOCK_SIZE;
  }

  const visibleCards = Array.from(
    container.querySelectorAll<HTMLElement>("[data-card-id]"),
  ).filter((card) => card.offsetParent !== null);

  if (visibleCards.length === 0) {
    return FALLBACK_CARD_BLOCK_SIZE;
  }

  const sample = visibleCards.slice(0, Math.min(visibleCards.length, 6));
  const total = sample.reduce((sum, card) => {
    const styles = window.getComputedStyle(card);
    const marginBottom = Number.parseFloat(styles.marginBottom) || 0;
    return sum + card.offsetHeight + marginBottom;
  }, 0);

  const average = total / sample.length;

  if (!Number.isFinite(average)) {
    return FALLBACK_CARD_BLOCK_SIZE;
  }

  return Math.max(MIN_CARD_BLOCK_SIZE, average);
}

function findCardElementInContainer(
  container: HTMLElement,
  cardId: string,
): HTMLElement | null {
  const cards = container.querySelectorAll<HTMLElement>("[data-card-id]");

  for (const card of cards) {
    if (card.dataset.cardId === cardId) {
      return card;
    }
  }

  return null;
}

function resolveKeyboardScrollTarget(
  request: KeyboardScrollRequest,
): { container: HTMLElement; top: number } | null {
  const container = getCardsContainerByColumnId(request.columnId);

  if (!container) return null;

  const cardBlockSize = estimateCardBlockSize(container);
  const currentTop = container.scrollTop;
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const scrollStep = cardBlockSize * KEYBOARD_SCROLL_STEP_CARDS;

  let targetTop = currentTop;
  const visibleCount = Math.max(
    1,
    Math.floor(container.clientHeight / Math.max(1, cardBlockSize)),
  );
  const visibleStartIndex = Math.max(
    0,
    Math.floor(currentTop / Math.max(1, cardBlockSize)),
  );
  const triggerBuffer = Math.max(
    1,
    Math.min(KEYBOARD_SCROLL_TRIGGER_BUFFER_CARDS, visibleCount - 1),
  );

  const cardElement = findCardElementInContainer(container, request.cardId);

  if (cardElement) {
    const containerRect = container.getBoundingClientRect();
    const cardRect = cardElement.getBoundingClientRect();
    const triggerDistance = cardBlockSize * triggerBuffer;
    const triggerTop = containerRect.top + triggerDistance;
    const triggerBottom = containerRect.bottom - triggerDistance;

    if (request.direction === "ArrowDown") {
      if (cardRect.bottom >= triggerBottom) {
        targetTop = currentTop + scrollStep;
      }
    } else {
      if (cardRect.top <= triggerTop) {
        targetTop = currentTop - scrollStep;
      }
    }
  } else if (request.direction === "ArrowDown") {
    const triggerIndex = visibleStartIndex + visibleCount - triggerBuffer;

    if (request.cardIndex >= triggerIndex) {
      targetTop = currentTop + scrollStep;
    }
  } else {
    const triggerIndex = visibleStartIndex + (triggerBuffer - 1);

    if (request.cardIndex <= triggerIndex) {
      targetTop = currentTop - scrollStep;
    }
  }

  targetTop = Math.max(0, Math.min(maxScrollTop, targetTop));

  if (Math.abs(targetTop - currentTop) < KEYBOARD_SCROLL_MIN_DELTA) {
    return null;
  }

  return { container, top: targetTop };
}

function getHorizontalAutoScrollStep(
  container: HTMLElement,
  pointerX: number,
): number {
  const rect = container.getBoundingClientRect();
  const threshold = Math.min(HORIZONTAL_AUTO_SCROLL_EDGE_THRESHOLD, rect.width / 2);

  if (threshold <= 0) return 0;

  const lerpStep = (intensity: number) =>
    HORIZONTAL_AUTO_SCROLL_MIN_STEP +
    (HORIZONTAL_AUTO_SCROLL_MAX_STEP - HORIZONTAL_AUTO_SCROLL_MIN_STEP) *
      intensity;

  if (pointerX <= rect.left + threshold) {
    const intensity = Math.max(
      0,
      Math.min(1, (rect.left + threshold - pointerX) / threshold),
    );
    return -lerpStep(intensity);
  }

  if (pointerX >= rect.right - threshold) {
    const intensity = Math.max(
      0,
      Math.min(1, (pointerX - (rect.right - threshold)) / threshold),
    );
    return lerpStep(intensity);
  }

  return 0;
}

function moveCard<TColumn extends ColumnLike>(
  columns: TColumn[],
  params: {
    cardId: string;
    fromColumnId: string;
    toColumnId: string;
    toIndex: number;
  },
): TColumn[] {
  const { cardId, fromColumnId, toColumnId, toIndex } = params;

  const fromColumnIndex = columns.findIndex(
    (column) => String(column.id) === fromColumnId,
  );
  const toColumnIndex = columns.findIndex(
    (column) => String(column.id) === toColumnId,
  );

  if (fromColumnIndex < 0 || toColumnIndex < 0) return columns;

  const fromColumn = columns[fromColumnIndex];
  const toColumn = columns[toColumnIndex];

  if (!fromColumn || !toColumn) return columns;

  const fromIndex = fromColumn.cards.findIndex(
    (card) => String(card.id) === cardId,
  );

  if (fromIndex < 0) return columns;

  if (fromColumnIndex === toColumnIndex) {
    const clamped = Math.max(0, Math.min(toIndex, fromColumn.cards.length - 1));

    if (fromIndex === clamped) return columns;

    const nextCards = arrayMove(fromColumn.cards, fromIndex, clamped);
    const nextColumns = [...columns];

    nextColumns[fromColumnIndex] = {
      ...fromColumn,
      cards: nextCards,
    } as TColumn;

    return nextColumns;
  }

  const nextFromCards = [...fromColumn.cards];
  const [moved] = nextFromCards.splice(fromIndex, 1);

  if (!moved) return columns;

  const nextToCards = [...toColumn.cards];
  const clamped = Math.max(0, Math.min(toIndex, nextToCards.length));

  nextToCards.splice(clamped, 0, moved);

  const nextColumns = [...columns];

  nextColumns[fromColumnIndex] = {
    ...fromColumn,
    cards: nextFromCards,
  } as TColumn;

  nextColumns[toColumnIndex] = {
    ...toColumn,
    cards: nextToCards,
  } as TColumn;

  return nextColumns;
}

export function useBoardDnd<TColumn extends ColumnLike>({
  localColumns,
  setLocalColumns,
  boardScrollRef,
  isBoardReadOnly,
  isDndLocked = false,
  onErrorToast,
  onArchiveAccepted,
  commitColumnReorder,
  commitCardReorder,
  archiveColumnById,
  archiveCardById,
}: UseBoardDndParams<TColumn>) {
  const [draggingItemType, setDraggingItemType] =
    useState<DraggingItemType>(null);
  const [isKeyboardDrag, setIsKeyboardDrag] = useState(false);
  const [isArchiveKeyboardTarget, setIsArchiveKeyboardTarget] =
    useState(false);

  const localColumnsRef = useRef(localColumns);
  const dragStartSnapshotRef = useRef<TColumn[] | null>(null);
  const isArchiveKeyboardTargetRef = useRef(false);
  const keyboardScrollRequestRef = useRef<KeyboardScrollRequest | null>(null);
  const keyboardScrollResolveFrameRef = useRef<number | null>(null);
  const horizontalAutoScrollFrameRef = useRef<number | null>(null);
  const horizontalAutoScrollPointerXRef = useRef<number | null>(null);
  const cardPreviewResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    localColumnsRef.current = localColumns;
  }, [localColumns]);

  const clearKeyboardScrollFrames = useCallback(() => {
    if (keyboardScrollResolveFrameRef.current != null) {
      cancelAnimationFrame(keyboardScrollResolveFrameRef.current);
      keyboardScrollResolveFrameRef.current = null;
    }

    keyboardScrollRequestRef.current = null;
  }, []);

  const clearHorizontalAutoScroll = useCallback(() => {
    if (horizontalAutoScrollFrameRef.current != null) {
      cancelAnimationFrame(horizontalAutoScrollFrameRef.current);
      horizontalAutoScrollFrameRef.current = null;
    }

    horizontalAutoScrollPointerXRef.current = null;
  }, []);

  const clearCardPreviewReset = useCallback(() => {
    if (cardPreviewResetTimeoutRef.current != null) {
      window.clearTimeout(cardPreviewResetTimeoutRef.current);
      cardPreviewResetTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearKeyboardScrollFrames();
      clearHorizontalAutoScroll();
      clearCardPreviewReset();
    };
  }, [
    clearCardPreviewReset,
    clearHorizontalAutoScroll,
    clearKeyboardScrollFrames,
  ]);

  const runHorizontalAutoScroll = useCallback(() => {
    const container = boardScrollRef?.current;
    const pointerX = horizontalAutoScrollPointerXRef.current;

    if (!container || pointerX == null) {
      horizontalAutoScrollFrameRef.current = null;
      return;
    }

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);

    if (maxScrollLeft <= 0) {
      clearHorizontalAutoScroll();
      return;
    }

    const step = getHorizontalAutoScrollStep(container, pointerX);

    if (step === 0) {
      clearHorizontalAutoScroll();
      return;
    }

    const nextScrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, container.scrollLeft + step),
    );

    if (nextScrollLeft === container.scrollLeft) {
      clearHorizontalAutoScroll();
      return;
    }

    container.scrollLeft = nextScrollLeft;
    horizontalAutoScrollFrameRef.current = requestAnimationFrame(
      runHorizontalAutoScroll,
    );
  }, [boardScrollRef, clearHorizontalAutoScroll]);

  const updateHorizontalAutoScroll = useCallback(
    (pointerX: number | null) => {
      const container = boardScrollRef?.current;

      if (!container || pointerX == null) {
        clearHorizontalAutoScroll();
        return;
      }

      horizontalAutoScrollPointerXRef.current = pointerX;

      if (getHorizontalAutoScrollStep(container, pointerX) === 0) {
        clearHorizontalAutoScroll();
        return;
      }

      if (horizontalAutoScrollFrameRef.current == null) {
        horizontalAutoScrollFrameRef.current = requestAnimationFrame(
          runHorizontalAutoScroll,
        );
      }
    },
    [boardScrollRef, clearHorizontalAutoScroll, runHorizontalAutoScroll],
  );

  const scheduleKeyboardScroll = useCallback(
    (request: KeyboardScrollRequest) => {
      keyboardScrollRequestRef.current = request;

      if (keyboardScrollResolveFrameRef.current != null) return;

      const run = (attempt: number) => {
        keyboardScrollResolveFrameRef.current = requestAnimationFrame(() => {
          const latestRequest = keyboardScrollRequestRef.current;

          if (!latestRequest) {
            keyboardScrollResolveFrameRef.current = null;
            return;
          }

          const nextTarget = resolveKeyboardScrollTarget(latestRequest);

          if (!nextTarget && attempt < KEYBOARD_SCROLL_MAX_RETRIES) {
            keyboardScrollResolveFrameRef.current = null;
            run(attempt + 1);
            return;
          }

          if (nextTarget) {
            nextTarget.container.scrollTo({ top: nextTarget.top, behavior: "auto" });
          }

          keyboardScrollRequestRef.current = null;
          keyboardScrollResolveFrameRef.current = null;
        });
      };

      run(0);
    },
    [],
  );

  const setArchiveKeyboardTarget = useCallback((value: boolean) => {
    isArchiveKeyboardTargetRef.current = value;
    setIsArchiveKeyboardTarget(value);
  }, []);

  const clearDragState = useCallback(() => {
    setDraggingItemType(null);
    setIsKeyboardDrag(false);
    setArchiveKeyboardTarget(false);
    clearKeyboardScrollFrames();
    clearHorizontalAutoScroll();
    clearCardPreviewReset();
  }, [
    clearCardPreviewReset,
    clearHorizontalAutoScroll,
    clearKeyboardScrollFrames,
    setArchiveKeyboardTarget,
  ]);

  const restoreDragStartSnapshot = useCallback(() => {
    const snapshot = dragStartSnapshotRef.current;

    if (!snapshot) return;

    dragStartSnapshotRef.current = null;
    localColumnsRef.current = snapshot;
    setLocalColumns(snapshot);
  }, [setLocalColumns]);

  const rollbackCommittedMove = useCallback(() => {
    const snapshot = dragStartSnapshotRef.current;

    if (!snapshot) return;

    localColumnsRef.current = snapshot;
    setLocalColumns(snapshot);
  }, [setLocalColumns]);

  const scheduleCardPreviewReset = useCallback(() => {
    clearCardPreviewReset();

    cardPreviewResetTimeoutRef.current = window.setTimeout(() => {
      cardPreviewResetTimeoutRef.current = null;

      if (dragStartSnapshotRef.current == null) return;
      if (localColumnsRef.current === dragStartSnapshotRef.current) return;

      rollbackCommittedMove();
    }, CARD_PREVIEW_RESET_DELAY_MS);
  }, [clearCardPreviewReset, rollbackCommittedMove]);

  const applyColumnSort = useCallback(
    (columns: TColumn[], source: SortableDragSource) => {
      const fromIndex = source.initialIndex;
      const toIndex = source.index;

      if (fromIndex === toIndex) return columns;
      if (fromIndex < 0 || fromIndex >= columns.length) return columns;
      if (toIndex < 0 || toIndex >= columns.length) return columns;

      return arrayMove(columns, fromIndex, toIndex);
    },
    [],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (isBoardReadOnly || isDndLocked) return;

      const source = event.operation.source;

      if (!source) return;

      const sourceType = normalizeType(source.type);
      const keyboardDrag = isKeyboardNativeEvent(event.nativeEvent);
      dragStartSnapshotRef.current = localColumnsRef.current;
      setDraggingItemType(sourceType);
      setIsKeyboardDrag(keyboardDrag);
      setArchiveKeyboardTarget(false);
      clearCardPreviewReset();

      if (keyboardDrag) {
        clearHorizontalAutoScroll();
      } else {
        updateHorizontalAutoScroll(event.operation.position.current?.x ?? null);
      }
    },
    [
      clearCardPreviewReset,
      clearHorizontalAutoScroll,
      isBoardReadOnly,
      isDndLocked,
      setArchiveKeyboardTarget,
      updateHorizontalAutoScroll,
    ],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!isKeyboardDrag) {
        updateHorizontalAutoScroll(event.operation.position.current?.x ?? null);
        return;
      }

      const nativeEvent = event.nativeEvent;

      if (!isKeyboardNativeEvent(nativeEvent)) return;

      const key = nativeEvent.key;

      if (
        key !== "ArrowUp" &&
        key !== "ArrowDown" &&
        key !== "ArrowLeft" &&
        key !== "ArrowRight"
      ) {
        return;
      }

      const source = event.operation.source;
      const sourceType = normalizeType(source?.type);

      if (!source || !sourceType) return;

      if (sourceType === "column") {
        if (isArchiveKeyboardTargetRef.current) {
          if (key === "ArrowDown" || key === "ArrowLeft") {
            setArchiveKeyboardTarget(false);
          }

          event.preventDefault();
          return;
        }

        if (key === "ArrowUp") {
          setArchiveKeyboardTarget(true);
          event.preventDefault();
          return;
        }

        if (key === "ArrowDown") {
          event.preventDefault();
          return;
        }

        if (
          key === "ArrowRight" &&
          isSortableDragSource(source) &&
          source.index >= localColumnsRef.current.length - 1
        ) {
          setArchiveKeyboardTarget(true);
          event.preventDefault();
        }
        return;
      }

      if (sourceType === "card") {
        if (!isSortableDragSource(source)) return;
        const sourceId = toRawDndId(source.id, "card");

        if (!sourceId) return;

        const baseColumns = localColumnsRef.current;
        const currentLocation = findCardLocation(baseColumns, sourceId);

        if (!currentLocation) return;

        const { columnId, columnIndex, cardIndex } = currentLocation;
        const lastColumnIndex = baseColumns.length - 1;

        if (isArchiveKeyboardTargetRef.current) {
          if (key === "ArrowDown" || key === "ArrowLeft") {
            setArchiveKeyboardTarget(false);
          }

          event.preventDefault();
          return;
        }

        if (key === "ArrowUp" && cardIndex === 0) {
          setArchiveKeyboardTarget(true);
          event.preventDefault();
          return;
        }

        let nextColumns = baseColumns;

        if (key === "ArrowRight") {
          if (columnIndex === lastColumnIndex) {
            setArchiveKeyboardTarget(true);
            event.preventDefault();
            return;
          }

          const nextColumn = baseColumns[columnIndex + 1];

          if (!nextColumn) {
            event.preventDefault();
            return;
          }

          nextColumns = moveCard(baseColumns, {
            cardId: sourceId,
            fromColumnId: columnId,
            toColumnId: String(nextColumn.id),
            toIndex: cardIndex,
          });
        } else if (key === "ArrowLeft") {
          if (columnIndex <= 0) {
            event.preventDefault();
            return;
          }

          const prevColumn = baseColumns[columnIndex - 1];

          if (!prevColumn) {
            event.preventDefault();
            return;
          }

          nextColumns = moveCard(baseColumns, {
            cardId: sourceId,
            fromColumnId: columnId,
            toColumnId: String(prevColumn.id),
            toIndex: cardIndex,
          });
        } else if (key === "ArrowUp") {
          if (cardIndex <= 0) {
            event.preventDefault();
            return;
          }

          nextColumns = moveCard(baseColumns, {
            cardId: sourceId,
            fromColumnId: columnId,
            toColumnId: columnId,
            toIndex: cardIndex - 1,
          });
        } else if (key === "ArrowDown") {
          const currentColumn = baseColumns[columnIndex];

          if (!currentColumn || cardIndex >= currentColumn.cards.length - 1) {
            event.preventDefault();
            return;
          }

          nextColumns = moveCard(baseColumns, {
            cardId: sourceId,
            fromColumnId: columnId,
            toColumnId: columnId,
            toIndex: cardIndex + 1,
          });
        } else {
          return;
        }

        if (nextColumns === baseColumns) {
          return;
        }

        localColumnsRef.current = nextColumns;
        setLocalColumns(nextColumns);

        const verticalDirection =
          key === "ArrowUp" || key === "ArrowDown" ? key : null;

        if (verticalDirection) {
          const nextLocation = findCardLocation(nextColumns, sourceId);

          if (nextLocation) {
            scheduleKeyboardScroll({
              columnId: nextLocation.columnId,
              cardId: sourceId,
              cardIndex: nextLocation.cardIndex,
              direction: verticalDirection,
            });
          }
        }
      }
    },
    [
      isKeyboardDrag,
      scheduleKeyboardScroll,
      setLocalColumns,
      setArchiveKeyboardTarget,
      updateHorizontalAutoScroll,
    ],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const sourceType = normalizeType(event.operation.source?.type);

      if (sourceType !== "card") {
        if (isKeyboardDrag && isArchiveKeyboardTargetRef.current) {
          event.preventDefault();
        }
        return;
      }

      if (sourceType === "card") {
        event.preventDefault();

        if (isKeyboardDrag) {
          return;
        }

        const { source, target } = event.operation;

        if (!source || !target) {
          scheduleCardPreviewReset();
          return;
        }
        if (!isSortableDragSource(source)) return;

        const sourceId = toRawDndId(source.id, "card");

        if (!sourceId) return;

        const baseColumns = localColumnsRef.current;
        const currentCardLocation = findCardLocation(baseColumns, sourceId);

        if (!currentCardLocation) return;

        const targetType = normalizeTargetType(target.type);
        let nextColumns = baseColumns;

        if (targetType === "card") {
          clearCardPreviewReset();
          const targetCardId = toRawDndId(target.id, "card");

          if (!targetCardId) return;

          const targetCardLocation = findCardLocation(baseColumns, targetCardId);

          if (!targetCardLocation) return;

          nextColumns = moveCard(baseColumns, {
            cardId: sourceId,
            fromColumnId: currentCardLocation.columnId,
            toColumnId: targetCardLocation.columnId,
            toIndex: targetCardLocation.cardIndex,
          });
        } else if (
          targetType === "column" ||
          targetType === "column-drop" ||
          targetType === "column-bottom-drop"
        ) {
          clearCardPreviewReset();
          const targetColumnId = resolveTargetColumnId(target, targetType);

          if (!targetColumnId || isTempId(targetColumnId)) return;

          const targetColumn = baseColumns.find(
            (column) => String(column.id) === targetColumnId,
          );

          if (!targetColumn) return;

          nextColumns = moveCard(baseColumns, {
            cardId: sourceId,
            fromColumnId: currentCardLocation.columnId,
            toColumnId: targetColumnId,
            toIndex: targetColumn.cards.length,
          });
        } else {
          scheduleCardPreviewReset();
          return;
        }

        if (nextColumns !== baseColumns) {
          localColumnsRef.current = nextColumns;
          setLocalColumns(nextColumns);
        }
      }
    },
    [
      clearCardPreviewReset,
      isKeyboardDrag,
      scheduleCardPreviewReset,
      setLocalColumns,
    ],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { source, target } = event.operation;

      try {
        clearCardPreviewReset();

        if (!source || isBoardReadOnly || isDndLocked) {
          if (event.canceled) {
            restoreDragStartSnapshot();
          }

          dragStartSnapshotRef.current = null;
          return;
        }

        if (event.canceled) {
          restoreDragStartSnapshot();
          dragStartSnapshotRef.current = null;
          return;
        }

        const sourceType = normalizeType(source.type);
        const targetType = normalizeTargetType(target?.type);

        if (!sourceType) {
          dragStartSnapshotRef.current = null;
          return;
        }

        const sourceId = toRawDndId(source.id, sourceType);

        if (!sourceId || isTempId(sourceId)) {
          dragStartSnapshotRef.current = null;
          return;
        }

        if (isKeyboardDrag && isArchiveKeyboardTargetRef.current) {
          if (sourceType === "column") {
            try {
              setArchiveHandoffHidden(source.element, true);
              await archiveColumnById(sourceId);
              onArchiveAccepted?.();
            } catch {
              setArchiveHandoffHidden(source.element, false);
              onErrorToast?.("Failed to archive column.");
            } finally {
              dragStartSnapshotRef.current = null;
            }

            return;
          }

          try {
            await archiveCardById(sourceId);
            onArchiveAccepted?.();
          } catch {
            onErrorToast?.("Failed to archive card.");
          } finally {
            dragStartSnapshotRef.current = null;
          }

          return;
        }

        if (!target && !isKeyboardDrag) {
          restoreDragStartSnapshot();
          dragStartSnapshotRef.current = null;
          return;
        }

        if (sourceType === "column") {
          if (targetType === "archive") {
            try {
              setArchiveHandoffHidden(source.element, true);
              await archiveColumnById(sourceId);
              onArchiveAccepted?.();
            } catch {
              setArchiveHandoffHidden(source.element, false);
              onErrorToast?.("Failed to archive column.");
            } finally {
              dragStartSnapshotRef.current = null;
            }

            return;
          }

          if (!isSortableDragSource(source)) {
            dragStartSnapshotRef.current = null;
            return;
          }

          const baseColumns =
            dragStartSnapshotRef.current ?? localColumnsRef.current;
          const nextColumns = applyColumnSort(baseColumns, source);

          if (nextColumns === baseColumns) {
            dragStartSnapshotRef.current = null;
            return;
          }

          localColumnsRef.current = nextColumns;
          setLocalColumns(nextColumns);

          try {
            commitColumnReorder(nextColumns);
          } catch {
            rollbackCommittedMove();
          } finally {
            dragStartSnapshotRef.current = null;
          }

          return;
        }

        if (sourceType === "card") {
          if (targetType === "archive") {
            try {
              await archiveCardById(sourceId);
              onArchiveAccepted?.();
            } catch {
              onErrorToast?.("Failed to archive card.");
            } finally {
              dragStartSnapshotRef.current = null;
            }

            return;
          }

          if (!isSortableDragSource(source)) {
            dragStartSnapshotRef.current = null;
            return;
          }

          const snapshotColumns =
            dragStartSnapshotRef.current ?? localColumnsRef.current;
          const currentColumns = localColumnsRef.current;
          let nextColumns = currentColumns;

          const didOptimisticMove = didCardLocationChange(
            snapshotColumns,
            currentColumns,
            sourceId,
          );

          if (!didOptimisticMove) {
            const currentCardLocation = findCardLocation(
              currentColumns,
              sourceId,
            );
            const initialGroupId = currentCardLocation?.columnId ?? null;

            if (!initialGroupId) {
              dragStartSnapshotRef.current = null;
              return;
            }

            if (
              targetType === "column" ||
              targetType === "column-drop" ||
              targetType === "column-bottom-drop"
            ) {
              const targetColumnId = resolveTargetColumnId(target, targetType);

              if (!targetColumnId || isTempId(targetColumnId)) {
                rollbackCommittedMove();
                dragStartSnapshotRef.current = null;
                return;
              }

              if (initialGroupId !== targetColumnId) {
                const targetColumn = currentColumns.find(
                  (column) => String(column.id) === targetColumnId,
                );

                if (targetColumn) {
                  nextColumns = moveCard(currentColumns, {
                    cardId: sourceId,
                    fromColumnId: initialGroupId,
                    toColumnId: targetColumnId,
                    toIndex: targetColumn.cards.length,
                  });
                }
              }
            } else if (targetType === "card") {
              if (!target) {
                rollbackCommittedMove();
                dragStartSnapshotRef.current = null;
                return;
              }

              const targetCardId = toRawDndId(target.id, "card");

              if (!targetCardId) {
                rollbackCommittedMove();
                dragStartSnapshotRef.current = null;
                return;
              }

              const targetCardLocation = findCardLocation(
                currentColumns,
                targetCardId,
              );

              if (targetCardLocation) {
                nextColumns = moveCard(currentColumns, {
                  cardId: sourceId,
                  fromColumnId: initialGroupId,
                  toColumnId: targetCardLocation.columnId,
                  toIndex: targetCardLocation.cardIndex,
                });
              }
            }
          }

          const sortableChanged =
            source.initialGroup !== source.group ||
            source.initialIndex !== source.index;
          const didCommitMove = didCardLocationChange(
            snapshotColumns,
            nextColumns,
            sourceId,
          );

          if (!didCommitMove && sortableChanged) {
            const snapshotLocation = findCardLocation(
              snapshotColumns,
              sourceId,
            );
            const targetGroupId = toRawDndId(source.group, "column");

            if (snapshotLocation && targetGroupId && !isTempId(targetGroupId)) {
              nextColumns = moveCard(snapshotColumns, {
                cardId: sourceId,
                fromColumnId: snapshotLocation.columnId,
                toColumnId: targetGroupId,
                toIndex: source.index,
              });
            }
          }

          if (!didCardLocationChange(snapshotColumns, nextColumns, sourceId)) {
            dragStartSnapshotRef.current = null;
            return;
          }

          if (nextColumns !== currentColumns) {
            localColumnsRef.current = nextColumns;
            setLocalColumns(nextColumns);
          }

          const persistedTargetColumnId = findColumnIdByCardId(
            nextColumns,
            sourceId,
          );

          if (!persistedTargetColumnId || isTempId(persistedTargetColumnId)) {
            dragStartSnapshotRef.current = null;
            return;
          }

          const targetColumn = nextColumns.find(
            (column) => String(column.id) === persistedTargetColumnId,
          );

          if (!targetColumn || isTempId(targetColumn.id)) {
            dragStartSnapshotRef.current = null;
            return;
          }

          try {
            commitCardReorder(nextColumns, String(targetColumn.id));
          } catch {
            rollbackCommittedMove();
          } finally {
            dragStartSnapshotRef.current = null;
          }

          return;
        }

        dragStartSnapshotRef.current = null;
      } finally {
        clearDragState();
      }
    },
    [
      applyColumnSort,
      archiveCardById,
      archiveColumnById,
      commitCardReorder,
      commitColumnReorder,
      clearCardPreviewReset,
      isKeyboardDrag,
      isBoardReadOnly,
      isDndLocked,
      clearDragState,
      onErrorToast,
      onArchiveAccepted,
      restoreDragStartSnapshot,
      rollbackCommittedMove,
      setLocalColumns,
    ],
  );

  return {
    draggingItemType,
    isKeyboardDrag,
    isArchiveKeyboardTarget,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragEnd,
  };
}
