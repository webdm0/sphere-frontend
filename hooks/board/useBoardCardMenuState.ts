"use client";

import { useEffect, useState } from "react";

export function useBoardCardMenuState(
  menuWrapperClass: string,
  menuOpenClass: string
) {
  const [confirmActionMap, setConfirmActionMap] = useState<
    Record<string, "close" | "leave" | null>
  >({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(`.${menuWrapperClass}`)) {
        document
          .querySelectorAll(`.${menuWrapperClass} .${menuOpenClass}`)
          .forEach((menu) => {
            menu.classList.remove(menuOpenClass);
          });
        setConfirmActionMap({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenClass, menuWrapperClass]);

  return { confirmActionMap, setConfirmActionMap };
}
