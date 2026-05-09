import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardMemberDto, UserDto } from "@/types";
import { useUserSearchDropdown } from "@/hooks/user/useUserSearchDropdown";
import type { EntityId } from "@/types";

type UiMember = BoardMemberDto & { pendingAdd?: boolean };

interface UseManageBoardUsersStateArgs {
  isOpen: boolean;
  membersData?: { members: BoardMemberDto[] } | null;
  isLoading: boolean;
  readOnly: boolean;
  addMember: (userId: EntityId) => Promise<unknown>;
  removeMember: (userId: EntityId) => Promise<unknown>;
}

export function useManageBoardUsersState({
  isOpen,
  membersData,
  isLoading,
  readOnly,
  addMember,
  removeMember,
}: UseManageBoardUsersStateArgs) {
  const [error, setError] = useState("");
  const [pendingAddIds, setPendingAddIds] = useState<Set<EntityId>>(new Set());
  const [pendingRemoveIds, setPendingRemoveIds] = useState<Set<EntityId>>(
    new Set()
  );
  const [confirmKickId, setConfirmKickId] = useState<EntityId | null>(null);
  const [localMembers, setLocalMembers] = useState<UiMember[]>([]);

  const members = useMemo(
    () => membersData?.members ?? [],
    [membersData?.members]
  );

  const existingMembers: UiMember[] = useMemo(() => {
    if (localMembers.length) return localMembers;
    return members;
  }, [localMembers, members]);

  const isInitialMembersPending = isLoading && !membersData;

  const filteredExistingIds = useMemo(
    () => new Set(existingMembers.map((m) => m.userId)),
    [existingMembers]
  );

  const {
    query,
    dropdownOpen,
    filteredUsers,
    setQuery,
    closeDropdown,
    onQueryChange,
  } = useUserSearchDropdown({
    isOpen,
    excludedIds: filteredExistingIds,
    pendingIds: pendingAddIds,
  });

  const requestKick = useCallback((userId: EntityId) => {
    setConfirmKickId(userId);
  }, []);

  const cancelKick = useCallback(() => {
    setConfirmKickId(null);
  }, []);

  const addPendingMember = useCallback((user: UserDto) => {
    setPendingAddIds((prev) => {
      if (prev.has(user.id)) return prev;
      const next = new Set(prev);
      next.add(user.id);
      return next;
    });

    setLocalMembers((prev) => {
      if (prev.some((m) => m.userId === user.id)) return prev;
      const optimistic: UiMember = {
        userId: user.id,
        username: user.username,
        email: user.email,
        isAccepted: true,
        pendingAdd: true,
      };
      return [...prev, optimistic];
    });
  }, []);

  const handleUserSelect = useCallback(
    async (user: UserDto) => {
      if (readOnly) return;
      if (filteredExistingIds.has(user.id) || pendingAddIds.has(user.id)) return;
      setError("");
      addPendingMember(user);
      setQuery("");
      closeDropdown();
      try {
        await addMember(user.id);
      } catch {
        setError("Failed to add member.");
        setPendingAddIds((prev) => {
          if (!prev.has(user.id)) return prev;
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
        setLocalMembers((prev) => prev.filter((m) => m.userId !== user.id));
      }
    },
    [
      addMember,
      addPendingMember,
      closeDropdown,
      filteredExistingIds,
      pendingAddIds,
      readOnly,
      setQuery,
    ]
  );

  const handleUserRemove = useCallback(
    async (userId: EntityId) => {
      if (readOnly) return;
      if (pendingRemoveIds.has(userId)) return;
      setError("");
      const snapshot = localMembers;
      setPendingRemoveIds((prev) => {
        if (prev.has(userId)) return prev;
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      setLocalMembers((prev) => prev.filter((m) => m.userId !== userId));
      try {
        await removeMember(userId);
      } catch {
        setError("Failed to remove member.");
        setLocalMembers(snapshot);
        setPendingRemoveIds((prev) => {
          if (!prev.has(userId)) return prev;
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
      setConfirmKickId(null);
    },
    [localMembers, pendingRemoveIds, readOnly, removeMember]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!membersData?.members) return;

    const base = membersData.members;

    setPendingAddIds((prev) => {
      const next = new Set(prev);
      base.forEach((m) => {
        if (next.has(m.userId)) next.delete(m.userId);
      });
      return next;
    });

    setPendingRemoveIds(new Set<EntityId>());

    setLocalMembers((prev) => {
      const pendingAdds = prev.filter(
        (m) => m.pendingAdd && !base.some((b) => b.userId === m.userId)
      );
      return [...base, ...pendingAdds];
    });
  }, [isOpen, membersData?.members]);

  useEffect(() => {
    if (isOpen) return;
    setConfirmKickId(null);
    setError("");
  }, [isOpen]);

  return {
    error,
    query,
    dropdownOpen,
    pendingAddIds,
    pendingRemoveIds,
    confirmKickId,
    existingMembers,
    filteredUsers,
    isInitialMembersPending,
    onQueryChange,
    closeDropdown,
    requestKick,
    cancelKick,
    handleUserSelect,
    handleUserRemove,
  };
}
