import type { Prisma } from "@prisma/client";

/** Validates JSON stored on AssignmentSubmission.answers */
export function parseStoredSubmissionAnswers(
  value: Prisma.JsonValue | null | undefined,
  expectedLength: number,
): number[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  if (value.length !== expectedLength) return null;
  const out: number[] = [];
  for (const x of value) {
    if (typeof x !== "number" || !Number.isInteger(x) || x < -1 || x > 3) {
      return null;
    }
    out.push(x);
  }
  return out;
}
