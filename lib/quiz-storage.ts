"use client";

import { STORAGE_KEYS } from "@/lib/constants";
import { QuizGenerationRequest, QuizSession } from "@/lib/types";

export function saveRequestDraft(request: QuizGenerationRequest): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(STORAGE_KEYS.REQUEST_DRAFT, JSON.stringify(request));
}

export function loadRequestDraft(): QuizGenerationRequest | null {
  if (!hasLocalStorage()) return null;
  const raw = localStorage.getItem(STORAGE_KEYS.REQUEST_DRAFT);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as QuizGenerationRequest;
  } catch {
    return null;
  }
}

export function saveQuizSession(session: QuizSession): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(STORAGE_KEYS.QUIZ_SESSION, JSON.stringify(session));
}

export function loadQuizSession(): QuizSession | null {
  if (!hasLocalStorage()) return null;
  const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_SESSION);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as QuizSession;
  } catch {
    return null;
  }
}

export function saveUserAnswers(answers: number[]): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(STORAGE_KEYS.USER_ANSWERS, JSON.stringify(answers));
}

export function loadUserAnswers(expectedCount: number): number[] {
  if (!hasLocalStorage()) return new Array(expectedCount).fill(-1);
  const raw = localStorage.getItem(STORAGE_KEYS.USER_ANSWERS);
  if (!raw) return new Array(expectedCount).fill(-1);

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Array(expectedCount).fill(-1);
    }

    const normalized = parsed.map((value) =>
      typeof value === "number" ? value : -1,
    );

    if (normalized.length < expectedCount) {
      return [...normalized, ...new Array(expectedCount - normalized.length).fill(-1)];
    }

    return normalized.slice(0, expectedCount);
  } catch {
    return new Array(expectedCount).fill(-1);
  }
}

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
