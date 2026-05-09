import type { EntityId } from "@/types";

export function isPending(
  restoringIds: Set<EntityId>,
  deletingIds: Set<EntityId>,
  id: EntityId
) {
  return restoringIds.has(id) || deletingIds.has(id);
}

export function getArchivedCardColumnInfo(
  status: string,
  columnTitle?: string | null
) {
  if (status === "Deleted") return "From deleted column";
  if (status === "Archived") return `From archived: ${columnTitle ?? ""}`.trim();
  if (status === "Active") return `From: ${columnTitle ?? ""}`.trim();
  return "No previous column";
}
