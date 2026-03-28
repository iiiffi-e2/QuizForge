import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { QuizSession } from "@/lib/types";

export function encodeQuizToUrl(session: QuizSession): string {
  const payload = JSON.stringify({
    r: session.request,
    q: session.quiz,
  });
  const compressed = compressToEncodedURIComponent(payload);
  return `${window.location.origin}/quiz?q=${compressed}`;
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
