"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import {
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom";
import { motion } from "framer-motion";
import {
  type ForwardedRef,
  ReactElement,
  ReactNode,
  createContext,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import columnStyles from "@/components/columns/Column.module.css";
import boardStyles from "@/components/boards/SingleBoardView.module.css";
import { toColumnDndId } from "@/utils/dndIds";

type DragHandleRef = ((element: Element | null) => void) | undefined;

export const DragHandleContext = createContext<DragHandleRef>(undefined);

interface SortableColumnProps {
  id: string;
  index: number;
  disabled?: boolean;
  readOnly?: boolean;
  disableDragOnly?: boolean;
  footer?: ReactNode;
  children: ReactElement<{
    dragHandleRef?: (element: Element | null) => void;
  }>;
}

function assignRef(
  ref: ForwardedRef<HTMLDivElement>,
  node: HTMLDivElement | null,
) {
  if (typeof ref === "function") {
    ref(node);
    return;
  }

  if (ref) {
    ref.current = node;
  }
}

const TOUCH_DRAG_DELAY_MS = 300;
const TOUCH_DRAG_TOLERANCE_PX = 5;
const POINTER_DRAG_DISTANCE_PX = 5;

const SortableColumn = forwardRef<HTMLDivElement, SortableColumnProps>(
  function SortableColumn(
    {
      id,
      index,
      disabled = false,
      readOnly = false,
      disableDragOnly = false,
      footer,
      children,
    },
    forwardedRef,
  ) {
    const isHandleDisabled = disabled || readOnly || disableDragOnly;
    const sortableDisabled = disabled || readOnly;
    const lastInputModeRef = useRef<"touch" | "pointer" | "keyboard" | null>(
      null,
    );
    const wasDraggingRef = useRef(false);
    const [isTouchPulseActive, setIsTouchPulseActive] = useState(false);
    const sortableId = toColumnDndId(id);
    const sensors = disableDragOnly
      ? []
      : [
          PointerSensor.configure({
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
          }),
          KeyboardSensor,
        ];

    const { ref, handleRef, isDragging } = useSortable({
      id: sortableId,
      index,
      type: "column",
      accept: "column",
      feedback: "default",
      disabled: sortableDisabled,
      sensors,
      transition: null,
    });

    const dragHandleRef = isHandleDisabled ? undefined : handleRef;
    const setRefs = (node: HTMLDivElement | null) => {
      ref(node);
      assignRef(forwardedRef, node);
    };

    useEffect(() => {
      if (isDragging && !wasDraggingRef.current) {
        setIsTouchPulseActive(lastInputModeRef.current === "touch");
      } else if (!isDragging && wasDraggingRef.current) {
        setIsTouchPulseActive(false);
      }

      wasDraggingRef.current = isDragging;
    }, [isDragging]);

    return (
      <motion.div
        ref={setRefs}
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          layout: {
            type: "spring",
            stiffness: 320,
            damping: 34,
            mass: 0.95,
          },
          opacity: {
            duration: 0.16,
            ease: "easeOut",
          },
        }}
        className={boardStyles.columnTrack}
        data-id={id}
        data-draggable={readOnly ? undefined : "column"}
        data-archiving="false"
        onPointerDownCapture={(event) => {
          lastInputModeRef.current =
            event.pointerType === "touch" ? "touch" : "pointer";
        }}
        onKeyDownCapture={() => {
          lastInputModeRef.current = "keyboard";
        }}
        style={{
          zIndex: isDragging ? 100 : "auto",
        }}
      >
        <div
          className={`${columnStyles.columnWrapper} ${
            sortableDisabled ? columnStyles.columnWrapperReadOnly : ""
          } ${isTouchPulseActive ? columnStyles.columnWrapperTouchPulse : ""}`}
          data-pan-block="true"
        >
          <DragHandleContext.Provider value={dragHandleRef}>
            {children}
          </DragHandleContext.Provider>
        </div>
        {footer}
      </motion.div>
    );
  },
);

SortableColumn.displayName = "SortableColumn";

export default SortableColumn;
