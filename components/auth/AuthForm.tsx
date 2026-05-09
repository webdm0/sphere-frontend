"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import styles from "@/components/common/form.module.css";
import { AnimatePresence, motion } from "framer-motion";

type AuthFormProps = {
  title: string;
  onSubmit?: (e: React.FormEvent) => void;
  children: React.ReactNode;
  redirect: Redirect;
  error?: string;
};

type Redirect =
  | { type: "link"; href: string; label: string }
  | { type: "action"; label: string; onClick: () => void };

export default function AuthForm({
  title,
  onSubmit,
  children,
  redirect,
  error,
}: AuthFormProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const handleRedirectClick = useCallback(() => {
    setIsRedirecting(true);
  }, []);

  return (
    <div className="flex items-center justify-center h-screen relative z-[1] overflow-hidden">
      <form onSubmit={onSubmit} className={styles.formAuth}>
        <h1 className={`text-xl sm:text-2xl ${styles.glitchText}`}>{title}</h1>
        
        {children}
        <AnimatePresence initial={false}>
          {error ? (
            <motion.div
              key="auth-error"
              className="overflow-hidden"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm text-gray-600 text-center" role="alert" aria-live="polite">
                {error}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="text-sm text-center">
          {redirect.type === "link" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: isRedirecting ? 0.4 : 0.9,
                filter: isRedirecting ? "grayscale(1)" : "grayscale(0)"
              }}
              style={{ pointerEvents: isRedirecting ? 'none' : 'auto' }}
              transition={{ 
                opacity: { duration: isRedirecting ? 0.4 : 0.6, delay: isRedirecting ? 0 : 1.2 },
                filter: { duration: 0.4 }
              }}
            >
              <Link
                href={redirect.href}
                className={`${styles.fadeLink} focus-ring`}
                onClick={handleRedirectClick}
                aria-disabled={isRedirecting || undefined}
                tabIndex={isRedirecting ? -1 : undefined}
              >
                {redirect.label}
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <button
                type="button"
                onClick={redirect.onClick}
                aria-label={redirect.label}
                className={`${styles.fadeLink} focus-ring`}
              >
                {redirect.label}
              </button>
            </motion.div>
          )}
        </div>
      </form>
    </div>
  );
}
