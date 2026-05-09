"use client";

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAccessToken } from "@/hooks/auth/useAccessToken";
import { refreshAccessToken } from "@/services/api/auth";
import { logOut, setAccessToken } from "@/store/slices/authSlice";
import type { AppDispatch } from "@/store/store";
import { writeRedirectToast } from "@/utils/redirectToast";
import {
  notifyAuthSessionExpired,
  redirectToLoginIfNeeded,
} from "@/utils/authSession";
import { buildApiUrl } from "@/utils/apiUrl";

type BoardSseEvent = {
  action: string;
  data: unknown;
};

type ParsedSseFrame = {
  id?: string;
  data: string;
};

type BoardEventAction =
  | "CONNECTED"
  | "RESYNC_REQUIRED"
  | "CARD_CREATED"
  | "CARD_UPDATED"
  | "CARD_RESTORED"
  | "CARD_DELETED"
  | "CARDS_REORDERED"
  | "COLUMN_CREATED"
  | "COLUMN_UPDATED"
  | "COLUMN_RESTORED"
  | "COLUMN_DELETED"
  | "COLUMNS_REORDERED"
  | "BOARD_UPDATED"
  | "BOARD_ARCHIVED"
  | "BOARD_RESTORED"
  | "MEMBER_INVITED"
  | "MEMBER_REMOVED"
  | "MEMBER_JOINED";

const CARD_ACTIONS = new Set<BoardEventAction>([
  "CARD_CREATED",
  "CARD_UPDATED",
  "CARD_RESTORED",
  "CARD_DELETED",
  "CARDS_REORDERED",
]);

const COLUMN_ACTIONS = new Set<BoardEventAction>([
  "COLUMN_CREATED",
  "COLUMN_UPDATED",
  "COLUMN_RESTORED",
  "COLUMN_DELETED",
  "COLUMNS_REORDERED",
]);

const BOARD_META_ACTIONS = new Set<BoardEventAction>([
  "BOARD_UPDATED",
  "BOARD_ARCHIVED",
  "BOARD_RESTORED",
]);

const MEMBER_ACTIONS = new Set<BoardEventAction>([
  "MEMBER_INVITED",
  "MEMBER_REMOVED",
  "MEMBER_JOINED",
]);

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const RECONNECT_JITTER_MS = 250;
const REFRESH_CONNECT_DELAY_MS = 250;
const SOFT_REFRESH_COOLDOWN_MS = 15000;
const INVALIDATION_DEBOUNCE_MS = 120;
const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
const ACCESS_REVOKED_MESSAGE = "You don't have access to this board.";

const getBackoffDelayMs = (attempt: number) => {
  const expDelay = Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, attempt),
    RECONNECT_MAX_DELAY_MS,
  );
  const jitter = Math.floor(Math.random() * RECONNECT_JITTER_MS);
  return expDelay + jitter;
};

const parseBoardSseEvent = (rawMessage: string): BoardSseEvent | null => {
  const normalized = rawMessage.trim();
  if (!normalized) return null;

  try {
    const parsed: unknown = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object") return null;

    const action = (parsed as { action?: unknown }).action;
    if (typeof action !== "string") return null;

    return {
      action,
      data: (parsed as { data?: unknown }).data,
    };
  } catch {
    if (normalized === "CONNECTED" || normalized === "RESYNC_REQUIRED") {
      return { action: normalized, data: null };
    }
    return null;
  }
};

const readSseStream = async (
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onFrame: (frame: ParsedSseFrame) => void
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentId: string | undefined;
  let dataLines: string[] = [];

  const resetFrame = () => {
    currentId = undefined;
    dataLines = [];
  };

  const emitFrame = () => {
    if (currentId === undefined && dataLines.length === 0) {
      return;
    }

    try {
      onFrame({
        id: currentId,
        data: dataLines.join("\n"),
      });
    } catch {
    }
    resetFrame();
  };

  const processLine = (line: string) => {
    if (line === "") {
      emitFrame();
      return;
    }

    if (line.startsWith(":")) return;

    const delimiterIndex = line.indexOf(":");
    const field = delimiterIndex === -1 ? line : line.slice(0, delimiterIndex);
    let value = delimiterIndex === -1 ? "" : line.slice(delimiterIndex + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    if (field === "data") {
      dataLines.push(value);
      return;
    }

    if (field === "id" && !value.includes("\u0000")) {
      currentId = value;
    }
  };

  try {
    while (true) {
      if (signal.aborted) {
        throw new DOMException("SSE stream aborted", "AbortError");
      }

      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        let line = buffer.slice(0, newlineIndex);
        if (line.endsWith("\r")) {
          line = line.slice(0, -1);
        }

        buffer = buffer.slice(newlineIndex + 1);
        processLine(line);

        newlineIndex = buffer.indexOf("\n");
      }
    }

    buffer += decoder.decode();
    if (buffer.length > 0) {
      let trailingLine = buffer;
      if (trailingLine.endsWith("\r")) {
        trailingLine = trailingLine.slice(0, -1);
      }
      processLine(trailingLine);
    }

    emitFrame();
  } finally {
    reader.releaseLock();
  }
};

