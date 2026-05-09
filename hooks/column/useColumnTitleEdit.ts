"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

interface UseColumnTitleEditParams {
  title: string;
  columnId: string;
  isPending: boolean;
  isEditLocked: boolean;
  isReadOnly: boolean;
  onTitleUpdate: (id: string, newTitle: string) => Promise<void>;
}

export function useColumnTitleEdit({
  title,
  columnId,
  isPending,
  isEditLocked,
  isReadOnly,
  onTitleUpdate,
}: UseColumnTitleEditParams) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ignoreBlurRef = useRef(false);
  const minHeightRef = useRef<number>(0);

  useEffect(() => {
    setTempTitle(title);
  }, [title]);

  useEffect(() => {
    if (!isEditLocked) return;
    setIsEditing(false);
    setTempTitle(title);
    textareaRef.current?.blur();
  }, [isEditLocked, title]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minHeight = minHeightRef.current || 0;
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.rows = 1;
      const style = window.getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight || "0");
      minHeightRef.current = lineHeight;
      adjustHeight();
    }
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const el = textareaRef.current;
    if (!el) return;
    adjustHeight();
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [isEditing]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [tempTitle, isEditing]);

  const exitEditing = () => {
    setIsEditing(false);
    textareaRef.current?.blur();
  };

  const handleSave = async () => {
    if (isReadOnly || isEditLocked) {
      setTempTitle(title);
      exitEditing();
      return;
    }
    const trimmed = tempTitle.trim();

    if (trimmed.length < 1) {
      setTempTitle(title);
      exitEditing();
      return;
    }

    if (trimmed !== title && !isPending && !isEditLocked) {
      exitEditing();
      await onTitleUpdate(columnId, trimmed);
      return;
    }

    exitEditing();
  };

  const handleHeaderClick = () => {
    if (isPending || isEditLocked || isReadOnly) return;
    if (!isEditing) setIsEditing(true);
  };

  const handleChange = (value: string) => {
    if (isReadOnly || isEditLocked) return;
    setTempTitle(value);
    adjustHeight();
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isEditing) {
      if (isPending || isEditLocked || isReadOnly) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsEditing(true);
      }
      return;
    }

    if (isPending || isEditLocked || isReadOnly) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ignoreBlurRef.current = true;
      await handleSave();
      setTimeout(() => (ignoreBlurRef.current = false), 0);
    }

    if (e.key === "Escape") {
      e.preventDefault();
      ignoreBlurRef.current = true;
      setTempTitle(title);
      setIsEditing(false);
      setTimeout(() => (ignoreBlurRef.current = false), 0);
    }
  };

  const handleBlur = async () => {
    if (ignoreBlurRef.current || isPending || isEditLocked || isReadOnly) return;
    await handleSave();
  };

  return {
    isEditing,
    tempTitle,
    textareaRef,
    handleHeaderClick,
    handleChange,
    handleKeyDown,
    handleBlur,
  };
}
