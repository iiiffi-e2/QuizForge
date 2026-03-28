"use client";

import { STORAGE_KEYS } from "@/lib/constants";
import { QuizGenerationRequest, QuizSession } from "@/lib/types";

/** Stay under typical ~5MB localStorage limits; large entries fail before setItem too. */
const MAX_LOCAL_STORAGE_CHARS = 4_000_000;
/** Truncate pasted text when persisting so drafts still fit after slimming. */
const MAX_TEXT_CONTENT_CHARS = 350_000;

function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.code === 22)
  );
}

/**
 * Returns true when `content` is non-empty and, for file/image uploads, includes a non-empty data URL.
 */
export function hasQuizSourceContent(request: QuizGenerationRequest): boolean {
  if (!request.content.trim()) return false;
  if (request.input_type === "file" || request.input_type === "image") {
    try {
      const parsed = JSON.parse(request.content) as { dataUrl?: string };
      return typeof parsed.dataUrl === "string" && parsed.dataUrl.length > 0;
    } catch {
      return false;
    }
  }
  return true;
}

function slimRequestForStorage(request: QuizGenerationRequest): QuizGenerationRequest {
  if (request.input_type === "file" || request.input_type === "image") {
    try {
      const parsed = JSON.parse(request.content) as {
        fileName?: string;
        mimeType?: string;
        dataUrl?: string;
      };
      return {
        ...request,
        content: JSON.stringify({
          fileName: parsed.fileName ?? "",
          mimeType: parsed.mimeType ?? "",
          dataUrl: "",
        }),
      };
    } catch {
      return { ...request, content: "" };
    }
  }
  if (request.content.length > MAX_TEXT_CONTENT_CHARS) {
    return {
      ...request,
      content: request.content.slice(0, MAX_TEXT_CONTENT_CHARS),
    };
  }
  return request;
}

function persistJson(key: string, candidates: string[]): void {
  for (const candidate of candidates) {
    if (candidate.length > MAX_LOCAL_STORAGE_CHARS) continue;
    try {
      localStorage.setItem(key, candidate);
      return;
    } catch (error) {
      if (!isQuotaExceeded(error)) return;
    }
  }
}

export function saveRequestDraft(request: QuizGenerationRequest): void {
  if (!hasLocalStorage()) return;
  const full = JSON.stringify(request);
  const slim = JSON.stringify(slimRequestForStorage(request));
  const minimal = JSON.stringify({
    input_type: request.input_type,
    content: "",
    settings: request.settings,
  });
  persistJson(STORAGE_KEYS.REQUEST_DRAFT, [full, slim, minimal]);
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
  const full = JSON.stringify(session);
  const slimmedSession: QuizSession = {
    ...session,
    request: slimRequestForStorage(session.request),
  };
  const slim = JSON.stringify(slimmedSession);
  persistJson(STORAGE_KEYS.QUIZ_SESSION, [full, slim]);
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
