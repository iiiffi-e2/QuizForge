import { getRedis } from "@/lib/upstash";

/**
 * Returns true if under limit, false if exceeded.
 * If Redis is not configured, always returns true (dev / no Upstash).
 */
export async function allowRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, windowSeconds);
  }
  return n <= limit;
}
