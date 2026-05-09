import { post, put, patch, del, get } from '@/services/api/request';
import {
  ApiCard,
  ReorderCardsRequestDto,
  ApiArchivedCard,
  RestoreCardResponseDto,
  EntityId,
  UpdateCardRequestDto,
} from '@/types';
import { dedupeById } from "@/utils/collections";

export const createCard = (
  columnId: EntityId,
  title: string,
  content?: string,
  assignToMe?: boolean
): Promise<ApiCard> => {
  return post<ApiCard>(`/api/cards`, {
    columnId,
    title,
    content,
    ...(assignToMe ? { assignToMe: true } : {}),
  });
};

export const updateCard = (
  cardId: EntityId,
  data: UpdateCardRequestDto
): Promise<ApiCard> => {
  return patch<ApiCard>(`/api/cards/${cardId}`, data);
};

export const getCard = (cardId: EntityId): Promise<ApiCard> => {
  return get<ApiCard>(`/api/cards/${cardId}`);
};

export const getArchivedCards = (
  boardId: EntityId,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ApiArchivedCard[]> => {
  return get<ApiArchivedCard[]>(`/api/boards/${boardId}/cards/archived`, signal).then(
    (cards) => dedupeById(cards ?? [])
  );
};

export const reorderCards = (data: ReorderCardsRequestDto): Promise<void> => {
  return put<void>(`/api/cards/reorder`, data);
};

export const restoreCard = (cardId: EntityId): Promise<RestoreCardResponseDto> => {
  return post<RestoreCardResponseDto>(`/api/cards/${cardId}/restore`);
};

export const deleteCardForever = (cardId: EntityId): Promise<null> => {
  return del<null>(`/api/cards/${cardId}/permanent`);
};
