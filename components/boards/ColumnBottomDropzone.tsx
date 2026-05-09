"use client";

import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import styles from "@/components/boards/SingleBoardView.module.css";

interface ColumnBottomDropzoneProps {
  columnId: string;
  disabled?: boolean;
}

export default function ColumnBottomDropzone({
  columnId,
  disabled = false,
}: ColumnBottomDropzoneProps) {
  const { ref: setNodeRef } = useDroppable({
    id: `column-bottom-drop-${columnId}`,
    type: "column-bottom-drop",
    accept: "card",
    collisionPriority: CollisionPriority.Normal,
    data: { columnId },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={styles.columnBottomDropzone}
      data-droppable="column-bottom"
      aria-hidden="true"
    />
  );
}
