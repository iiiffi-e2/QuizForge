"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  updatePasswordAction,
  updateProfileAction,
} from "@/app/profile/edit/actions";

type Props = {
  initialName: string;
  initialImage: string | null;
  hasPassword: boolean;
};

export function EditProfileForm({
  initialName,
  initialImage,
  hasPassword,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState(initialImage ?? "");
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "loading" | "saved" | "error"
  >("idle");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<
    "idle" | "loading" | "saved" | "error"
  >("idle");
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus("loading");
    setProfileMessage(null);
    const result = await updateProfileAction({
      name,
      imageUrl,
    });
    if ("error" in result) {
      setProfileStatus("error");
      setProfileMessage(result.error);
      return;
    }
    await update({
      user: {
        name: name.trim() || null,
        image: imageUrl.trim() ? imageUrl.trim() : null,
      },
    });
    setProfileStatus("saved");
    setProfileMessage("Profile saved.");
    router.refresh();
  }

  async function onSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus("loading");
    setPwMessage(null);
    const result = await updatePasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if ("error" in result) {
      setPwStatus("error");
      setPwMessage(result.error);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwStatus("saved");
    setPwMessage(hasPassword ? "Password updated." : "Password saved.");
  }

  return (
    <div className="space-y-10">
      <form onSubmit={onSaveProfile} className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--quiz-text-primary)]">
          Name & photo
        </h2>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--quiz-text-primary)]">
          Display name
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-4 py-3 text-[var(--quiz-text-primary)] outline-none ring-[var(--quiz-brand-500)]/30 transition-shadow focus:ring-2"
            placeholder="Your name"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--quiz-text-primary)]">
          Profile picture URL
          <input
            type="url"
            name="imageUrl"
            autoComplete="photo"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-4 py-3 text-[var(--quiz-text-primary)] outline-none ring-[var(--quiz-brand-500)]/30 transition-shadow focus:ring-2"
            placeholder="https://…"
          />
        </label>
        <p className="text-xs text-[var(--quiz-text-secondary)]">
          Paste a link to an image (https). Leave blank to use initials on your
          profile.
        </p>
        <button
          type="submit"
          disabled={profileStatus === "loading"}
          className="rounded-xl bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-4 py-3 text-sm font-bold text-white shadow-[var(--quiz-glow)] transition-all hover:from-[var(--quiz-brand-600)] hover:to-[var(--quiz-brand-700)] disabled:opacity-60"
        >
          {profileStatus === "loading" ? "Saving…" : "Save profile"}
        </button>
        {profileMessage ? (
          <p
            className={`text-sm ${profileStatus === "error" ? "text-red-600 dark:text-red-400" : "text-[var(--quiz-text-secondary)]"}`}
          >
            {profileMessage}
          </p>
        ) : null}
      </form>

      <form onSubmit={onSavePassword} className="space-y-4 border-t border-[var(--quiz-border)] pt-10">
        <h2 className="text-lg font-semibold text-[var(--quiz-text-primary)]">
          Password
        </h2>
        <p className="text-sm text-[var(--quiz-text-secondary)]">
          {hasPassword
            ? "Change the password you use with email sign-in (optional; you can still use magic links)."
            : "Add a password if you want to sign in with email and password as well as magic links."}
        </p>
        {hasPassword ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--quiz-text-primary)]">
            Current password
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-4 py-3 text-[var(--quiz-text-primary)] outline-none ring-[var(--quiz-brand-500)]/30 transition-shadow focus:ring-2"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--quiz-text-primary)]">
          New password
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-4 py-3 text-[var(--quiz-text-primary)] outline-none ring-[var(--quiz-brand-500)]/30 transition-shadow focus:ring-2"
            minLength={8}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--quiz-text-primary)]">
          Confirm new password
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-4 py-3 text-[var(--quiz-text-primary)] outline-none ring-[var(--quiz-brand-500)]/30 transition-shadow focus:ring-2"
            minLength={8}
          />
        </label>
        <button
          type="submit"
          disabled={pwStatus === "loading"}
          className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm font-bold text-[var(--quiz-text-primary)] transition-colors hover:bg-[var(--quiz-surface)] disabled:opacity-60"
        >
          {pwStatus === "loading"
            ? "Saving…"
            : hasPassword
              ? "Update password"
              : "Save password"}
        </button>
        {pwMessage ? (
          <p
            className={`text-sm ${pwStatus === "error" ? "text-red-600 dark:text-red-400" : "text-[var(--quiz-text-secondary)]"}`}
          >
            {pwMessage}
          </p>
        ) : null}
      </form>

      <p className="text-center text-sm text-[var(--quiz-text-secondary)]">
        <Link
          href="/profile"
          className="font-medium text-[var(--quiz-brand-600)] hover:underline"
        >
          Back to profile
        </Link>
      </p>
    </div>
  );
}
