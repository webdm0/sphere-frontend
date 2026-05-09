type KeyGetter<T> = (item: T) => string;

export const dedupeByKey = <T>(items: readonly T[], getKey: KeyGetter<T>): T[] => {
  const seen = new Set<string>();
  const dedupedReversed: T[] = [];

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedReversed.push(item);
  }

  dedupedReversed.reverse();
  return dedupedReversed;
};

export const dedupeById = <T extends { id: string }>(items: readonly T[]): T[] =>
  dedupeByKey(items, (item) => String(item.id));

export const upsertById = <T extends { id: string }>(items: readonly T[], next: T): T[] => {
  let replaced = false;
  const updated = items.map((item) => {
    if (item.id !== next.id) return item;
    replaced = true;
    return next;
  });

  return replaced ? updated : [...items, next];
};
