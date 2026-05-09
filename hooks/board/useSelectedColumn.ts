import { useState } from 'react';

type Column = { id: string; title: string };

export function useSelectedColumn() {
  const [selected, setSelected] = useState<Column | null>(null);

  const select = (column: Column) => setSelected(column);
  const clear = () => setSelected(null);

  return {
    selected,
    select,
    clear,
    selectedId: selected?.id ?? '',
    selectedTitle: selected?.title ?? '',
  };
}
