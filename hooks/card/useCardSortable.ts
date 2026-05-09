import { useSortable } from "@dnd-kit/react/sortable";
import {
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom";
import { toCardDndId, toColumnDndId } from "@/utils/dndIds";

interface UseCardSortableArgs {
  id: string;
  index: number;
  columnId: string;
  draggable?: boolean;
  readOnly?: boolean;
  isOptimistic?: boolean;
}

interface UseCardSortableResult {
  ref: (node: HTMLDivElement | null) => void;
  handleRef: (node: Element | null) => void;
  isDragging: boolean;
  canDrag: boolean;
}

const TOUCH_DRAG_DELAY_MS = 300;
const TOUCH_DRAG_TOLERANCE_PX = 5;
const POINTER_DRAG_DISTANCE_PX = 5;

const CARD_POINTER_SENSOR = PointerSensor.configure({
  activationConstraints: (event) =>
    event.pointerType === "touch"
      ? [
          new PointerActivationConstraints.Delay({
            value: TOUCH_DRAG_DELAY_MS,
            tolerance: TOUCH_DRAG_TOLERANCE_PX,
          }),
        ]
      : [
          new PointerActivationConstraints.Distance({
            value: POINTER_DRAG_DISTANCE_PX,
          }),
        ],
  activatorElements: (source) => [source.element],
});

const CARD_SENSORS = [CARD_POINTER_SENSOR, KeyboardSensor];

export function useCardSortable({
  id,
  index,
  columnId,
  draggable = true,
  readOnly = false,
  isOptimistic = false,
}: UseCardSortableArgs): UseCardSortableResult {
  const canDrag = draggable && !readOnly && !isOptimistic;
  const sortableId = toCardDndId(id);
  const sortableGroupId = toColumnDndId(columnId);

  const { ref, handleRef, isDragging } = useSortable({
    id: sortableId,
    index,
    group: sortableGroupId,
    type: "card",
    accept: "card",
    feedback: "default",
    sensors: CARD_SENSORS,
    disabled: !canDrag,
  });

  return {
    ref,
    handleRef,
    isDragging,
    canDrag,
  };
}
