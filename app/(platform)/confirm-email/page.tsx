"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppAuth } from "@/hooks/auth/useAppAuth";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { motion } from "framer-motion";
import styles from "./ConfirmEmail.module.css";
import formStyles from "@/components/common/form.module.css";

const REDIRECT_SECONDS = 7;
const SILENT_RECOVERY_DELAY_MS = 4000;

type ConfirmStatus = "confirming" | "success" | "error";

function ConfirmEmailContent() {
  const router = useRouter();
  const { loginWithToken } = useAppAuth();
  const { confirmEmail, refreshSession } = useAuthActions();
  const searchParams = useSearchParams();
  const token = useMemo(
    () => searchParams?.get("token") ?? "",
    [searchParams]
  );

  const [status, setStatus] = useState<ConfirmStatus>("confirming");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const redirectRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);
  const confirmEmailMutateAsyncRef = useRef(confirmEmail.mutateAsync);
  const refreshSessionMutateAsyncRef = useRef(refreshSession.mutateAsync);

  useEffect(() => {
    confirmEmailMutateAsyncRef.current = confirmEmail.mutateAsync;
  }, [confirmEmail.mutateAsync]);

  useEffect(() => {
    refreshSessionMutateAsyncRef.current = refreshSession.mutateAsync;
  }, [refreshSession.mutateAsync]);

  const enterSite = useCallback(() => {
    if (redirectRef.current) return;
    redirectRef.current = true;

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (authToken) {
      loginWithToken(authToken);
      return;
    }

    router.push("/login");
  }, [authToken, loginWithToken, router]);

  const handleEnterClick = () => {
    if (redirectRef.current) return;
    setIsEntering(true);
    enterSite();
  };

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing confirmation token.");
      return;
    }

    if (lastTokenRef.current === token) return;
    lastTokenRef.current = token;
    setStatus("confirming");
    setError(null);
    setAuthToken(null);

    const silentRecoveryTimeoutId = window.setTimeout(() => {
      refreshSessionMutateAsyncRef.current()
        .then((response) => {
          if (!response?.accessToken) return;
          setAuthToken(response.accessToken);
          setSecondsLeft(REDIRECT_SECONDS);
          setStatus("success");
        })
        .catch(() => {
        });
    }, SILENT_RECOVERY_DELAY_MS);

    confirmEmailMutateAsyncRef.current(token)
      .then((response) => {
        setAuthToken(response.accessToken);
        setSecondsLeft(REDIRECT_SECONDS);
        setStatus("success");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Confirmation failed.");
      })
      .finally(() => {
        window.clearTimeout(silentRecoveryTimeoutId);
      });

    return () => {
      window.clearTimeout(silentRecoveryTimeoutId);
    };
  }, [token]);

  useEffect(() => {
    if (status !== "success") return;

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (status !== "success") return;
    if (secondsLeft !== 0) return;
    enterSite();
  }, [enterSite, secondsLeft, status]);

  const ticks = useMemo(
    () => Array.from({ length: REDIRECT_SECONDS }),
    []
  );

  return (
    <motion.main
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.section
        className={styles.card}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className={styles.accent}>
          <span className={styles.accentLine} />
          <span className={styles.accentDot} />
          <span className={styles.accentLine} />
        </div>

        <h1 className={styles.title}>
          {status === "error"
            ? "Confirmation failed"
            : status === "success"
              ? "Email confirmed"
              : "Confirming email"}
        </h1>

        <p className={styles.subtitle}>
          {status === "error"
            ? "This link might be expired or already used."
            : status === "success"
              ? "Your account is ready."
              : "Checking the link in the background."}
        </p>

        {status === "confirming" && (
          <div className={styles.quietMark}>checking</div>
        )}

        {status === "success" && (
          <>
            <div className={styles.countdown} aria-live="polite">
              <span className={styles.countLabel}>redirect in</span>
              <span key={secondsLeft} className={styles.countNumber}>
                {secondsLeft}
              </span>
              <span className={styles.countUnit}>sec</span>
            </div>

            <div className={styles.ticks} aria-hidden="true">
              {ticks.map((_, index) => (
                <span
                  key={index}
                  className={styles.tick}
                  data-active={index < secondsLeft}
                />
              ))}
            </div>

            <p className={styles.notice}>
              You will be redirected into the app after the countdown.
            </p>

            <button
              type="button"
              className={`${formStyles.button} ${styles.enterButton} focus-ring ${
                isEntering ? formStyles.buttonLoading : ""
              }`}
              onClick={handleEnterClick}
              aria-label="Enter the app"
              aria-busy={isEntering}
              disabled={isEntering}
            >
            </button>
          </>
        )}

        {status === "error" && (
          <>
            {error && <p className={styles.errorText}>{error}</p>}
            <button
              type="button"
              className={`${formStyles.button} ${styles.enterButton} ${
                isEntering ? formStyles.buttonLoading : ""
              }`}
              onClick={handleEnterClick}
              aria-label="Go to login"
              aria-busy={isEntering}
              disabled={isEntering}
            >
            </button>
          </>
        )}
      </motion.section>
    </motion.main>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
