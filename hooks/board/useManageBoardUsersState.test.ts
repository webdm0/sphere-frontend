import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useManageBoardUsersState } from "@/hooks/board/useManageBoardUsersState";
import { useUserSearchDropdown } from "@/hooks/user/useUserSearchDropdown";
import type { BoardMemberDto } from "@/types";

vi.mock("@/hooks/user/useUserSearchDropdown", () => ({
  useUserSearchDropdown: vi.fn(),
}));

const mockedUseUserSearchDropdown = vi.mocked(useUserSearchDropdown);

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("useManageBoardUsersState", () => {
  const setQuery = vi.fn();
  const closeDropdown = vi.fn();

  beforeEach(() => {
    mockedUseUserSearchDropdown.mockReturnValue({
      query: "",
      dropdownOpen: false,
      filteredUsers: [],
      setQuery,
      setDropdownOpen: vi.fn(),
      closeDropdown,
      onQueryChange: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rolls back an optimistic member add when the request fails", async () => {
    const user = {
      id: "user-1",
      username: "alice",
      email: "alice@example.com",
    };
    const membersData = { members: [] };
    const addMemberDeferred = createDeferred<unknown>();
    const addMember = vi.fn(() => addMemberDeferred.promise);
    const removeMember = vi.fn();

    const { result } = renderHook(() =>
      useManageBoardUsersState({
        isOpen: true,
        membersData,
        isLoading: false,
        readOnly: false,
        addMember,
        removeMember,
      })
    );

    act(() => {
      void result.current.handleUserSelect(user);
    });

    expect(addMember).toHaveBeenCalledWith(user.id);
    expect(setQuery).toHaveBeenCalledWith("");
    expect(closeDropdown).toHaveBeenCalled();
    expect(result.current.pendingAddIds.has(user.id)).toBe(true);
    expect(result.current.existingMembers).toEqual([
      expect.objectContaining({
        userId: user.id,
        username: user.username,
        email: user.email,
        pendingAdd: true,
      }),
    ]);

    await act(async () => {
      addMemberDeferred.reject(new Error("add failed"));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to add member.");
    });

    expect(result.current.pendingAddIds.has(user.id)).toBe(false);
    expect(result.current.existingMembers).toEqual([]);
  });

  it("reconciles optimistic member state when refreshed members arrive from the server", async () => {
    const user = {
      id: "user-2",
      username: "bob",
      email: "bob@example.com",
    };
    const serverMember: BoardMemberDto = {
      userId: user.id,
      username: user.username,
      email: user.email,
      isAccepted: true,
    };
    const emptyMembersData: { members: BoardMemberDto[] } = { members: [] };
    const syncedMembersData: { members: BoardMemberDto[] } = {
      members: [serverMember],
    };
    const addMember = vi.fn().mockResolvedValue(undefined);
    const removeMember = vi.fn();

    const { result, rerender } = renderHook(
      ({ membersData }: { membersData: { members: BoardMemberDto[] } }) =>
        useManageBoardUsersState({
          isOpen: true,
          membersData,
          isLoading: false,
          readOnly: false,
          addMember,
          removeMember,
        }),
      {
        initialProps: {
          membersData: emptyMembersData,
        },
      }
    );

    await act(async () => {
      await result.current.handleUserSelect(user);
    });

    expect(addMember).toHaveBeenCalledWith(user.id);
    expect(result.current.pendingAddIds.has(user.id)).toBe(true);
    expect(result.current.existingMembers).toEqual([
      expect.objectContaining({
        userId: user.id,
        username: user.username,
        pendingAdd: true,
      }),
    ]);

    rerender({ membersData: syncedMembersData });

    await waitFor(() => {
      expect(result.current.pendingAddIds.has(user.id)).toBe(false);
    });

    expect(result.current.existingMembers).toEqual([serverMember]);
    expect(result.current.error).toBe("");
  });

  it("does not start member mutations in read-only mode", () => {
    const user = {
      id: "user-1",
      username: "alice",
      email: "alice@example.com",
    };
    const member = {
      userId: "user-2",
      username: "bob",
      email: "bob@example.com",
      isAccepted: true,
    };
    const membersData = { members: [member] };
    const addMember = vi.fn();
    const removeMember = vi.fn();

    const { result } = renderHook(() =>
      useManageBoardUsersState({
        isOpen: true,
        membersData,
        isLoading: false,
        readOnly: true,
        addMember,
        removeMember,
      })
    );

    act(() => {
      void result.current.handleUserSelect(user);
      void result.current.handleUserRemove(member.userId);
    });

    expect(addMember).not.toHaveBeenCalled();
    expect(removeMember).not.toHaveBeenCalled();
    expect(result.current.existingMembers).toEqual([member]);
    expect(result.current.error).toBe("");
  });
});
