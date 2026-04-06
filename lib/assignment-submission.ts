const MAX_IDEMPOTENCY_KEY_LEN = 128;
const MAX_DISPLAY_NAME_LEN = 80;

export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function assertDisplayNameForGuest(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error("Display name is required.");
  }
  const t = raw.trim();
  if (!t.length) {
    throw new Error("Display name is required.");
  }
  if (t.length > MAX_DISPLAY_NAME_LEN) {
    throw new Error("Display name is too long.");
  }
  return t;
}

export function parseAssignmentIdempotencyKey(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("idempotencyKey is required.");
  }
  const key = raw.trim();
  if (key.length > MAX_IDEMPOTENCY_KEY_LEN) {
    throw new Error("idempotencyKey is too long.");
  }
  return key;
}
