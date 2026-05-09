import type { EntityId } from "@/types";
import { isTempId } from "@/utils/entityId";

type CardLike = {
  id: string;
  columnId?: EntityId | null;
  order?: number;
};

type ColumnLike<TCard extends CardLike = CardLike> = {
  id: string;
  cards: TCard[];
};

export interface BoardLayoutProjection {
  columnOrder: string[];
  cardOrderByColumnId: Record<string, string[]>;
}

export function captureBoardLayoutProjection<TColumn extends ColumnLike>(
  columns: TColumn[],
): BoardLayoutProjection {
  const columnOrder = columns
    .map((column) => String(column.id))
    .filter((columnId) => !isTempId(columnId));

  const cardOrderByColumnId = columnOrder.reduce<Record<string, string[]>>(
    (acc, columnId) => {
      const column = columns.find((item) => String(item.id) === columnId);

      acc[columnId] =
        column?.cards
          .map((card) => String(card.id))
          .filter((cardId) => !isTempId(cardId)) ?? [];

      return acc;
    },
    {},
  );

  return {
    columnOrder,
    cardOrderByColumnId,
  };
}

export function applyBoardLayoutProjection<TColumn extends ColumnLike>(
  columns: TColumn[],
  projection?: BoardLayoutProjection | null,
): TColumn[] {
  if (!projection) return columns;

  const columnById = new Map(columns.map((column) => [String(column.id), column]));
  const orderedColumnIds = projection.columnOrder.filter((columnId) =>
    columnById.has(columnId),
  );
  const orderedColumnIdSet = new Set(orderedColumnIds);
  const orderedColumns = [
    ...orderedColumnIds.map((columnId) => columnById.get(columnId)!),
    ...columns.filter((column) => !orderedColumnIdSet.has(String(column.id))),
  ];

  const cardById = new Map<string, TColumn["cards"][number]>();
  columns.forEach((column) => {
    column.cards.forEach((card) => {
      cardById.set(String(card.id), card);
    });
  });

  const projectedCardIds = new Set<string>();

  Object.values(projection.cardOrderByColumnId).forEach((cardIds) => {
    cardIds.forEach((cardId) => {
      if (cardById.has(cardId)) {
        projectedCardIds.add(cardId);
      }
    });
  });

  return orderedColumns.map((column) => {
    const columnId = String(column.id);
    const overlayCardIds = (projection.cardOrderByColumnId[columnId] ?? []).filter(
      (cardId) => cardById.has(cardId),
    );

    const overlayCards = overlayCardIds.map((cardId) => cardById.get(cardId)!);
    const tailCards = column.cards.filter(
      (card) => !projectedCardIds.has(String(card.id)),
    );

    const cards = [...overlayCards, ...tailCards].map((card, index) => ({
      ...card,
      columnId: column.id,
      order: index,
    }));

    return {
      ...column,
      cards,
    };
  });
}
