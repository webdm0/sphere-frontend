import { get, post, put, del, patch } from '@/services/api/request';
import {
  ApiColumn,
  UpdateColumnRequestDto,
  UpdateColumnResponseDto,
  ColumnOrderUpdate,
  EntityId,
} from '@/types';
import { dedupeById } from "@/utils/collections";

const normalizeColumns = (columns: ApiColumn[]): ApiColumn[] =>
  dedupeById(columns).map((column) => ({
    ...column,
    cards: dedupeById(column.cards),
  }));

export const getBoardColumns = (
  boardId: EntityId,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ApiColumn[]> => {
  return get<ApiColumn[]>(`/api/boards/${boardId}/columns`, signal).then((columns) =>
    normalizeColumns(columns ?? [])
  );
};

export const getArchivedColumns = (
  boardId: EntityId,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ApiColumn[]> => {
  return get<ApiColumn[]>(`/api/boards/${boardId}/columns/archived`, signal).then(
    (columns) => normalizeColumns(columns ?? [])
  );
};

export const createColumn = (boardId: EntityId, title: string): Promise<ApiColumn> => {
  return post<ApiColumn>(`/api/columns`, { title, boardId });
};

export const updateColumn = (
  columnId: EntityId,
  data: UpdateColumnRequestDto
): Promise<UpdateColumnResponseDto> => {
  return patch<UpdateColumnResponseDto>(`/api/columns/${columnId}`, data);
};

export const reorderColumns = (boardId: EntityId, columns: ColumnOrderUpdate[]): Promise<null> => {
  return put<null>(`/api/columns/reorder`, { boardId, columns });
};

export const restoreColumn = (columnId: EntityId): Promise<ApiColumn[]> => {
  return post<ApiColumn[]>(`/api/columns/${columnId}/restore`, {}).then((columns) =>
    normalizeColumns(columns ?? [])
  );
};

export const deleteColumnForever = (columnId: EntityId): Promise<null> => {
  return del<null>(`/api/columns/${columnId}/permanent`);
};
