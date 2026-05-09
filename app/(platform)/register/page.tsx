"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoAuthSession } from "@/hooks/auth/useDemoAuthSession";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import AuthForm from "@/components/auth/AuthForm";
import AuthPageShell from "@/components/auth/AuthPageShell";
import styles from "@/components/common/form.module.css";
import { AnimatePresence, motion } from "framer-motion";

const INITIAL_COOLDOWN_SECONDS = 30;
const RESEND_COOLDOWN_SECONDS = 120;

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isStartingDemo, handleTryDemo } = useDemoAuthSession({ setError });

  const { register, resendConfirmation } = useAuthActions({
    resendConfirmation: {
      onMutate: () => {
        setError("");
      },
      onSuccess: () => {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to resend email");
      },
    },
  });

  useEffect(() => {
    if (step !== "form") return;
    router.prefetch("/login");
  }, [router, step]);

  useEffect(() => {
    if (step !== "verify" || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (register.isPending || isSubmitting || isStartingDemo) return;
    setIsSubmitting(true);
    setError("");

    try {
      await register.mutateAsync({ username, email, password });
      setStep("verify");
      setResendCooldown(INITIAL_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Registration failed";
      setError(message);
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (!email || resendCooldown > 0) return;
    resendConfirmation.mutate(email);
  };

  return (
    <AuthPageShell onTryDemo={handleTryDemo} isTryingDemo={isStartingDemo}>
      <motion.div
        className="flex items-center justify-center min-h-screen backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {step === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <AuthForm
              title="Register"
              onSubmit={handleSubmit}
              redirect={{ type: "link", href: "/login", label: "Already have an account?" }}
              error={error}
            >
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                required
                className={styles.input}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
                className={styles.input}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
              <button
                type="submit"
                disabled={register.isPending || isSubmitting || isStartingDemo}
                aria-label="Register"
                className={`${styles.button} focus-ring ${
                  isSubmitting ? styles.buttonLoading : ""
                }`}
              ></button>
            </AuthForm>
          </motion.div>
        ) : (
          <motion.div
            key="verify"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <AuthForm
              title="Check your email"
              redirect={{
                type: "action",
                onClick: () => {
                  setIsSubmitting(false);
                  setStep("form");
                },
                label: "Back to registration",
              }}
              error={error}
            >
              <p className="text-sm leading-relaxed">
                We sent a link to activate your account.
              </p>
              <motion.button
                type="button"
                onClick={handleResend}
                disabled={
                  resendCooldown > 0 || resendConfirmation.isPending
                }
                aria-label="Resend confirmation email"
                className={`${styles.readOnlyRestoreText} focus-ring`}
                animate={{
                  opacity:
                    resendCooldown > 0 || resendConfirmation.isPending ? 0.5 : 1,
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                Resend
                <AnimatePresence initial={false}>
                  {resendCooldown > 0 && (
                    <motion.span
                      key="cooldown"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="ml-1"
                    >
                      ({resendCooldown}s)
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </AuthForm>
          </motion.div>
        )}
      </motion.div>
    </AuthPageShell>
  );
}
