import { get } from '@/services/api/request';
import { UserDto } from '@/types';
import { dedupeById } from "@/utils/collections";

export const searchUsers = (query: string): Promise<UserDto[]> => {
  return get<UserDto[]>(`/api/users/search?query=${encodeURIComponent(query)}`).then(
    (users) => dedupeById(users ?? [])
  );
};
