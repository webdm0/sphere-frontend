"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const ARCHIVE_RENDER_BATCH_SIZE = 5;

const LOAD_MORE_THRESHOLD_PX = 72;

function findScrollParent(node: HTMLElement | null) {
  let parent = node?.parentElement ?? null;

  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

export function useIncrementalArchiveRender<T>(
  items: readonly T[],
  batchSize = ARCHIVE_RENDER_BATCH_SIZE
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const listRef = useRef<HTMLDivElement | null>(null);
  const totalCount = items.length;
  const clampedVisibleCount = Math.min(visibleCount, totalCount);
  const hasMore = clampedVisibleCount < totalCount;

  const visibleItems = useMemo(
    () => items.slice(0, clampedVisibleCount),
    [clampedVisibleCount, items]
  );

  const loadMore = useCallback(() => {
    setVisibleCount((current) =>
      current >= totalCount ? current : Math.min(current + batchSize, totalCount)
    );
  }, [batchSize, totalCount]);

  useEffect(() => {
    const scrollParent = findScrollParent(listRef.current);
    if (!scrollParent || !hasMore) return;

    let frameId: number | null = null;

    const maybeLoadMore = () => {
      frameId = null;
      const remaining =
        scrollParent.scrollHeight -
        scrollParent.scrollTop -
        scrollParent.clientHeight;

      if (remaining <= LOAD_MORE_THRESHOLD_PX) {
        loadMore();
      }
    };

    const handleScroll = () => {
      if (frameId != null) return;
      frameId = window.requestAnimationFrame(maybeLoadMore);
    };

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
      scrollParent.removeEventListener("scroll", handleScroll);
    };
  }, [hasMore, loadMore]);

  return {
    hasMore,
    listRef,
    visibleCount: clampedVisibleCount,
    visibleItems,
  };
}
