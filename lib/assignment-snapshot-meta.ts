/** Lightweight read of question count from stored JSON (no full session validation). */
export function extractQuestionCountFromSnapshot(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const quiz = (snapshot as { quiz?: { questions?: unknown } }).quiz;
  const qs = quiz?.questions;
  return Array.isArray(qs) ? qs.length : null;
}
