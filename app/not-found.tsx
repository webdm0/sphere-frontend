"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import styles from "./not-found.module.css";
import formStyles from "@/components/common/form.module.css";

export default function NotFound() {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isNavigating) {
        event.preventDefault();
        return;
      }
      setIsNavigating(true);
    },
    [isNavigating]
  );

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <p className={styles.kicker}>Sphere</p>
        <h1 className={styles.code}>404</h1>
        <p className={styles.title}>Not found</p>
        <Link
          href="/"
          onClick={handleClick}
          aria-label="Back to home"
          aria-busy={isNavigating}
          className={`${formStyles.button} ${styles.button} focus-ring ${
            isNavigating ? formStyles.buttonLoading : ""
          }`}
        >
        </Link>
      </section>
    </main>
  );
}
