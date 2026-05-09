import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addBoardMember, getBoardMembers, removeBoardMember } from "@/services/api";
import type { BoardMembersResponse, EntityId } from "@/types";
import { useAccessToken } from "@/hooks/auth/useAccessToken";

interface UseBoardMembersOptions {
  enabled?: boolean;
  currentUsername?: string;
  currentEmail?: string;
  isBoardOwner?: boolean;
}

const normalizeIdentity = (value?: string) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export function useBoardMembers(
  boardId: EntityId | undefined,
  options: UseBoardMembersOptions | boolean = true
) {
  const accessToken = useAccessToken();
  const normalized = typeof options === "boolean" ? { enabled: options } : options;
  const enabled = normalized.enabled ?? true;
  const normalizedCurrentUsername = normalizeIdentity(normalized.currentUsername);
  const normalizedCurrentEmail = normalizeIdentity(normalized.currentEmail);

  const queryClient = useQueryClient();
  const boardKey = boardId !== undefined ? String(boardId) : undefined;
  const membersQueryKey = ["boardMembers", boardKey] as const;

  const membersQuery = useQuery<BoardMembersResponse>({
    queryKey: membersQueryKey,
    queryFn: () => {
      if (!boardKey) throw new Error("No boardId");
      return getBoardMembers(boardKey).then(
        (res) => res ?? { ownerId: "", members: [] }
      );
    },
    enabled: !!boardKey && enabled && Boolean(accessToken),
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const addMemberMut = useMutation({
    mutationFn: (userId: EntityId) => {
      if (!boardKey) throw new Error("No boardId");
      return addBoardMember(boardKey, userId);
    },
    onSuccess: () => {
      if (!boardKey) return;
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (userId: EntityId) => {
      if (!boardKey) throw new Error("No boardId");
      return removeBoardMember(boardKey, userId);
    },
    onSuccess: () => {
      if (!boardKey) return;
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
    },
  });

  const ownerId = membersQuery.data?.ownerId;
  const currentMemberId = useMemo(() => {
    const members = membersQuery.data?.members ?? [];
    if (members.length === 0) return undefined;

    if (normalizedCurrentEmail) {
      const byEmail = members.find(
        (member) => normalizeIdentity(member.email) === normalizedCurrentEmail
      );
      if (byEmail) return byEmail.userId;
    }

    if (!normalizedCurrentUsername) return undefined;
    return members.find(
      (member) => normalizeIdentity(member.username) === normalizedCurrentUsername
    )?.userId;
  }, [membersQuery.data?.members, normalizedCurrentEmail, normalizedCurrentUsername]);

  const isOwner =
    normalized.isBoardOwner ??
    (ownerId !== undefined &&
      currentMemberId !== undefined &&
      String(currentMemberId) === String(ownerId));

  return {
    ...membersQuery,
    addMember: addMemberMut.mutateAsync,
    removeMember: removeMemberMut.mutateAsync,
    ownerId,
    currentMemberId,
    isOwner,
  };
}
