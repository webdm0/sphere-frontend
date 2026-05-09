import type { EntityId, Order } from "./common";
import type { ApiColumn } from "./column";

export interface ApiCard {
  id: EntityId;
  title: string;
  content: string;
  columnId: EntityId | null;
  boardId: EntityId;
  order: Order;
  priority?: "low" | "medium" | "high" | "critical" | null;
  assigneeId?: EntityId | null;
  startAt?: string | null;
  dueAt?: string | null;
  createdById?: EntityId;
  updatedById?: EntityId | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  isArchived?: boolean;
  archivedManually: boolean;
  previousColumnId?: EntityId | null;
  previousOrder?: Order | null;
  subtasks?: ApiSubtask[];
  attachments?: ApiCardAttachment[];
}

export interface ApiArchivedCard {
  id: EntityId;
  title: string;
  order: Order;
  columnId: EntityId | null;
  previousColumnId?: EntityId | null;
  previousOrder?: Order | null;
  assigneeId?: EntityId | null;
  archivedAt: string | null;
  archivedManually: boolean;
  columnTitle: string | null;
  columnStatus: "Active" | "Archived" | "Deleted" | "NoColumn";
}

export interface ApiSubtask {
  id: EntityId;
  cardId: EntityId;
  title: string;
  isDone: boolean;
  order: Order;
}

export interface ApiCardAttachment {
  id: EntityId;
  cardId: EntityId;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedById: EntityId;
}

export interface CardOrder {
  id: EntityId;
  order: Order;
}

export interface ReorderCardsRequestDto {
  targetColumnId: EntityId;
  cards: CardOrder[];
}

export interface RestoreCardResponseDto {
  card: ApiCard | null;
  restoreContext: "original" | "original_archived" | "original_deleted" | "no_columns";
  targetColumn: ApiColumn | null;
}

export interface UpdateCardRequestDto {
  title?: string;
  content?: string;
  priority?: ApiCard["priority"];
  assigneeId?: EntityId | null;
  startAt?: string | null;
  dueAt?: string | null;
  isArchived?: true;
}

export interface UpdateCardInput
  extends Omit<UpdateCardRequestDto, "isArchived"> {
  isArchived?: boolean;
}
