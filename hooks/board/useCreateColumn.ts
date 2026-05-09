"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseCreateColumnParams {
  isReadOnly: boolean;
  createColumn: (title: string) => Promise<unknown>;
  scrollToAddColumn: (behavior?: ScrollBehavior) => void;
  columnsCount?: number;
  onErrorToast?: (message: string, note?: string) => void;
}

export function useCreateColumn({
  isReadOnly,
  createColumn,
  scrollToAddColumn,
  columnsCount,
  onErrorToast,
}: UseCreateColumnParams) {
  const [isCreating, setIsCreating] = useState(false);
  const [newColumnTitle, setNewColumnTitleState] = useState("");
  const isSubmittingRef = useRef(false);

  const closeCreateColumn = useCallback(() => {
    setNewColumnTitleState("");
    setIsCreating(false);
  }, []);

  const setNewColumnTitle = useCallback((value: string) => {
    setNewColumnTitleState(value);
  }, []);

  const handleCreateColumn = useCallback(async () => {
    if (isReadOnly) return;
    if (isSubmittingRef.current) return;
    if (!newColumnTitle.trim()) return;

    const title = newColumnTitle.trim();
    isSubmittingRef.current = true;
    setNewColumnTitleState("");
    setIsCreating(false);

    try {
      await createColumn(title);
    } catch {
      onErrorToast?.("Failed to create column.");
      setIsCreating(true);
      setNewColumnTitleState(title);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [createColumn, isReadOnly, newColumnTitle, onErrorToast]);

  useEffect(() => {
    if (!isCreating) return;
    const frame = requestAnimationFrame(() => {
      scrollToAddColumn("smooth");
    });
    return () => cancelAnimationFrame(frame);
  }, [columnsCount, isCreating, scrollToAddColumn]);

  return {
    isCreating,
    setIsCreating,
    newColumnTitle,
    setNewColumnTitle,
    closeCreateColumn,
    handleCreateColumn,
  };
}
