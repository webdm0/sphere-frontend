"use client";

import { memo, useMemo, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import {
  DragDropProvider,
  type DragEndEvent as DragEndHandler,
  type DragMoveEvent as DragMoveHandler,
  type DragOverEvent as DragOverHandler,
  type DragStartEvent as DragStartHandler,
} from "@dnd-kit/react";
import {
  Accessibility,
  Feedback,
  KeyboardSensor,
  PointerSensor,
  type DragDropManager,
} from "@dnd-kit/dom";
import type { Plugins } from "@dnd-kit/abstract";
import BoardHeader from "@/components/layout/BoardHeader";
import BoardColumns from "@/components/boards/BoardColumns";
import MobileArchiveDropzone from "@/components/boards/MobileArchiveDropzone";
import ReadOnlyBanner from "@/components/boards/ReadOnlyBanner";
import type { ApiColumnCard, EntityId } from "@/types";

type UiCard = Omit<ApiColumnCard, "id"> & { id: string };
type DragStartEvent = Parameters<DragStartHandler>[0];
type DragMoveEvent = Parameters<DragMoveHandler>[0];
type DragOverEvent = Parameters<DragOverHandler>[0];
type DragEndEvent = Parameters<DragEndHandler>[0];

type ColumnLike = {
  id: string;
  title: string;
  cards: UiCard[];
};

const FAST_DROP_FEEDBACK_PLUGIN = Feedback.configure({
  dropAnimation: { duration: 120, easing: "ease-out" },
});
const POINTER_AND_KEYBOARD_SENSORS = [PointerSensor, KeyboardSensor];

function withBoardDndPlugins(
  defaults: Plugins<DragDropManager>,
): Plugins<DragDropManager> {
  return defaults
    .filter((plugin) =>
      typeof plugin === "function"
        ? plugin !== Accessibility
        : plugin.plugin !== Accessibility,
    )
    .map((plugin) =>
      typeof plugin === "function"
        ? plugin === Feedback
          ? FAST_DROP_FEEDBACK_PLUGIN
          : plugin
        : plugin.plugin === Feedback
          ? FAST_DROP_FEEDBACK_PLUGIN
          : plugin,
    );
}

interface BoardSurfaceProps {
  boardId: string;
  boardTitle?: string;
  isTitleLoading: boolean;
  optimisticBoardTitle: string;
  isMine: boolean;
  currentUsername: string;
  currentEmail: string;
  onLogout: () => void;
  onTitleOptimistic: (title: string) => void;
  onUpdateBoardTitle: (title: string) => Promise<unknown>;
  showMyCards: boolean;
  onToggleMyCards: () => void;
  onOpenArchive: () => void;
  onOpenArchiveKeyboard: () => void;
  onOpenManageUsers: () => void;
  onOpenManageUsersKeyboard: () => void;
  isBoardReadOnly: boolean;
  canRestoreBoard: boolean;
  isRestoringBoard: boolean;
  onOpenRestorePopover: (target: HTMLElement) => void;
  draggingItemType: "card" | "column" | null;
  isArchiveKeyboardTarget: boolean;
  archiveAcceptedTick: number;
  isKeyboardDrag: boolean;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragMove: (event: DragMoveEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  columns: ColumnLike[];
  isLoading: boolean;
  isDndLocked: boolean;
  isEditLocked: boolean;
  currentUserMemberId?: EntityId | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  isCreating: boolean;
  newColumnTitle: string;
  onStartCreateColumn: () => void;
  onCloseCreateColumn: () => void;
  onNewColumnTitleChange: (value: string) => void;
  onCreateColumn: () => void | Promise<void>;
  onColumnTitleUpdate: (id: string, newTitle: string) => Promise<void>;
  onOpenCard: (cardId: string, byKeyboard?: boolean, target?: HTMLElement) => void;
  onCreateCardErrorToast?: (message: string, note?: string) => void;
}

function BoardSurfaceBase({
  boardId,
  boardTitle,
  isTitleLoading,
  optimisticBoardTitle,
  isMine,
  currentUsername,
  currentEmail,
  onLogout,
  onTitleOptimistic,
  onUpdateBoardTitle,
  showMyCards,
  onToggleMyCards,
  onOpenArchive,
  onOpenArchiveKeyboard,
  onOpenManageUsers,
  onOpenManageUsersKeyboard,
  isBoardReadOnly,
  canRestoreBoard,
  isRestoringBoard,
  onOpenRestorePopover,
  draggingItemType,
  isArchiveKeyboardTarget,
  archiveAcceptedTick,
  isKeyboardDrag,
  handleDragStart,
  handleDragMove,
  handleDragOver,
  handleDragEnd,
  columns,
  isLoading,
  isDndLocked,
  isEditLocked,
  currentUserMemberId,
  scrollRef,
  isCreating,
  newColumnTitle,
  onStartCreateColumn,
  onCloseCreateColumn,
  onNewColumnTitleChange,
  onCreateColumn,
  onColumnTitleUpdate,
  onOpenCard,
  onCreateCardErrorToast,
}: BoardSurfaceProps) {
  const shouldReduceMotion = useReducedMotion();
  const user = useMemo(
    () => ({ username: currentUsername, email: currentEmail }),
    [currentEmail, currentUsername],
  );
  const isArchiveDragActive =
    !isBoardReadOnly &&
    (draggingItemType === "card" || draggingItemType === "column");
  const readOnlyCardMotion = useMemo(
    () =>
      shouldReduceMotion
        ? ({
            initial: false,
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0 },
          } as const)
        : ({
            initial: {
              opacity: 0,
              y: -2,
              height: 0,
              marginBottom: "calc(-1 * var(--board-stack-gap))",
              paddingTop: 0,
              paddingBottom: 0,
            },
            animate: {
              opacity: 1,
              y: 0,
              height: "auto",
              marginBottom: 0,
              paddingTop: "1rem",
              paddingBottom: "1rem",
            },
            exit: {
              opacity: 0,
              y: -2,
              height: 0,
              marginBottom: "calc(-1 * var(--board-stack-gap))",
              paddingTop: 0,
              paddingBottom: 0,
            },
            transition: { duration: 0.2, ease: "easeOut" },
          } as const),
    [shouldReduceMotion],
  );

  return (
    <DragDropProvider
      sensors={POINTER_AND_KEYBOARD_SENSORS}
      plugins={withBoardDndPlugins}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <ReadOnlyBanner
        isReadOnly={isBoardReadOnly}
        canRestore={canRestoreBoard}
        isRestoring={isRestoringBoard}
        motionPreset={readOnlyCardMotion}
        onRestoreClick={onOpenRestorePopover}
      />
      <BoardHeader
        onAddUsers={onOpenManageUsers}
        onAddUsersKeyboard={onOpenManageUsersKeyboard}
        user={user}
        onLogout={onLogout}
        isEditable={isMine && !isBoardReadOnly}
        isReadOnly={isBoardReadOnly}
        boardTitle={boardTitle}
        isTitleLoading={isTitleLoading}
        titleOverride={optimisticBoardTitle}
        onTitleOptimistic={onTitleOptimistic}
        onUpdateTitle={onUpdateBoardTitle}
        showMyCards={showMyCards}
        onToggleMyCards={onToggleMyCards}
        onOpenArchive={onOpenArchive}
        onOpenArchiveKeyboard={onOpenArchiveKeyboard}
        isArchiveDragActive={isArchiveDragActive}
        isArchiveKeyboardTarget={isArchiveKeyboardTarget}
        archiveDraggingItemType={draggingItemType}
        archiveAcceptedTick={archiveAcceptedTick}
        disableArchiveDropzone={isKeyboardDrag}
      />

      <BoardColumns
        boardId={boardId}
        columns={columns}
        isLoading={isLoading}
        isBoardReadOnly={isBoardReadOnly}
        isDndLocked={isDndLocked}
        isEditLocked={isEditLocked}
        showMyCards={showMyCards}
        currentUserMemberId={currentUserMemberId}
        scrollRef={scrollRef}
        isCreating={isCreating}
        newColumnTitle={newColumnTitle}
        onStartCreateColumn={onStartCreateColumn}
        onCloseCreateColumn={onCloseCreateColumn}
        onNewColumnTitleChange={onNewColumnTitleChange}
        onCreateColumn={onCreateColumn}
        onColumnTitleUpdate={onColumnTitleUpdate}
        onOpenCard={onOpenCard}
        onCreateCardErrorToast={onCreateCardErrorToast}
      />
      <MobileArchiveDropzone
        isVisible={isArchiveDragActive}
        draggingItemType={draggingItemType}
        isArchiveKeyboardTarget={isArchiveKeyboardTarget}
        disableDropzone={isKeyboardDrag}
      />
    </DragDropProvider>
  );
}

const BoardSurface = memo(BoardSurfaceBase);
BoardSurface.displayName = "BoardSurface";

export default BoardSurface;
