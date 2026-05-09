"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/react";
import {
  defaultCollisionDetection,
  pointerIntersection,
  shapeIntersection,
  type CollisionDetector,
} from "@dnd-kit/collision";
import { CollisionPriority } from "@dnd-kit/abstract";
import { Rectangle } from "@dnd-kit/geometry";
import ArchiveIcon from "@/components/icons/ArchiveIcon";
import styles from "@/components/boards/MobileArchiveDropzone.module.css";

type DraggingItemType = "card" | "column" | null;

function getVisibleColumnShape(input: Parameters<CollisionDetector>[0]) {
  const source = input.dragOperation.source as { element?: Element | null } | null;
  const trackElement = source?.element;

  if (!(trackElement instanceof HTMLElement)) {
    return null;
  }

  const visibleColumnElement = trackElement.firstElementChild;

  if (!(visibleColumnElement instanceof HTMLElement)) {
    return null;
  }

  const rect = visibleColumnElement.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return new Rectangle(rect.left, rect.top, rect.width, rect.height);
}

interface MobileArchiveDropzoneProps {
  isVisible: boolean;
  draggingItemType: DraggingItemType;
  isArchiveKeyboardTarget?: boolean;
  disableDropzone?: boolean;
}

const archiveCollisionDetector: CollisionDetector = (input) => {
  const sourceType = input.dragOperation.source?.type;

  if (sourceType === "column") {
    const pointerCollision = pointerIntersection(input);

    if (pointerCollision) {
      return pointerCollision;
    }

    const croppedShape = getVisibleColumnShape(input);

    if (croppedShape) {
      const existingShape = input.dragOperation.shape;

      return (
        shapeIntersection({
          ...input,
          dragOperation: {
            ...input.dragOperation,
            shape: {
              current: croppedShape,
              initial: existingShape?.initial ?? croppedShape,
              previous: existingShape?.previous,
            },
          },
        }) ?? null
      );
    }

    return defaultCollisionDetection(input);
  }

  return defaultCollisionDetection(input);
};

export default function MobileArchiveDropzone({
  isVisible,
  draggingItemType,
  isArchiveKeyboardTarget = false,
  disableDropzone = false,
}: MobileArchiveDropzoneProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [lastDraggingItemType, setLastDraggingItemType] =
    useState<Exclude<DraggingItemType, null> | null>(null);
  const wasOverRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const { ref: setNodeRef, isDropTarget: isOver } = useDroppable({
    id: "mobile-archive-dropzone",
    type: "archive",
    accept: ["card", "column"],
    collisionDetector: archiveCollisionDetector,
    collisionPriority: CollisionPriority.Highest,
    disabled: !isVisible || !isMobileViewport || disableDropzone,
  });

  const isArchiveOver = isOver || isArchiveKeyboardTarget;

  useEffect(() => {
    if (!isVisible || !isMobileViewport) {
      wasOverRef.current = false;
      return;
    }

    if (isArchiveOver && !wasOverRef.current && typeof navigator !== "undefined") {
      navigator.vibrate?.(12);
    }

    wasOverRef.current = isArchiveOver;
  }, [isArchiveOver, isMobileViewport, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    if (!draggingItemType) return;
    setLastDraggingItemType(draggingItemType);
  }, [draggingItemType, isVisible]);

  if (!isMobileViewport) return null;

  const visibleDraggingItemType =
    isVisible && draggingItemType ? draggingItemType : lastDraggingItemType;

  const label =
    visibleDraggingItemType === "column"
      ? "Archive column"
      : visibleDraggingItemType === "card"
        ? "Archive card"
        : "Archive";

  return (
    <div
      ref={setNodeRef}
      className={`${styles.dropzone} ${isVisible ? styles.dropzoneVisible : ""} ${
        isVisible ? styles.dropzoneActive : ""
      } ${
        isVisible && isArchiveOver ? styles.dropzoneOver : ""
      }`}
      data-visible={isVisible ? "true" : "false"}
      data-over={isArchiveOver ? "true" : "false"}
      aria-hidden="true"
    >
      <ArchiveIcon size={14} color="var(--text-secondary)" />
      <span>{label}</span>
    </div>
  );
}
