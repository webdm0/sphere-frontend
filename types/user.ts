import type { EntityId } from "./common";

export interface UserDto {
  id: EntityId;
  username: string;
  email?: string;
}

export interface AuthUser {
  id: EntityId;
  username: string;
  email: string;
  isDemo: boolean;
}
