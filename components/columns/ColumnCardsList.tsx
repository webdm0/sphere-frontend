"use client";

import { memo, useMemo } from "react";
import Card from "@/components/cards/Card";
import type { ApiColumnCard, EntityId } from "@/types";
import { isTempId } from "@/utils/entityId";

type UiCard = Omit<ApiColumnCard, "id"> & { id: string };

interface ColumnCardsListProps {
  cards: UiCard[];
  columnId: string;
  disableCardDrag?: boolean;
  currentUserMemberId?: EntityId | null;
  isReadOnly: boolean;
  isDndLocked?: boolean;
  isEditLocked?: boolean;
  onOpenCard?: (cardId: string, byKeyboard?: boolean, target?: HTMLElement) => void;
}

function ColumnCardsList({
  cards,
  columnId,
  disableCardDrag = false,
  currentUserMemberId,
  isReadOnly,
  isDndLocked = false,
  isEditLocked = false,
  onOpenCard,
}: ColumnCardsListProps) {
  const uniqueCards = useMemo(() => {
    const seen = new Set<string>();
    return cards.filter((card) => {
      const id = String(card.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [cards]);

  return (
    <>
      {uniqueCards.map((card, index) => {
        const isOptimistic = isTempId(card.id);

        return (
          <Card
            key={card.id}
            id={String(card.id)}
            index={index}
            title={card.title}
            fromColumn={columnId}
            assigneeId={card.assigneeId}
            currentUserMemberId={currentUserMemberId}
            draggable={!isOptimistic && !isDndLocked && !disableCardDrag}
            isOptimistic={isOptimistic}
            isEditLocked={isEditLocked}
            readOnly={isReadOnly}
            onOpen={onOpenCard}
          />
        );
      })}
    </>
  );
}

export default memo(ColumnCardsList);
