"use client";

import { useEffect, useRef } from "react";
import type { useBoardModals } from "@/hooks/board/useBoardModals";

type BoardModals = ReturnType<typeof useBoardModals>;

interface UseBoardTitleEditParams {
  modals: BoardModals;
  update: (params: { id: string; title: string }) => Promise<unknown>;
}

export function useBoardTitleEdit({ modals, update }: UseBoardTitleEditParams) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (modals.isEditOpen && el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, [modals.isEditOpen]);

  const closeEditMode = () => {
    modals.clear();
    modals.closeEdit();
  };

  const handleCommitTitle = async () => {
    const selected = modals.selected;
    if (!selected) return;

    const title = selected.title.trim();
    if (title.length < 1) {
      closeEditMode();
      return;
    }

    void update({ id: selected.id, title }).catch(() => undefined);

    closeEditMode();
  };

  return {
    textareaRef,
    closeEditMode,
    handleCommitTitle,
  };
}
