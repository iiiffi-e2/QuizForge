import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/**
 * Returns a Redis REST client when Upstash env vars are set; otherwise null.
 * Used for short-lived stored quiz share payloads.
 */
export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.trim() || !token?.trim()) {
    return null;
  }
  if (!client) {
    client = new Redis({ url, token });
  }
  return client;
}

export function isShareStorageConfigured(): boolean {
  return getRedis() !== null;
}
