"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useBoards } from "@/hooks/board/useBoardsApi";
import { useArchivedBoards } from "@/hooks/archive/useArchivedBoards";
import { useClosedBoardsActions } from "@/hooks/archive/useClosedBoardsActions";
import { useBoardModals } from "@/hooks/board/useBoardModals";
import { useBoardCardMenuState } from "@/hooks/board/useBoardCardMenuState";
import { useBoardPrefetch } from "@/hooks/board/useBoardPrefetch";
import { useBoardTitleEdit } from "@/hooks/board/useBoardTitleEdit";
import { useAppAuth } from "@/hooks/auth/useAppAuth";
import CreateBoardModal from "@/components/modals/ModalsBoard/CreateBoardModal";
import ClosedBoardsModal from "@/components/modals/ModalsBoard/ClosedBoardsModal";
import BoardsGrid from "@/components/boards/BoardsGrid";
import styles from "@/components/boards/BoardsList.module.css";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiBoardListItem, EntityId } from "@/types";

interface BoardsListProps {
  isClosedBoardsOpen: boolean;
  onCloseClosedBoards: () => void;
  returnFocusOnClosedBoardsClose?: boolean;
  onToast?: (message: string, note?: string) => void;
}

const BOARDS_REFETCH_INTERVAL_MS = 15_000;

export default function BoardsList({
  isClosedBoardsOpen,
  onCloseClosedBoards,
  returnFocusOnClosedBoardsClose = true,
  onToast,
}: BoardsListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAppAuth();
  const [tab, setTab] = useState<"all" | "mine" | "shared">("all");
  const { confirmActionMap, setConfirmActionMap } = useBoardCardMenuState(
    styles.menuWrapper,
    styles.menuOpen
  );

  const {
    boards,
    isLoading,
    create,
    update,
    archive,
    leave,
    accept,
    decline,
    restore,
    remove,
  } = useBoards({
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchIntervalMs: BOARDS_REFETCH_INTERVAL_MS,
  });
  const { archivedBoards, isBoardsLoading } = useArchivedBoards(isClosedBoardsOpen);
  const {
    pendingClosedBoards,
    archiveClosedBoard,
    restoreClosedBoard,
  } = useClosedBoardsActions({
    archivedBoards,
    archiveBoard: archive,
    restoreBoard: restore,
  });
  const modals = useBoardModals();
  const [resetKey, setResetKey] = useState(0);
  const { prefetchBoard, schedulePrefetchBoard, cancelScheduledPrefetch } =
    useBoardPrefetch({
      router,
      queryClient,
    });
  const { textareaRef, closeEditMode, handleCommitTitle } = useBoardTitleEdit({
    modals,
    update,
  });

  const handleTabClick = (type: "all" | "mine" | "shared") => {
    setTab(type);
  };

  const filteredBoards = useMemo(() => {
    return boards.filter((board) => {
      if (tab === "all") return true;
      if (tab === "mine") return board.isMine;
      if (tab === "shared") return board.isShared;
      return true;
    });
  }, [boards, tab]);

  const handleRestoreBoard = async (board: ApiBoardListItem) => {
    await restoreClosedBoard(board);
  };

  const handleDeleteBoard = async (id: EntityId) => {
    await remove(id);
    queryClient.setQueryData<ApiBoardListItem[]>(["boards", "archived"], (old) => {
      if (!old) return old;
      const next = old.filter((board) => board.id !== id);
      return next.length === old.length ? old : next;
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Your Boards</h1>

      <div className={styles.tabsWrapper}>
        <div className={styles.tabs}>
          {["all", "mine", "shared"].map((t) => (
            <button
              key={t}
              className={
                tab === t
                  ? `${styles.tabItem} ${styles.tabActive} focus-ring`
                  : `${styles.tabItem} focus-ring`
              }
              onClick={() => handleTabClick(t as typeof tab)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <BoardsGrid
        tab={tab}
        boards={boards}
        isLoading={isLoading}
        filteredBoards={filteredBoards}
        modals={modals}
        textareaRef={textareaRef}
        onCommitTitle={handleCommitTitle}
        onCloseEdit={closeEditMode}
        prefetchBoard={prefetchBoard}
        schedulePrefetchBoard={schedulePrefetchBoard}
        cancelScheduledPrefetch={cancelScheduledPrefetch}
        confirmActionMap={confirmActionMap}
        setConfirmActionMap={setConfirmActionMap}
        archiveClosedBoard={archiveClosedBoard}
        leave={leave}
        accept={accept}
        decline={decline}
        onCreateBoard={(origin) => {
          setResetKey((prev) => prev + 1);
          modals.openCreate(origin === "keyboard");
        }}
      />

      <CreateBoardModal
        key={resetKey}
        onClose={modals.closeCreate}
        isOpen={modals.isCreateOpen}
        returnFocusOnClose={modals.openedByKeyboard}
        isDemo={Boolean(user?.isDemo)}
        create={async (params) => {
          try {
            await create(params);
          } catch {
            onToast?.("Failed to create board.");
          }
        }}
      />

      <ClosedBoardsModal
        isOpen={isClosedBoardsOpen}
        onClose={onCloseClosedBoards}
        returnFocusOnClose={returnFocusOnClosedBoardsClose}
        boards={archivedBoards}
        pendingBoards={pendingClosedBoards}
        isLoading={isBoardsLoading}
        onRestore={handleRestoreBoard}
        onDelete={handleDeleteBoard}
      />
    </div>
  );
}
