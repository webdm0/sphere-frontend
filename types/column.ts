import type { EntityId, Order } from "./common";

export interface ApiColumnCard {
  id: EntityId;
  title: string;
  order: Order;
  columnId: EntityId | null;
  assigneeId?: EntityId | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  archivedManually: boolean;
}

export interface ApiColumn {
  id: EntityId;
  title: string;
  order: Order;
  archivedAt?: string | null;
  cards: ApiColumnCard[];
}

export type ColumnOrderUpdate = {
  id: EntityId;
  order: Order;
};

export interface UpdateColumnRequestDto {
  title?: string;
  isArchived?: true;
}

export interface UpdateColumnResponseDto {
  id: EntityId;
  title: string;
  archivedAt?: string | null;
}
