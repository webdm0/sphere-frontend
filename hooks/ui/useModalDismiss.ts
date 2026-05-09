import { useCallback, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

export function useModalDismiss<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void
) {
  const modalRef = useRef<T | null>(null);
  const [mouseDownInside, setMouseDownInside] = useState(false);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      if (modalRef.current?.contains(event.target as Node)) {
        setMouseDownInside(true);
      } else {
        setMouseDownInside(false);
      }
    },
    []
  );

  const handleMouseUp = useCallback(
    (event: ReactMouseEvent) => {
      if (!modalRef.current?.contains(event.target as Node) && !mouseDownInside) {
        onClose();
      }
    },
    [mouseDownInside, onClose]
  );

  return { modalRef, handleMouseDown, handleMouseUp };
}
