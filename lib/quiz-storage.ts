"use client";

import { STORAGE_KEYS } from "@/lib/constants";
import { slimQuizRequest } from "@/lib/slim-quiz-request";
import { QuizGenerationRequest, QuizSession } from "@/lib/types";

export type QuizImagePreview = {
  dataUrl: string;
  fileName: string;
};

/** Stay under typical ~5MB localStorage limits; large entries fail before setItem too. */
const MAX_LOCAL_STORAGE_CHARS = 4_000_000;
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

/**
 * Removes embedded file/image data URLs from the request. Use before encoding a
 * quiz into a URL so shared links stay within browser and server limits.
 */
export function slimRequestForShareUrl(request: QuizGenerationRequest): QuizGenerationRequest {
  return slimQuizRequest(request);
}

function slimRequestForStorage(request: QuizGenerationRequest): QuizGenerationRequest {
  return slimQuizRequest(request);
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
  if (session.request.input_type === "image") {
    try {
      const parsed = JSON.parse(session.request.content) as {
        dataUrl?: string;
        fileName?: string;
        mimeType?: string;
      };
      if (typeof parsed.dataUrl === "string" && parsed.dataUrl.length > 0) {
        persistQuizImagePreview({
          dataUrl: parsed.dataUrl,
          fileName: typeof parsed.fileName === "string" ? parsed.fileName : "",
        });
      } else {
        clearQuizImagePreview();
      }
    } catch {
      clearQuizImagePreview();
    }
  } else {
    clearQuizImagePreview();
  }

  const full = JSON.stringify(session);
  const slimmedSession: QuizSession = {
    ...session,
    request: slimRequestForStorage(session.request),
  };
  const slim = JSON.stringify(slimmedSession);
  persistJson(STORAGE_KEYS.QUIZ_SESSION, [full, slim]);
}

function persistQuizImagePreview(preview: QuizImagePreview): void {
  if (!hasLocalStorage()) return;
  const payload = JSON.stringify(preview);
  if (payload.length > MAX_LOCAL_STORAGE_CHARS) {
    clearQuizImagePreview();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEYS.QUIZ_IMAGE_PREVIEW, payload);
  } catch (error) {
    if (isQuotaExceeded(error)) {
      clearQuizImagePreview();
    }
  }
}

export function loadQuizImagePreview(): QuizImagePreview | null {
  if (!hasLocalStorage()) return null;
  const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_IMAGE_PREVIEW);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("dataUrl" in parsed) ||
      typeof (parsed as { dataUrl: unknown }).dataUrl !== "string" ||
      !(parsed as { dataUrl: string }).dataUrl.trim()
    ) {
      return null;
    }
    const fileName =
      "fileName" in parsed && typeof (parsed as { fileName: unknown }).fileName === "string"
        ? (parsed as { fileName: string }).fileName
        : "";
    return { dataUrl: (parsed as { dataUrl: string }).dataUrl, fileName };
  } catch {
    return null;
  }
}

export function clearQuizImagePreview(): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.QUIZ_IMAGE_PREVIEW);
  } catch {
    // ignore
  }
}

/**
 * Restores image bytes for API calls when the session was slimmed (data URL stripped from storage).
 */
export function mergeStoredImageIntoRequest(
  request: QuizGenerationRequest,
): QuizGenerationRequest {
  if (request.input_type !== "image") return request;
  const preview = loadQuizImagePreview();
  if (!preview?.dataUrl) return request;
  try {
    const parsed = JSON.parse(request.content) as {
      fileName?: string;
      mimeType?: string;
      dataUrl?: string;
    };
    if (parsed.dataUrl && parsed.dataUrl.length > 0) {
      return request;
    }
    return {
      ...request,
      content: JSON.stringify({
        fileName: preview.fileName || parsed.fileName || "",
        mimeType: parsed.mimeType ?? "image/jpeg",
        dataUrl: preview.dataUrl,
      }),
    };
  } catch {
    return {
      ...request,
      content: JSON.stringify({
        fileName: preview.fileName,
        mimeType: "image/jpeg",
        dataUrl: preview.dataUrl,
      }),
    };
  }
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

export function saveTheme(theme: "light" | "dark"): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

export function loadTheme(): "light" | "dark" {
  if (!hasLocalStorage()) return "light";
  const raw = localStorage.getItem(STORAGE_KEYS.THEME);
  return raw === "dark" ? "dark" : "light";
}

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
