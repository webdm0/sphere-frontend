import type { EntityId } from "./common";

export interface ApiBoard {
  id: EntityId;
  title: string;
  isArchived?: boolean;
  archivedAt?: string | null;
  archivetAt?: string | null;
  ArchivedAt?: string | null;
  ArchivetAt?: string | null;
}

export interface ApiBoardListItem {
  id: EntityId;
  title: string;
  isMine: boolean;
  isShared: boolean;
  isAccepted: boolean;
  ownerName: string;
  archivedAt?: string | null;
}

export interface UiBoardListItem extends ApiBoardListItem {
  clientId?: EntityId;
  isCreating?: boolean;
}

export interface CreateBoardDto {
  title: string;
  userIds: EntityId[];
}

export interface CreateBoardResponseDto {
  id: EntityId;
  title: string;
}

export interface BoardMemberDto {
  userId: EntityId;
  username: string;
  email?: string;
  isAccepted: boolean;
}

export interface BoardMembersResponse {
  ownerId: EntityId;
  members: BoardMemberDto[];
}
