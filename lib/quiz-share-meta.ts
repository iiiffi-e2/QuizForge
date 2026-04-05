import type { QuizSession } from "@/lib/types";

const MAX_TITLE = 70;
const MAX_DESC = 160;

function truncate(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function isReadableTopicForTitle(content: string): boolean {
  const t = content.trim();
  if (!t) return false;
  if (t.startsWith("data:")) return false;
  if (t.length > 200) return false;
  if (t.length > 120 && /^[A-Za-z0-9+/=\s]+$/.test(t)) return false;
  return true;
}

/** User-visible title for browser tab + OG (no raw file dumps). */
export function shareQuizMetaTitle(session: QuizSession): string {
  const { input_type: inputType, content } = session.request;
  if (inputType === "file" || inputType === "image") {
    return "Quiz on QuizForge";
  }
  const topic = content?.trim() ?? "";
  if (topic && isReadableTopicForTitle(topic)) {
    return truncate(topic, MAX_TITLE);
  }
  return "Quiz on QuizForge";
}

export function shareQuizMetaDescription(session: QuizSession): string {
  const n = session.quiz.questions.length;
  const base = `Answer ${n} question${n === 1 ? "" : "s"} on QuizForge.`;
  return truncate(base, MAX_DESC);
}
