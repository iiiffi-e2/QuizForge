"use client";

import { Navbar } from "@/components/Navbar";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/profile";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    const trimmed = email.trim();
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
    setMessage("Check your inbox for a sign-in link.");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-[var(--quiz-text-primary)]">Sign in</h1>
      <p className="mb-8 text-sm text-[var(--quiz-text-secondary)]">
        We&apos;ll email you a magic link — no password.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--quiz-text-primary)]">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-4 py-3 text-[var(--quiz-text-primary)] outline-none ring-[var(--quiz-brand-500)]/30 transition-shadow focus:ring-2"
            placeholder="you@example.com"
            disabled={status === "loading"}
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-4 py-3 text-sm font-bold text-white shadow-[var(--quiz-glow)] transition-all hover:from-[var(--quiz-brand-600)] hover:to-[var(--quiz-brand-700)] disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Email me a link"}
        </button>
      </form>
      {message ? (
        <p
          className={`mt-4 text-sm ${status === "error" ? "text-red-600 dark:text-red-400" : "text-[var(--quiz-text-secondary)]"}`}
        >
          {message}
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
