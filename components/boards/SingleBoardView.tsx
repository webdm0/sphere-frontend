"use client";

import styles from "@/components/boards/SingleBoardView.module.css";
import BoardSurface from "@/components/boards/BoardSurface";
import BoardModals from "@/components/boards/BoardModals";
import RestorePopover from "@/components/boards/RestorePopover";
import ToastLayer from "@/components/common/ToastLayer";
import { useBoardArchive } from "@/hooks/archive/useBoardArchive";
import { useBoardArchiveActions } from "@/hooks/archive/useBoardArchiveActions";
import { useArchivedBoards } from "@/hooks/archive/useArchivedBoards";
import { useBoard } from "@/hooks/board/useBoardApi";
import { useCreateColumn } from "@/hooks/board/useCreateColumn";
import { useBoardLocalColumns } from "@/hooks/board/useBoardLocalColumns";
import { useBoardReorderQueue } from "@/hooks/board/useBoardReorderQueue";
import { useBoardRedirect } from "@/hooks/board/useBoardRedirect";
import { useBoardScrollPan } from "@/hooks/board/useBoardScrollPan";
import { useBoardTitle } from "@/hooks/board/useBoardTitle";
import { useRestoreBoard } from "@/hooks/board/useRestoreBoard";
import { useRestorePopover } from "@/hooks/board/useRestorePopover";
import { useBoardEvents } from "@/hooks/board/useBoardEvents";
import { useAppAuth } from "@/hooks/auth/useAppAuth";
import { useBoards } from "@/hooks/board/useBoardsApi";
import { useBoardMembers } from "@/hooks/board/useBoardMembers";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { useCards } from "@/hooks/card/useCards";
import { useParams } from "next/navigation";
import { useBoardDnd } from "@/hooks/board/useBoardDnd";
import type { EntityId } from "@/types";

const DEMO_COLLABORATION_TOAST_MESSAGE =
  "Collaboration is unavailable in demo.";
const DEMO_COLLABORATION_TOAST_NOTE = "Private boards only.";

interface KanbanBoardProps {
  boardId?: string;
}

