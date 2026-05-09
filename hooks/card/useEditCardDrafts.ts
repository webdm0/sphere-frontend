import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiCard } from "@/types";

interface UseEditCardDraftsArgs {
  card?: ApiCard | null;
  isOpen: boolean;
}

export function useEditCardDrafts({ card, isOpen }: UseEditCardDraftsArgs) {
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previousTitleRef = useRef<string>("");
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");

  const adjustTitleHeight = useCallback((element?: HTMLTextAreaElement | null) => {
    const el = element ?? titleTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const capturePreviousTitle = useCallback(() => {
    previousTitleRef.current = titleDraft || card?.title || "";
    adjustTitleHeight();
  }, [adjustTitleHeight, card?.title, titleDraft]);

  useEffect(() => {
    if (!isOpen) return;
    setTitleDraft(card?.title ?? "");
  }, [card?.title, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setContentDraft(card?.content ?? "");
  }, [card?.content, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    adjustTitleHeight();
  }, [adjustTitleHeight, isOpen, titleDraft]);

  return {
    titleTextareaRef,
    previousTitleRef,
    titleDraft,
    setTitleDraft,
    contentDraft,
    setContentDraft,
    adjustTitleHeight,
    capturePreviousTitle,
  };
}
