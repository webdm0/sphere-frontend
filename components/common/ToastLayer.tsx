"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "@/components/modals/ModalsArchive/ArchiveModal.module.css";

type ToastLayerProps = {
  message: string;
  note?: string;
  durationMs?: number;
  onDismiss: () => void;
};

export default function ToastLayer({
  message,
  note,
  durationMs = 3200,
  onDismiss,
}: ToastLayerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs]);

  return (
    <div className={styles.toastLayer} aria-live="polite">
      <AnimatePresence onExitComplete={onDismiss}>
        {visible && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24 }}
          >
            <div className={styles.toastText}>{message}</div>
            {note && <div className={styles.toastNote}>{note}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