export default function KanbanBoard({
  boardId: boardIdProp,
}: KanbanBoardProps = {}) {
  const params = useParams();
  const routeBoardId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const boardId = boardIdProp ?? routeBoardId;
  useBoardEvents(boardId);

  const {
    columns,
    board,
    refresh,
    createColumn,
    editColumn,
    restoreColumn,
    deleteColumnForever,
    reorderColumn,
    reorderCardsInColumn,
    isLoading,
    isReadOnly,
    boardError,
    columnsError,
  } = useBoard(boardId);

  const { user, logout } = useAppAuth();
  const { boards, restore: restoreBoard, update: updateBoardTitle } = useBoards();

  const currentBoardListItem =
    boardId != null ? boards.find((b) => b.id === boardId) : undefined;
  const derivedBoardTitle =
    board?.title ?? currentBoardListItem?.title ?? "Untitled";
  const {
    optimisticTitle: optimisticBoardTitle,
    setOptimisticTitle: setOptimisticBoardTitle,
  } = useBoardTitle(derivedBoardTitle);
  useBoardRedirect(boardId, boardError, columnsError);
  const isMine = currentBoardListItem?.isMine ?? false;
  const isBoardReadOnly = isReadOnly;
  const { archivedBoards } = useArchivedBoards(isBoardReadOnly);
  const archivedBoardListItem =
    boardId != null ? archivedBoards.find((b) => b.id === boardId) : undefined;
  const isOwner = isMine || archivedBoardListItem?.isMine || false;
  const canRestoreBoard = isBoardReadOnly && isOwner;

  const [isManageUsersOpen, setManageUsersOpen] = useState(false);
  const [isArchiveOpen, setArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"cards" | "columns">("cards");
  const [archiveOpenedByKeyboard, setArchiveOpenedByKeyboard] = useState(false);
  const { archivedColumns, archivedCards, isColumnsLoading, isCardsLoading } =
    useBoardArchive(boardId ? String(boardId) : undefined, isArchiveOpen);

  const {
    popover: restorePopover,
    isVisible: restorePopoverVisible,
    popoverRef: restorePopoverRef,
    openPopover: openRestorePopover,
    closePopover: closeRestorePopover,
  } = useRestorePopover();

  const [showMyCards, setShowMyCards] = useState(false);

  const handleToggleMyCards = useCallback(
    () => setShowMyCards((prev) => !prev),
    [],
  );
  const [localColumns, setLocalColumns] = useState(columns);
  const [activeCardId, setActiveCardId] = useState<EntityId | null>(null);
  const [activeCardOpenedByKeyboard, setActiveCardOpenedByKeyboard] =
    useState(false);
  const [manageUsersOpenedByKeyboard, setManageUsersOpenedByKeyboard] =
    useState(false);
  const [archiveAcceptedTick, setArchiveAcceptedTick] = useState(0);
  const toastIdRef = useRef(0);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    note?: string;
  } | null>(null);
  const showBoardToast = useCallback((message: string, note?: string) => {
    toastIdRef.current += 1;
    setToast({
      id: toastIdRef.current,
      message,
      note,
    });
  }, []);
  const restoreColumnMutations = useIsMutating({
    mutationKey: ["restore", "column"],
  });
  const restoreCardMutations = useIsMutating({
    mutationKey: ["restore", "card"],
  });
  const isDndLocked = restoreColumnMutations > 0 || restoreCardMutations > 0;

  const scrollRef = useBoardScrollPan(isLoading);
  const scrollToAddColumn = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      el.scrollTo({ left: maxScroll, behavior });
    },
    [scrollRef],
  );
  const { update: updateCard } = useCards(undefined, boardId);
  const handleColumnTitleUpdate = useCallback(
    async (id: string, newTitle: string) => {
      if (isBoardReadOnly) return;
      await editColumn(id, { title: newTitle });
    },
    [editColumn, isBoardReadOnly],
  );
  const {
    optimisticLayout,
    hasPendingReorders,
    commitColumnReorder,
    commitCardReorder,
  } = useBoardReorderQueue({
    reorderColumn,
    reorderCardsInColumn,
    refresh,
  });
  const handleArchiveAccepted = useCallback(() => {
    setArchiveAcceptedTick((prev) => prev + 1);
  }, []);

  const {
    pendingArchivedCards,
    pendingArchivedColumns,
    archiveCardById,
    archiveColumnById,
  } = useBoardArchiveActions({
    boardId,
    localColumns,
    setLocalColumns,
    archivedCards,
    archivedColumns,
    updateCard,
    editColumn,
  });

  const {
    draggingItemType,
    isKeyboardDrag,
    isArchiveKeyboardTarget,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragEnd,
  } = useBoardDnd({
    localColumns,
    setLocalColumns,
    boardScrollRef: scrollRef,
    isBoardReadOnly,
    isDndLocked,
    onErrorToast: showBoardToast,
    onArchiveAccepted: handleArchiveAccepted,
    commitColumnReorder,
    commitCardReorder,
    archiveColumnById,
    archiveCardById,
  });

  useBoardLocalColumns({
    columns,
    pendingArchivedCards,
    pendingArchivedColumns,
    setLocalColumns,
    isDragActive: draggingItemType != null,
    optimisticLayout,
    hasPendingReorders,
  });
  const handleCardArchiveToggle = useCallback(
    async (cardId: EntityId, nextArchived: boolean) => {
      if (isBoardReadOnly) return;
      if (!nextArchived) return;

      try {
        await archiveCardById(cardId);
        handleArchiveAccepted();
      } catch {
        showBoardToast("Failed to archive card.");
      }
    },
    [archiveCardById, handleArchiveAccepted, isBoardReadOnly, showBoardToast],
  );

  const lastCardTriggerRef = useRef<HTMLElement | null>(null);

  const handleOpenCard = useCallback(
    (cardId: string, byKeyboard = false, target?: HTMLElement) => {
      if (hasPendingReorders) return;
      setActiveCardId(cardId);
      setActiveCardOpenedByKeyboard(byKeyboard);
      if (target) lastCardTriggerRef.current = target;
    },
    [hasPendingReorders],
  );

  const handleCloseCard = useCallback(() => {
    setActiveCardId(null);
    if (activeCardOpenedByKeyboard && lastCardTriggerRef.current?.isConnected) {
      lastCardTriggerRef.current.focus({ preventScroll: true });
    }
    setActiveCardOpenedByKeyboard(false);
  }, [activeCardOpenedByKeyboard]);

  const { isRestoring: isRestoringBoard, handleRestore: handleRestoreBoard } =
    useRestoreBoard({
      boardId: boardId ?? null,
      restoreBoard,
      refresh,
      onErrorToast: showBoardToast,
    });

  const boardRef = useRef<HTMLDivElement | null>(null);

  const focusableSelector = useMemo(
    () =>
      [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        'input:not([disabled]):not([type="hidden"])',
        "select:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ].join(","),
    [],
  );

  useEffect(() => {
    if (!restorePopoverVisible) return;
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const popoverEl = restorePopoverRef.current;
      if (!popoverEl || !popoverEl.contains(event.target as Node)) return;

      const containerEl = boardRef.current;
      if (!containerEl) return;

      const nodes = Array.from(
        containerEl.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (!nodes.length) return;

      const trigger = restorePopover?.trigger ?? null;
      const currentIndex = trigger ? nodes.indexOf(trigger) : -1;
      const startIndex =
        currentIndex === -1
          ? event.shiftKey
            ? nodes.length - 1
            : 0
          : currentIndex;

      const nextIndex = event.shiftKey
        ? startIndex <= 0
          ? nodes.length - 1
          : startIndex - 1
        : startIndex >= nodes.length - 1
          ? 0
          : startIndex + 1;

      event.preventDefault();
      const next = nodes[nextIndex];
      closeRestorePopover({ returnFocus: false });
      next?.focus({ preventScroll: true });
    };

    document.addEventListener("keydown", handleTab, true);
    return () => document.removeEventListener("keydown", handleTab, true);
  }, [
    closeRestorePopover,
    focusableSelector,
    restorePopover?.trigger,
    restorePopoverRef,
    restorePopoverVisible,
  ]);

  const columnTitlesById = useMemo(() => {
    const entries = [
      ...columns.map((c) => [c.id, c.title] as const),
      ...archivedColumns.map((c) => [c.id, c.title] as const),
    ];
    return entries.reduce<Record<string, string>>((acc, [id, title]) => {
      acc[id] = title;
      return acc;
    }, {});
  }, [archivedColumns, columns]);

  const {
    isCreating,
    setIsCreating,
    newColumnTitle,
    setNewColumnTitle,
    closeCreateColumn,
    handleCreateColumn,
  } = useCreateColumn({
    isReadOnly: isBoardReadOnly,
    createColumn,
    scrollToAddColumn,
    columnsCount: localColumns.length,
    onErrorToast: showBoardToast,
  });

  const currentUsername = user?.username ?? "";
  const currentEmail = user?.email ?? "";
  const isDemoUser = Boolean(user?.isDemo);
  const { currentMemberId: currentUserMemberId } = useBoardMembers(boardId, {
    enabled: Boolean(boardId),
    currentUsername,
    currentEmail,
    isBoardOwner: isMine,
  });
  const handleOpenManageUsers = useCallback(() => {
    if (isDemoUser) {
      showBoardToast(
        DEMO_COLLABORATION_TOAST_MESSAGE,
        DEMO_COLLABORATION_TOAST_NOTE,
      );
      return;
    }
    setManageUsersOpenedByKeyboard(false);
    setManageUsersOpen(true);
  }, [isDemoUser, showBoardToast]);
  const handleOpenManageUsersKeyboard = useCallback(() => {
    if (isDemoUser) {
      showBoardToast(
        DEMO_COLLABORATION_TOAST_MESSAGE,
        DEMO_COLLABORATION_TOAST_NOTE,
      );
      return;
    }
    setManageUsersOpenedByKeyboard(true);
    setManageUsersOpen(true);
  }, [isDemoUser, showBoardToast]);
  const handleOpenArchive = useCallback(() => {
    setArchiveTab("cards");
    setArchiveOpen(true);
    setArchiveOpenedByKeyboard(false);
  }, []);
  const handleOpenArchiveKeyboard = useCallback(() => {
    setArchiveTab("cards");
    setArchiveOpen(true);
    setArchiveOpenedByKeyboard(true);
  }, []);
  const handleStartCreateColumn = useCallback(() => {
    setIsCreating(true);
  }, [setIsCreating]);
  const handleBoardTitleOptimistic = useCallback(
    (title: string) => setOptimisticBoardTitle(title),
    [setOptimisticBoardTitle],
  );
  const handleBoardTitleUpdate = useCallback(
    (title: string) => {
      if (!boardId) return Promise.resolve(null);
      return updateBoardTitle({ id: boardId, title });
    },
    [boardId, updateBoardTitle],
  );
  const handleCloseManageUsers = useCallback(() => {
    setManageUsersOpen(false);
  }, []);
  const handleCloseArchive = useCallback(() => {
    setArchiveOpen(false);
  }, []);

  if (!boardId) return null;

  return (
    <div
      ref={boardRef}
      className={`${styles.boardWrapper} ${
        isBoardReadOnly ? styles.readOnly : ""
      } ${draggingItemType === "card" ? styles.draggingCards : ""}`}
    >
      <BoardSurface
        boardId={boardId}
        boardTitle={board?.title}
        isTitleLoading={Boolean(isLoading && !board && !currentBoardListItem)}
        optimisticBoardTitle={optimisticBoardTitle}
        isMine={isMine}
        currentUsername={currentUsername}
        currentEmail={currentEmail}
        onLogout={logout}
        onTitleOptimistic={handleBoardTitleOptimistic}
        onUpdateBoardTitle={handleBoardTitleUpdate}
        showMyCards={showMyCards}
        onToggleMyCards={handleToggleMyCards}
        onOpenArchive={handleOpenArchive}
        onOpenArchiveKeyboard={handleOpenArchiveKeyboard}
        onOpenManageUsers={handleOpenManageUsers}
        onOpenManageUsersKeyboard={handleOpenManageUsersKeyboard}
        isBoardReadOnly={isBoardReadOnly}
        canRestoreBoard={canRestoreBoard}
        isRestoringBoard={isRestoringBoard}
        onOpenRestorePopover={openRestorePopover}
        draggingItemType={draggingItemType}
        isArchiveKeyboardTarget={isArchiveKeyboardTarget}
        archiveAcceptedTick={archiveAcceptedTick}
        isKeyboardDrag={isKeyboardDrag}
        handleDragStart={handleDragStart}
        handleDragMove={handleDragMove}
        handleDragOver={handleDragOver}
        handleDragEnd={handleDragEnd}
        columns={localColumns}
        isLoading={isLoading}
        isDndLocked={isDndLocked}
        isEditLocked={hasPendingReorders}
        currentUserMemberId={currentUserMemberId}
        scrollRef={scrollRef}
        isCreating={isCreating}
        newColumnTitle={newColumnTitle}
        onStartCreateColumn={handleStartCreateColumn}
        onCloseCreateColumn={closeCreateColumn}
        onNewColumnTitleChange={setNewColumnTitle}
        onCreateColumn={handleCreateColumn}
        onColumnTitleUpdate={handleColumnTitleUpdate}
        onOpenCard={handleOpenCard}
        onCreateCardErrorToast={showBoardToast}
      />

      {restorePopover && (
        <RestorePopover
          rect={restorePopover.rect}
          visible={restorePopoverVisible}
          isRestoring={isRestoringBoard}
          popoverRef={restorePopoverRef}
          onRequestClose={closeRestorePopover}
          onConfirmRestore={() => void handleRestoreBoard()}
        />
      )}

      <BoardModals
        boardId={boardId}
        currentUsername={currentUsername}
        currentEmail={currentEmail}
        isBoardOwner={isMine}
        isBoardReadOnly={isBoardReadOnly}
        isEditLocked={hasPendingReorders}
        activeCardId={activeCardId}
        activeCardOpenedByKeyboard={activeCardOpenedByKeyboard}
        onCloseCard={handleCloseCard}
        onToggleCardArchive={handleCardArchiveToggle}
        isManageUsersOpen={isManageUsersOpen}
        onCloseManageUsers={handleCloseManageUsers}
        manageUsersReturnFocus={manageUsersOpenedByKeyboard}
        isArchiveOpen={isArchiveOpen}
        onCloseArchive={handleCloseArchive}
        archiveReturnFocus={archiveOpenedByKeyboard}
        archivedColumns={archivedColumns}
        archivedCards={archivedCards}
        pendingArchivedColumns={pendingArchivedColumns}
        pendingArchivedCards={pendingArchivedCards}
        columnTitles={columnTitlesById}
        isColumnsLoading={isColumnsLoading}
        isCardsLoading={isCardsLoading}
        restoreColumn={restoreColumn}
        deleteColumnForever={deleteColumnForever}
        archiveTab={archiveTab}
        setArchiveTab={setArchiveTab}
      />
      {toast ? (
        <ToastLayer
          key={toast.id}
          message={toast.message}
          note={toast.note}
          onDismiss={() =>
            setToast((current) => (current?.id === toast.id ? null : current))
          }
        />
      ) : null}
    </div>
  );
}
