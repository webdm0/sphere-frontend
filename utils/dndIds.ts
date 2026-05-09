type DndEntityType = "card" | "column";

const DND_PREFIX: Record<DndEntityType, string> = {
  card: "card:",
  column: "col:",
};

function withPrefix(type: DndEntityType, id: string): string {
  return `${DND_PREFIX[type]}${id}`;
}

export function toCardDndId(id: string): string {
  return withPrefix("card", id);
}

export function toColumnDndId(id: string): string {
  return withPrefix("column", id);
}

export function toRawDndId(
  value: unknown,
  expectedType?: DndEntityType,
): string | null {
  if (value == null) return null;

  const normalized = String(value);

  if (normalized.startsWith(DND_PREFIX.card)) {
    if (expectedType && expectedType !== "card") return null;
    return normalized.slice(DND_PREFIX.card.length);
  }

  if (normalized.startsWith(DND_PREFIX.column)) {
    if (expectedType && expectedType !== "column") return null;
    return normalized.slice(DND_PREFIX.column.length);
  }

  return normalized;
}
