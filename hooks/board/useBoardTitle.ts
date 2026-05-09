"use client";

import { useEffect, useState } from "react";

export function useBoardTitle(derivedTitle: string, baseTitle = "Sphere") {
  const [optimisticTitle, setOptimisticTitle] = useState(derivedTitle);

  useEffect(() => {
    setOptimisticTitle(derivedTitle);
  }, [derivedTitle]);

  useEffect(() => {
    const name = (optimisticTitle || derivedTitle || "Untitled").trim();
    document.title = `${name} | ${baseTitle}`;
    return () => {
      document.title = baseTitle;
    };
  }, [baseTitle, derivedTitle, optimisticTitle]);

  return { optimisticTitle, setOptimisticTitle };
}
