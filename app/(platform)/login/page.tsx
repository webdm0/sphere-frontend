"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/hooks/auth/useAppAuth";
import { useDemoAuthSession } from "@/hooks/auth/useDemoAuthSession";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import AuthForm from "@/components/auth/AuthForm";
import AuthPageShell from "@/components/auth/AuthPageShell";
import styles from "@/components/common/form.module.css";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithToken } = useAppAuth();
  const { login } = useAuthActions();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isStartingDemo, handleTryDemo } = useDemoAuthSession({ setError });

  useEffect(() => {
    router.prefetch("/register");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (login.isPending || isSubmitting || isStartingDemo) return;
    setIsSubmitting(true);
    setError("");

    try {
      const response = await login.mutateAsync({ identifier, password });
      await loginWithToken(response.accessToken);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Login failed";
      setError(message);
      setIsSubmitting(false);
    }
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <AuthForm
            title="Log In"
            onSubmit={handleSubmit}
            redirect={{ type: "link", href: "/register", label: "Don't have an account?" }}
            error={error}
          >
            <input
              type="text"
              placeholder="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
              disabled={login.isPending || isSubmitting || isStartingDemo}
              aria-label="Log in"
              className={`${styles.button} focus-ring ${
                isSubmitting ? styles.buttonLoading : ""
              }`}
            ></button>
          </AuthForm>
        </motion.div>
      </motion.div>
    </AuthPageShell>
  );
}
