import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { slimQuizRequest } from "@/lib/slim-quiz-request";
import { QuizSession } from "@/lib/types";

/** Browsers and proxies vary; keep shared quiz links safely under typical limits. */
const MAX_SHARE_URL_LENGTH = 32000;

/**
 * Returns a shareable URL for the quiz, or null if the payload is still too
 * large (e.g. very long pasted text). Image/file bytes are never embedded.
 */
export function encodeQuizToUrl(session: QuizSession): string | null {
  const payload = JSON.stringify({
    r: slimQuizRequest(session.request),
    q: session.quiz,
  });
  const compressed = compressToEncodedURIComponent(payload);
  const url = `${window.location.origin}/quiz?q=${compressed}`;
  if (url.length > MAX_SHARE_URL_LENGTH) {
    return null;
  }
  return url;
}

export function decodeQuizFromUrl(param: string): QuizSession | null {
  try {
    const json = decompressFromEncodedURIComponent(param);
    if (!json) return null;

    const parsed = JSON.parse(json) as { r: QuizSession["request"]; q: QuizSession["quiz"] };
    if (
      !parsed.r ||
      !parsed.q ||
      !Array.isArray(parsed.q.questions) ||
      parsed.q.questions.length === 0
    ) {
      return null;
    }

    return {
      request: parsed.r,
      quiz: parsed.q,
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
