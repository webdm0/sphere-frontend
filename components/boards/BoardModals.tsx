"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApiArchivedCard, ApiColumn, EntityId } from "@/types";

const loadEditCardModal = () =>
  import("@/components/modals/ModalsCard/EditCardModal");
const loadManageBoardUsersModal = () =>
  import("@/components/modals/ModalsBoard/ManageBoardUsersModal");
const loadArchiveModal = () =>
  import("@/components/modals/ModalsArchive/ArchiveModal");

const EditCardModal = dynamic(loadEditCardModal, {
  ssr: false,
  loading: () => null,
});
const ManageBoardUsersModal = dynamic(loadManageBoardUsersModal, {
  ssr: false,
  loading: () => null,
});
const ArchiveModal = dynamic(loadArchiveModal, {
  ssr: false,
  loading: () => null,
});

interface BoardModalsProps {
  boardId: EntityId;
  currentUsername?: string;
  currentEmail?: string;
  isBoardOwner?: boolean;
  isBoardReadOnly: boolean;
  isEditLocked?: boolean;
  activeCardId: EntityId | null;
  activeCardOpenedByKeyboard?: boolean;
  onCloseCard: () => void;
  onToggleCardArchive: (cardId: EntityId, nextArchived: boolean) => void;
  isManageUsersOpen: boolean;
  onCloseManageUsers: () => void;
  manageUsersReturnFocus?: boolean;
  isArchiveOpen: boolean;
  onCloseArchive: () => void;
  archiveReturnFocus?: boolean;
  archivedColumns: ApiColumn[];
  archivedCards: ApiArchivedCard[];
  pendingArchivedColumns: ApiColumn[];
  pendingArchivedCards: ApiArchivedCard[];
  columnTitles: Record<string, string>;
  isColumnsLoading: boolean;
  isCardsLoading: boolean;
  restoreColumn: (id: string) => Promise<unknown>;
  deleteColumnForever: (id: string) => Promise<unknown>;
  archiveTab: "cards" | "columns";
  setArchiveTab: (tab: "cards" | "columns") => void;
}

export default function BoardModals({
  boardId,
  currentUsername,
  currentEmail,
  isBoardOwner,
  isBoardReadOnly,
  isEditLocked = false,
  activeCardId,
  activeCardOpenedByKeyboard = false,
  onCloseCard,
  onToggleCardArchive,
  isManageUsersOpen,
  onCloseManageUsers,
  manageUsersReturnFocus = true,
  isArchiveOpen,
  onCloseArchive,
  archiveReturnFocus = true,
  archivedColumns,
  archivedCards,
  pendingArchivedColumns,
  pendingArchivedCards,
  columnTitles,
  isColumnsLoading,
  isCardsLoading,
  restoreColumn,
  deleteColumnForever,
  archiveTab,
  setArchiveTab,
}: BoardModalsProps) {
  const [hasMountedEditCardModal, setHasMountedEditCardModal] = useState(false);
  const [hasMountedManageUsersModal, setHasMountedManageUsersModal] =
    useState(false);
  const [hasMountedArchiveModal, setHasMountedArchiveModal] = useState(false);

  useEffect(() => {
    if (activeCardId != null) {
      setHasMountedEditCardModal(true);
    }
  }, [activeCardId]);

  useEffect(() => {
    if (isManageUsersOpen) {
      setHasMountedManageUsersModal(true);
    }
  }, [isManageUsersOpen]);

  useEffect(() => {
    if (isArchiveOpen) {
      setHasMountedArchiveModal(true);
    }
  }, [isArchiveOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const preload = () => {
      void loadEditCardModal();
      void loadManageBoardUsersModal();
      void loadArchiveModal();
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preload, 600);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <>
      {hasMountedEditCardModal ? (
        <EditCardModal
          isOpen={activeCardId != null}
          onClose={onCloseCard}
          cardId={activeCardId ?? ""}
          boardId={boardId}
          readOnly={isBoardReadOnly || isEditLocked}
          openedByKeyboard={activeCardOpenedByKeyboard}
          onToggleArchive={onToggleCardArchive}
        />
      ) : null}

      {hasMountedManageUsersModal ? (
        <ManageBoardUsersModal
          isOpen={isManageUsersOpen}
          onClose={onCloseManageUsers}
          boardId={boardId}
          currentUsername={currentUsername}
          currentEmail={currentEmail}
          isBoardOwner={isBoardOwner}
          readOnly={isBoardReadOnly}
          returnFocusOnClose={manageUsersReturnFocus}
        />
      ) : null}

      {hasMountedArchiveModal ? (
        <ArchiveModal
          isOpen={isArchiveOpen}
          onClose={onCloseArchive}
          archivedColumns={archivedColumns}
          archivedCards={archivedCards}
          pendingArchivedColumns={pendingArchivedColumns}
          pendingArchivedCards={pendingArchivedCards}
          columnTitles={columnTitles}
          isColumnsLoading={isColumnsLoading}
          isCardsLoading={isCardsLoading}
          activeTab={archiveTab}
          setActiveTab={setArchiveTab}
          boardId={boardId}
          isBoardReadOnly={isBoardReadOnly}
          restoreColumn={restoreColumn}
          deleteColumnForever={deleteColumnForever}
          returnFocusOnClose={archiveReturnFocus}
        />
      ) : null}
    </>
  );
}
