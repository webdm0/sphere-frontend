import { get, post, put, del } from '@/services/api/request';
import {
  ApiBoard,
  CreateBoardDto,
  CreateBoardResponseDto,
  ApiBoardListItem,
  BoardMembersResponse,
  EntityId,
} from '@/types';
import { dedupeById, dedupeByKey } from "@/utils/collections";

export const getBoardById = (
  boardId: EntityId,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ApiBoard> => {
  return get<ApiBoard>(`/api/boards/${boardId}`, signal);
};

export const createBoard = (
  dto: CreateBoardDto
): Promise<CreateBoardResponseDto> => {
  return post<CreateBoardResponseDto>('/api/boards', dto);
};

export const deleteBoard = (id: EntityId): Promise<null> => {
  return del<null>(`/api/boards/${id}`);
};

export const leaveBoard = (id: EntityId): Promise<null> => {
  return del<null>(`/api/boards/${id}/leave`);
};

export const updateBoard = (id: EntityId, title: string): Promise<ApiBoard> => {
  return put<ApiBoard>(`/api/boards/${id}`, { title });
};

export const archiveBoard = (id: EntityId): Promise<null> => {
  return post<null>(`/api/boards/${id}/archive`);
};

export const restoreBoard = (id: EntityId): Promise<null> => {
  return post<null>(`/api/boards/${id}/restore`);
};

export const getBoards = ({ signal }: { signal?: AbortSignal }): Promise<ApiBoardListItem[]> => {
  return get<ApiBoardListItem[]>(`/api/boards`, signal).then((boards) =>
    dedupeById(boards ?? [])
  );
};

export const getArchivedBoards = ({ signal }: { signal?: AbortSignal }): Promise<ApiBoardListItem[]> => {
  return get<ApiBoardListItem[]>(`/api/boards/archived`, signal).then((boards) =>
    dedupeById(boards ?? [])
  );
};

export const acceptInvite = (id: EntityId): Promise<void> => {
  return post<void>(`/api/boards/${id}/accept`);
};

export const declineInvite = (id: EntityId): Promise<void> => {
  return post<void>(`/api/boards/${id}/decline`);
};

export const getBoardMembers = (boardId: EntityId): Promise<BoardMembersResponse> => {
  return get<BoardMembersResponse>(`/api/boards/${boardId}/members`).then((response) => {
    if (!response) return { ownerId: "", members: [] };
    return {
      ...response,
      members: dedupeByKey(response.members ?? [], (member) => String(member.userId)),
    };
  });
};

export const addBoardMember = (boardId: EntityId, userId: EntityId) => {
  return post(`/api/boards/${boardId}/members`, { userId });
};

export const removeBoardMember = (boardId: EntityId, userId: EntityId) => {
  return del(`/api/boards/${boardId}/members/${userId}`);
};
