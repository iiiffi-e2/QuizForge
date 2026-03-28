import { QuizSession } from "@/lib/types";

/**
 * Stores the quiz on the server (Upstash) and returns a short /quiz?sid=… URL, or null if
 * short links are unavailable or the request fails.
 */
export async function createShortShareUrl(session: QuizSession): Promise<string | null> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}

export type FetchSharedQuizResult =
  | { ok: true; session: QuizSession }
  | { ok: false; message: string };

export async function fetchSharedQuizById(id: string): Promise<FetchSharedQuizResult> {
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(id)}`);
    const data = (await res.json()) as { session?: QuizSession; error?: string };
    if (!res.ok) {
      return {
        ok: false,
        message: data.error ?? "Could not load this shared quiz.",
      };
    }
    if (!data.session?.quiz?.questions?.length) {
      return { ok: false, message: "Invalid shared quiz data." };
    }
    return { ok: true, session: data.session };
  } catch {
    return { ok: false, message: "Network error while loading the quiz." };
  }
}