export function useBoardEvents(boardId?: string) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();

  const streamAbortRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const lastRefreshTryAtRef = useRef(0);
  const latestBoardIdRef = useRef<string | undefined>(boardId);
  const latestTokenRef = useRef<string | null>(accessToken);
  const trackedBoardRef = useRef<string | undefined>(boardId);
  const lastEventIdRef = useRef<string | null>(null);
  const accessRevokedRef = useRef(false);
  const connectRunIdRef = useRef(0);

  useEffect(() => {
    if (trackedBoardRef.current !== boardId) {
      trackedBoardRef.current = boardId;
      lastEventIdRef.current = null;
      reconnectAttemptRef.current = 0;
      accessRevokedRef.current = false;
    }

    latestBoardIdRef.current = boardId;
    latestTokenRef.current = accessToken;
  }, [accessToken, boardId]);

  useEffect(() => {
    let isStopped = false;
    let isPageUnloading = false;
    let invalidationTimer: ReturnType<typeof setTimeout> | null = null;
    let invalidationsInFlight = false;
    let invalidationRerunRequested = false;

    type PendingInvalidations = {
      boardTree: boolean;
      boardMeta: boolean;
      boardMembers: boolean;
      boardsLists: boolean;
      cardDetails: boolean;
    };

    const pendingInvalidations: PendingInvalidations = {
      boardTree: false,
      boardMeta: false,
      boardMembers: false,
      boardsLists: false,
      cardDetails: false,
    };

    const canConnect = () =>
      Boolean(
        latestBoardIdRef.current &&
        latestTokenRef.current &&
        API_URL &&
        !accessRevokedRef.current
      );

    const isRuntimeInactive = () =>
      isStopped || isPageUnloading || document.visibilityState === "hidden";

    const clearReconnectTimer = () => {
      if (!reconnectTimerRef.current) return;
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    };

    const clearInvalidationTimer = () => {
      if (!invalidationTimer) return;
      clearTimeout(invalidationTimer);
      invalidationTimer = null;
    };

    const closeStream = () => {
      if (!streamAbortRef.current) return;
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    };

    const scheduleReconnect = (delayMs: number, connect: () => void) => {
      if (isRuntimeInactive() || accessRevokedRef.current) return;
      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delayMs);
    };

    const trySoftRefresh = (options?: { force?: boolean }) => {
      const force = options?.force === true;

      return (async () => {
        if (isRuntimeInactive()) return false;
        if (!latestTokenRef.current) return false;

        const now = Date.now();
        if (!force) {
          const isInCooldown =
            now - lastRefreshTryAtRef.current < SOFT_REFRESH_COOLDOWN_MS;
          if (isInCooldown) return false;
          lastRefreshTryAtRef.current = now;
        }

        if (!refreshPromiseRef.current) {
          refreshPromiseRef.current = refreshAccessToken()
            .then((response) => response?.accessToken ?? null)
            .finally(() => {
              refreshPromiseRef.current = null;
            });
        }

        const refreshedToken = await refreshPromiseRef.current;
        if (!refreshedToken || isRuntimeInactive()) return false;

        lastRefreshTryAtRef.current = now;
        latestTokenRef.current = refreshedToken;
        dispatch(setAccessToken(refreshedToken));
        return true;
      })();
    };

    const invalidateBoardTreeQueries = async (currentBoardId: string) => {
      await queryClient.invalidateQueries({ queryKey: ["board", currentBoardId] });
    };

    const invalidateBoardMeta = async (currentBoardId: string) => {
      await queryClient.invalidateQueries({
        queryKey: ["board", currentBoardId, "meta"],
      });
    };

    const invalidateBoardMembers = async (currentBoardId: string) => {
      await queryClient.invalidateQueries({ queryKey: ["boardMembers", currentBoardId] });
    };

    const invalidateBoardsLists = async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["boards"] }),
        queryClient.invalidateQueries({ queryKey: ["boards", "archived"] }),
      ]);
    };

    const invalidateCardDetails = async () => {
      await queryClient.invalidateQueries({ queryKey: ["card"] });
    };

    const hasPendingInvalidations = () =>
      pendingInvalidations.boardTree ||
      pendingInvalidations.boardMeta ||
      pendingInvalidations.boardMembers ||
      pendingInvalidations.boardsLists ||
      pendingInvalidations.cardDetails;

    const applyPendingInvalidations = (next: Partial<PendingInvalidations>) => {
      if (next.boardTree) pendingInvalidations.boardTree = true;
      if (next.boardMeta) pendingInvalidations.boardMeta = true;
      if (next.boardMembers) pendingInvalidations.boardMembers = true;
      if (next.boardsLists) pendingInvalidations.boardsLists = true;
      if (next.cardDetails) pendingInvalidations.cardDetails = true;
    };

    const takePendingInvalidations = (): PendingInvalidations => {
      const snapshot = { ...pendingInvalidations };
      pendingInvalidations.boardTree = false;
      pendingInvalidations.boardMeta = false;
      pendingInvalidations.boardMembers = false;
      pendingInvalidations.boardsLists = false;
      pendingInvalidations.cardDetails = false;
      return snapshot;
    };

    const runInvalidationBatch = async (
      currentBoardId: string,
      batch: PendingInvalidations
    ) => {
      const jobs: Promise<unknown>[] = [];

      if (batch.boardTree) {
        jobs.push(invalidateBoardTreeQueries(currentBoardId));
      } else if (batch.boardMeta) {
        jobs.push(invalidateBoardMeta(currentBoardId));
      }
      if (batch.boardMembers) {
        jobs.push(invalidateBoardMembers(currentBoardId));
      }
      if (batch.boardsLists) {
        jobs.push(invalidateBoardsLists());
      }
      if (batch.cardDetails) {
        jobs.push(invalidateCardDetails());
      }

      if (jobs.length > 0) {
        await Promise.all(jobs);
      }
    };

    const flushInvalidations = () => {
      if (isRuntimeInactive()) return;
      const currentBoardId = latestBoardIdRef.current;
      if (!currentBoardId) return;

      if (invalidationsInFlight) {
        invalidationRerunRequested = true;
        return;
      }

      const batch = takePendingInvalidations();
      if (
        !batch.boardTree &&
        !batch.boardMeta &&
        !batch.boardMembers &&
        !batch.boardsLists &&
        !batch.cardDetails
      ) {
        return;
      }

      invalidationsInFlight = true;
      void (async () => {
        try {
          await runInvalidationBatch(currentBoardId, batch);
        } finally {
          invalidationsInFlight = false;
          if (invalidationRerunRequested || hasPendingInvalidations()) {
            invalidationRerunRequested = false;
            scheduleInvalidationFlush(0);
          }
        }
      })();
    };

    const scheduleInvalidationFlush = (delayMs = INVALIDATION_DEBOUNCE_MS) => {
      if (isRuntimeInactive()) return;
      clearInvalidationTimer();

      invalidationTimer = setTimeout(() => {
        invalidationTimer = null;
        flushInvalidations();
      }, Math.max(0, delayMs));
    };

    const enqueueInvalidations = (
      next: Partial<PendingInvalidations>,
      options?: { immediate?: boolean }
    ) => {
      applyPendingInvalidations(next);
      scheduleInvalidationFlush(options?.immediate ? 0 : INVALIDATION_DEBOUNCE_MS);
    };

    const requestFullResync = (options?: { immediate?: boolean }) => {
      enqueueInvalidations(
        {
          boardTree: true,
          boardMembers: true,
          boardsLists: true,
          cardDetails: true,
        },
        options
      );
    };

    const handleSessionExpired = () => {
      clearReconnectTimer();
      closeStream();
      clearInvalidationTimer();
      latestTokenRef.current = null;
      dispatch(logOut());
      notifyAuthSessionExpired();
      redirectToLoginIfNeeded();
    };

    const handleAccessRevoked = () => {
      if (accessRevokedRef.current) return;
      accessRevokedRef.current = true;
      clearReconnectTimer();
      closeStream();
      clearInvalidationTimer();
      writeRedirectToast({ message: ACCESS_REVOKED_MESSAGE });
      router.replace("/boards");
    };

    const processIncomingFrame = (frame: ParsedSseFrame) => {
      if (frame.id !== undefined) {
        lastEventIdRef.current = frame.id;
      }

      const payload = parseBoardSseEvent(frame.data);
      const action = (payload?.action ?? null) as BoardEventAction | null;
      if (!action) return;

      if (action === "CONNECTED") return;

      if (action === "RESYNC_REQUIRED") {
        requestFullResync({ immediate: true });
        return;
      }

      const nextInvalidations: Partial<PendingInvalidations> = {};

      if (CARD_ACTIONS.has(action)) {
        nextInvalidations.boardTree = true;
        nextInvalidations.cardDetails = true;
      }

      if (COLUMN_ACTIONS.has(action)) {
        nextInvalidations.boardTree = true;
      }

      if (BOARD_META_ACTIONS.has(action)) {
        nextInvalidations.boardMeta = true;
        nextInvalidations.boardsLists = true;
      }

      if (MEMBER_ACTIONS.has(action)) {
        nextInvalidations.boardMembers = true;
        nextInvalidations.boardsLists = true;

        if (action === "MEMBER_REMOVED") {
          nextInvalidations.boardMeta = true;
        }
      }

      enqueueInvalidations(nextInvalidations);
    };

    const connect = () => {
      const currentBoardId = latestBoardIdRef.current;
      const currentToken = latestTokenRef.current;

      if (!currentBoardId || !currentToken || !API_URL) return;
      if (isRuntimeInactive() || accessRevokedRef.current) return;

      clearReconnectTimer();
      closeStream();

      const controller = new AbortController();
      streamAbortRef.current = controller;
      const runId = connectRunIdRef.current + 1;
      connectRunIdRef.current = runId;

      void (async () => {
        try {
          const url = buildApiUrl(
            API_URL,
            `/api/events/${encodeURIComponent(currentBoardId)}`
          );

          const headers: Record<string, string> = {
            Authorization: `Bearer ${currentToken}`,
            Accept: "text/event-stream",
          };

          if (lastEventIdRef.current) {
            headers["Last-Event-ID"] = lastEventIdRef.current;
          }

          const response = await fetch(url, {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          });

          if (controller.signal.aborted || connectRunIdRef.current !== runId) return;

          if (!response.ok) {
            const err = new Error(
              `SSE connect failed with status ${response.status}`
            ) as Error & { status?: number };
            err.status = response.status;
            throw err;
          }

          if (!response.body) {
            throw new Error("SSE response body is empty.");
          }

          reconnectAttemptRef.current = 0;

          await readSseStream(response.body, controller.signal, (frame) => {
            if (controller.signal.aborted || connectRunIdRef.current !== runId) {
              return;
            }
            processIncomingFrame(frame);
          });

          if (controller.signal.aborted || connectRunIdRef.current !== runId) return;
          const delayMs = getBackoffDelayMs(reconnectAttemptRef.current);
          reconnectAttemptRef.current += 1;
          scheduleReconnect(delayMs, connect);
        } catch (error) {
          if (controller.signal.aborted || connectRunIdRef.current !== runId) return;

          const status = (error as { status?: number }).status;
          if (status === 403) {
            handleAccessRevoked();
            return;
          }

          if (status === 401) {
            const refreshed = await trySoftRefresh({ force: true });
            if (controller.signal.aborted || connectRunIdRef.current !== runId) return;

            if (refreshed) {
              reconnectAttemptRef.current = 0;
              scheduleReconnect(REFRESH_CONNECT_DELAY_MS, connect);
              return;
            }

            handleSessionExpired();
            return;
          }

          const errorName = (error as { name?: string })?.name;
          if (errorName === "AbortError") return;

          const refreshed = await trySoftRefresh();
          if (controller.signal.aborted || connectRunIdRef.current !== runId) return;

          if (refreshed) {
            reconnectAttemptRef.current = 0;
            scheduleReconnect(REFRESH_CONNECT_DELAY_MS, connect);
            return;
          }

          const delayMs = getBackoffDelayMs(reconnectAttemptRef.current);
          reconnectAttemptRef.current += 1;
          scheduleReconnect(delayMs, connect);
        } finally {
          if (streamAbortRef.current === controller) {
            streamAbortRef.current = null;
          }
        }
      })();
    };

    const syncNow = () => {
      if (isRuntimeInactive()) return;
      requestFullResync({ immediate: true });
    };

    const handleBeforeUnload = () => {
      isPageUnloading = true;
      clearReconnectTimer();
      closeStream();
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      isPageUnloading = true;
      clearReconnectTimer();
      closeStream();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearReconnectTimer();
        closeStream();
        return;
      }

      syncNow();
      reconnectAttemptRef.current = 0;
      if (canConnect()) {
        connect();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "hidden") return;
      syncNow();
      reconnectAttemptRef.current = 0;
      if (canConnect()) {
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    if (boardId && accessToken && API_URL) {
      connect();
    } else {
      clearReconnectTimer();
      closeStream();
    }

    return () => {
      isStopped = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearReconnectTimer();
      closeStream();
      clearInvalidationTimer();
    };
  }, [accessToken, boardId, dispatch, queryClient, router]);
}
