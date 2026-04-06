"use client";

import { Navbar } from "@/components/Navbar";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/profile";
  const [magicEmail, setMagicEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordSignIn, setShowPasswordSignIn] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    const trimmed = magicEmail.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("Enter your email address.");
      return;
    }
    const result = await signIn("resend", { email: trimmed, redirect: false, callbackUrl });
    if (result?.error) {
      setStatus("error");
      setMessage("Could not send sign-in link. Check your email or try again.");
      return;
    }
    setStatus("sent");
    setMessage("Check your inbox for a link to sign in or finish setting up your account.");
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus("loading");
    setPwMessage(null);
    const trimmed = magicEmail.trim();
    if (!trimmed || !password) {
      setPwStatus("error");
      setPwMessage("Enter your email and password.");
      return;
    }
    const result = await signIn("credentials", {
      email: trimmed,
      password,
      redirect: false,
      callbackUrl,
    });
    if (result?.error) {
      setPwStatus("error");
      setPwMessage(
        "Couldn’t sign you in with that email and password. New here? Use the email link above to sign up or sign in first.",
      );
      return;
    }
    setPwStatus("idle");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-[var(--quiz-text-primary)]">
        Sign in or create an account
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-[var(--quiz-text-secondary)]">
        Enter your email and we&apos;ll send you a link to sign in or get started—no password
        required. That&apos;s the usual way to join or come back.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-sm font-medium text-[var(--quiz-text-primary)]">
          Email me a sign-in link
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--quiz-text-primary)]">
          Email
          <input
            type="email"
            name="magicEmail"
            autoComplete="email"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-4 py-3 text-[var(--quiz-text-primary)] outline-none ring-[var(--quiz-brand-500)]/30 transition-shadow focus:ring-2"
            placeholder="you@example.com"
            disabled={status === "loading"}
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading" || pwStatus === "loading"}
          className="rounded-xl bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-4 py-3 text-sm font-bold text-white shadow-[var(--quiz-glow)] transition-all hover:from-[var(--quiz-brand-600)] hover:to-[var(--quiz-brand-700)] disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send link to my email"}
        </button>
        <p className="text-center">
          <button
            type="button"
            onClick={() => {
              setShowPasswordSignIn((v) => !v);
              setPwMessage(null);
            }}
            className="text-sm font-medium text-[var(--quiz-brand-600)] hover:underline"
          >
            {showPasswordSignIn ? "Use email link instead" : "Sign in"}
          </button>
        </p>
      </form>
      {message ? (
        <p
          className={`mt-4 text-sm ${status === "error" ? "text-red-600 dark:text-red-400" : "text-[var(--quiz-text-secondary)]"}`}
        >
          {message}
        </p>
      ) : null}

      {showPasswordSignIn ? (
        <form onSubmit={onPasswordSubmit} className="mt-6 flex flex-col gap-4 border-t border-[var(--quiz-border)] pt-6">
          <p className="text-sm font-medium text-[var(--quiz-text-primary)]">
            Sign in with email and password
          </p>
          <p className="text-xs leading-relaxed text-[var(--quiz-text-secondary)]">
            Optional: if you already use a password with QuizForge, enter it below. The email field
            above is used for both the magic link and password sign-in.
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--quiz-text-primary)]">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-4 py-3 text-[var(--quiz-text-primary)] outline-none ring-[var(--quiz-brand-500)]/30 transition-shadow focus:ring-2"
              placeholder="••••••••"
              disabled={pwStatus === "loading"}
            />
          </label>
          <button
            type="submit"
            disabled={pwStatus === "loading" || status === "loading"}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm font-bold text-[var(--quiz-text-primary)] transition-colors hover:bg-[var(--quiz-surface)] disabled:opacity-60"
          >
            {pwStatus === "loading" ? "Signing in…" : "Sign in with password"}
          </button>
        </form>
      ) : null}
      {pwMessage ? (
        <p
          className={`mt-4 text-sm ${pwStatus === "error" ? "text-red-600 dark:text-red-400" : "text-[var(--quiz-text-secondary)]"}`}
        >
          {pwMessage}
        </p>
      ) : null}
      <p className="mt-8 text-center text-sm text-[var(--quiz-text-secondary)]">
        <Link href="/" className="font-medium text-[var(--quiz-brand-600)] hover:underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <Suspense
        fallback={
          <main className="mx-auto max-w-md px-4 py-16">
            <p className="text-[var(--quiz-text-secondary)]">Loading…</p>
          </main>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
}
