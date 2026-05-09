import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserDto } from "@/types";
import { useUserSearch } from "@/hooks/user/useUserSearch";
import type { EntityId } from "@/types";

type IdCollection = Iterable<EntityId> | null | undefined;

const toSet = (ids: IdCollection) => {
  if (!ids) return new Set<EntityId>();
  if (ids instanceof Set) return ids;
  return new Set(ids);
};

interface UseUserSearchDropdownArgs {
  isOpen: boolean;
  excludedIds?: IdCollection;
  pendingIds?: IdCollection;
}

interface UseUserSearchDropdownResult {
  query: string;
  dropdownOpen: boolean;
  filteredUsers: UserDto[];
  setQuery: (value: string) => void;
  setDropdownOpen: (open: boolean) => void;
  closeDropdown: () => void;
  onQueryChange: (value: string) => void;
}

export function useUserSearchDropdown({
  isOpen,
  excludedIds,
  pendingIds,
}: UseUserSearchDropdownArgs): UseUserSearchDropdownResult {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const excludedSet = useMemo(() => toSet(excludedIds), [excludedIds]);
  const pendingSet = useMemo(() => toSet(pendingIds), [pendingIds]);

  const { data: users = [] } = useUserSearch(query, { enabled: isOpen });

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) => !excludedSet.has(user.id) && !pendingSet.has(user.id)
      ),
    [excludedSet, pendingSet, users]
  );

  useEffect(() => {
    if (!isOpen) return;
    const shouldOpen = query.trim().length > 0 && filteredUsers.length > 0;
    setDropdownOpen((prev) => (prev === shouldOpen ? prev : shouldOpen));
  }, [filteredUsers.length, isOpen, query]);

  useEffect(() => {
    if (isOpen) return;
    setQuery("");
    setDropdownOpen(false);
  }, [isOpen]);

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  const onQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  return {
    query,
    dropdownOpen,
    filteredUsers,
    setQuery,
    setDropdownOpen,
    closeDropdown,
    onQueryChange,
  };
}
