import { getRedis } from "@/lib/upstash";
import type { QuizSession } from "@/lib/types";

/** Matches nanoid(12) and similar share ids from app/api/share/route.ts */
export const SHARE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,32}$/;

/**
 * Loads and validates a shared quiz from Redis. Returns null if missing, invalid, or Redis unavailable.
 */
export async function getSharedQuizSessionById(
  id: string,
): Promise<QuizSession | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  if (!id || !SHARE_ID_PATTERN.test(id)) {
    return null;
  }

  const raw = await redis.get(`share:${id}`);
  if (raw == null || raw === "") {
    return null;
  }

  let session: QuizSession;
  if (typeof raw === "string") {
    try {
      session = JSON.parse(raw) as QuizSession;
    } catch {
      return null;
    }
  } else if (typeof raw === "object" && raw !== null) {
    session = raw as QuizSession;
  } else {
    return null;
  }

  if (!session?.quiz?.questions?.length) {
    return null;
  }

  return session;
}
