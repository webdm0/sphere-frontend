import { useQuery } from "@tanstack/react-query";
import type { UserDto } from "@/types";
import { searchUsers } from "@/services/api/users";

interface UseUserSearchOptions {
  enabled?: boolean;
  staleTimeMs?: number;
}

export function useUserSearch(query: string, options: UseUserSearchOptions = {}) {
  const trimmed = query.trim();
  const enabled = options.enabled ?? true;

  return useQuery<UserDto[], Error>({
    queryKey: ["users", "search", trimmed],
    queryFn: () => searchUsers(trimmed),
    enabled: enabled && trimmed.length > 0,
    staleTime: options.staleTimeMs ?? 30_000,
  });
}
