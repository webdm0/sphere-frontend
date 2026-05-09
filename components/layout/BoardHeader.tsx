"use client";

import { memo, useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import MobileBoardHeaderMenu from "@/components/layout/MobileBoardHeaderMenu";
import styles from "@/components/layout/BoardHeader.module.css";
import NavigateBackIcon from "@/components/icons/NavigateBackIcon";
import SkeletonBoardTitle from "@/components/skeletons/SkeletonBoardTitle";
import EyeIcon from "@/components/icons/EyeIcon";
import ArchiveIcon from "@/components/icons/ArchiveIcon";
import MembersIcon from "@/components/icons/MembersIcon";
import { useDroppable } from "@dnd-kit/react";
import {
  defaultCollisionDetection,
  shapeIntersection,
  type CollisionDetector,
} from "@dnd-kit/collision";
import { CollisionPriority } from "@dnd-kit/abstract";
import PortalTooltip from "@/components/ui/PortalTooltip";

interface BoardHeaderProps {
  onAddUsers: () => void;
  onAddUsersKeyboard?: () => void;
  user: { username: string; email: string };
  onLogout: () => void;
  isEditable: boolean;
  isReadOnly?: boolean;
  boardTitle?: string;
  isTitleLoading?: boolean;
  titleOverride?: string;
  onTitleOptimistic?: (title: string) => void;
  onUpdateTitle?: (title: string) => Promise<unknown>;
  showMyCards?: boolean;
  onToggleMyCards?: () => void;
  onOpenArchive?: () => void;
  onOpenArchiveKeyboard?: () => void;
  isArchiveDragActive?: boolean;
  isArchiveKeyboardTarget?: boolean;
  archiveDraggingItemType?: "card" | "column" | null;
  archiveAcceptedTick?: number;
  disableArchiveDropzone?: boolean;
}

const archiveCollisionDetector: CollisionDetector = (input) => {
  const sourceType = input.dragOperation.source?.type;

  if (sourceType === "column") {
    return shapeIntersection(input) ?? defaultCollisionDetection(input);
  }

  return defaultCollisionDetection(input);
};

function BoardHeader({
  onAddUsers,
  onAddUsersKeyboard,
  user,
  onLogout,
  isEditable,
  isReadOnly = false,
  boardTitle,
  isTitleLoading = false,
  titleOverride,
  onTitleOptimistic,
  onUpdateTitle,
  showMyCards = false,
  onToggleMyCards,
  onOpenArchive,
  onOpenArchiveKeyboard,
  isArchiveDragActive = false,
  isArchiveKeyboardTarget = false,
  archiveDraggingItemType = null,
  archiveAcceptedTick = 0,
  disableArchiveDropzone = false,
}: BoardHeaderProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const acceptedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isBackNavigating, setIsBackNavigating] = useState(false);
  const [isArchiveAccepted, setIsArchiveAccepted] = useState(false);

  const currentTitle = editingTitle ?? titleOverride ?? boardTitle ?? "Untitled";

  useLayoutEffect(() => {
    if (!isEditing) return;

    const input = titleInputRef.current;
    if (!input) return;

    const valueLength = input.value.length;
    const hasOverflow = input.scrollWidth > input.clientWidth + 1;

    if (hasOverflow) {
      input.setSelectionRange(0, valueLength);
      input.scrollLeft = 0;
      return;
    }

    input.setSelectionRange(valueLength, valueLength);
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing && (boardTitle !== undefined || titleOverride !== undefined)) {
      setEditingTitle(null);
    }
  }, [boardTitle, titleOverride, isEditing]);

  useEffect(() => {
    if (!archiveAcceptedTick) return;

    if (acceptedTimerRef.current) {
      clearTimeout(acceptedTimerRef.current);
    }

    setIsArchiveAccepted(true);
    acceptedTimerRef.current = setTimeout(() => {
      setIsArchiveAccepted(false);
      acceptedTimerRef.current = null;
    }, 320);

    return () => {
      if (acceptedTimerRef.current) {
        clearTimeout(acceptedTimerRef.current);
      }
    };
  }, [archiveAcceptedTick]);

  const showTitleSkeleton = isTitleLoading;

  const handleSaveTitle = () => {
    const previousTitle = titleOverride ?? boardTitle ?? "Untitled";
    const nextTitle = (editingTitle ?? previousTitle).trim();

    setIsEditing(false);
    setEditingTitle(null);

    if (!nextTitle || nextTitle === previousTitle) return;
    if (!onUpdateTitle) return;

    onTitleOptimistic?.(nextTitle);
    void onUpdateTitle(nextTitle).catch(() => {
      onTitleOptimistic?.(previousTitle);
    });
  };

  const { ref: setArchiveNodeRef, isDropTarget: isArchiveOver } = useDroppable({
    id: "archive-dropzone",
    type: "archive",
    accept: ["card", "column"],
    collisionDetector: archiveCollisionDetector,
    collisionPriority: CollisionPriority.Highest,
    disabled: isReadOnly || disableArchiveDropzone,
  });

  const archiveBtnClasses = `w-9 h-9 rounded-full border border-[var(--border-soft)]
          bg-[var(--bg-panel)] shadow-sm flex items-center justify-center
          transition-colors duration-200 ${styles.headerIconButton} ${styles.archiveButton} ${isArchiveDragActive ? styles.archiveActive : ""} ${isArchiveOver || isArchiveKeyboardTarget ? styles.archiveOver : ""} ${isArchiveAccepted ? styles.archiveAccepted : ""}`;
  const archiveKeyboardHintText =
    archiveDraggingItemType === "column" ? "Archive column" : "Archive card";

  return (
    <div
      className={`${styles.boardHeaderWrapper} px-6 sm:px-12 pb-4 sm:pb-8 ${
        isReadOnly ? "pt-4 sm:pt-4" : "pt-4 sm:pt-8"
      }`}
    >
      <div className={styles.boardHeader}>
        <div className={styles.leftGroup}>
          <Link
            href="/boards"
            aria-label="Back to boards"
            aria-busy={isBackNavigating}
            className={`${styles.navigateBack} focus-ring`}
            data-interactive="true"
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }

              if (isBackNavigating) {
                event.preventDefault();
                return;
              }

              setIsBackNavigating(true);
            }}
          >
            <NavigateBackIcon />
          </Link>

          {showTitleSkeleton ? (
            <SkeletonBoardTitle />
          ) : isEditable && isEditing ? (
            <span className={styles.titleInputShell} data-value={currentTitle}>
              <input
                ref={titleInputRef}
                value={currentTitle}
                minLength={1}
                maxLength={100}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveTitle();
                  } else if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditingTitle(null);
                  }
                }}
                className={styles.titleInput}
                autoFocus
              />
            </span>
          ) : isEditable ? (
            <button
              type="button"
              className={`${styles.title} cursor-pointer focus-ring`}
              onClick={() => {
                setIsEditing(true);
                setEditingTitle(currentTitle);
              }}
            >
              {currentTitle}
            </button>
          ) : (
            <p
              className={`${styles.title} cursor-default`}
            >
              {currentTitle}
            </p>
          )}
        </div>

        <div className={styles.rightGroup}>
          <PortalTooltip
            text={showMyCards ? "Showing only my cards" : "Show only my cards"}
          >
            <button
              onClick={() => onToggleMyCards?.()}
              aria-label="Toggle my cards filter"
              className={`w-9 h-9 rounded-full border border-[var(--border-soft)]
    bg-[var(--bg-panel)] shadow-sm flex items-center justify-center
    transition-colors duration-200
    ${styles.headerIconButton} ${showMyCards ? styles.activeToggle : ""} focus-ring`}
              data-interactive="true"
            >
              <EyeIcon size={14} color={showMyCards ? "var(--text-strong)" : "var(--text-secondary)"} />
            </button>
          </PortalTooltip>

          <PortalTooltip text="Archive">
            <div className={styles.archiveHintAnchor}>
              <button
                ref={setArchiveNodeRef}
                aria-label="Open archive"
                onClick={(e) => {
                  const byKeyboard = e.detail === 0;
                  if (byKeyboard) onOpenArchiveKeyboard?.();
                  else onOpenArchive?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onOpenArchiveKeyboard?.();
                  }
                }}
                className={`${archiveBtnClasses} focus-ring`}
                data-droppable="archive"
                data-interactive="true"
              >
                <ArchiveIcon size={14} color="var(--text-secondary)" />
              </button>
              <span
                className={`${styles.archiveKeyboardHint} ${
                  isArchiveKeyboardTarget
                    ? styles.archiveKeyboardHintVisible
                    : ""
                }`}
                role="status"
                aria-live="polite"
                aria-hidden={!isArchiveKeyboardTarget}
              >
                {archiveKeyboardHintText}
              </span>
            </div>
          </PortalTooltip>

          <button
            onClick={(e) => {
              const byKeyboard = e.detail === 0;
              if (byKeyboard) onAddUsersKeyboard?.();
              else onAddUsers();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onAddUsersKeyboard?.();
              }
            }}
            className={`${styles.headerTextButton} px-4 py-2 rounded-xl focus-ring
          bg-[var(--bg-panel)] text-xs 
          border border-[var(--border-soft)] 
          shadow-sm 
          flex items-center justify-center gap-3`}
            data-interactive="true"
          >
            <MembersIcon size={14} color="var(--text-secondary)" />
            View members
          </button>

          <AppHeader user={user} onLogout={onLogout} />
        </div>

        <MobileBoardHeaderMenu
          user={user}
          showMyCards={showMyCards}
          onToggleMyCards={onToggleMyCards}
          onOpenArchive={onOpenArchive}
          onOpenArchiveKeyboard={onOpenArchiveKeyboard}
          onAddUsers={onAddUsers}
          onAddUsersKeyboard={onAddUsersKeyboard}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}

const MemoizedBoardHeader = memo(BoardHeader);
MemoizedBoardHeader.displayName = "BoardHeader";

export default MemoizedBoardHeader;
