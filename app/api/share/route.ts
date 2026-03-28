import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { slimQuizRequest } from "@/lib/slim-quiz-request";
import { getRedis } from "@/lib/upstash";
import { QuizSession } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Stay under typical Redis value limits; slimmed payloads only (no base64 uploads). */
const MAX_PAYLOAD_BYTES = 900_000;
const TTL_SECONDS = 60 * 60 * 24 * 30;

function isQuizSession(value: unknown): value is QuizSession {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  if (typeof o.request !== "object" || o.request === null) return false;
  if (typeof o.quiz !== "object" || o.quiz === null) return false;
  const quiz = o.quiz as { questions?: unknown };
  return Array.isArray(quiz.questions) && quiz.questions.length > 0;
}

export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Short links are not configured (missing Upstash credentials)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("session" in body)) {
    return NextResponse.json({ error: "Body must include a session object." }, { status: 400 });
  }

  const rawSession = (body as { session: unknown }).session;
  if (!isQuizSession(rawSession)) {
    return NextResponse.json({ error: "Invalid quiz session." }, { status: 400 });
  }

  const toStore: QuizSession = {
    request: slimQuizRequest(rawSession.request),
    quiz: rawSession.quiz,
    created_at: rawSession.created_at ?? new Date().toISOString(),
  };

  const json = JSON.stringify(toStore);
  if (Buffer.byteLength(json, "utf8") > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Quiz is too large to store. Try fewer questions or a shorter source." },
      { status: 413 },
    );
  }

  const id = nanoid(12);
  await redis.set(`share:${id}`, json, { ex: TTL_SECONDS });

  const origin = new URL(request.url).origin;
  const url = `${origin}/quiz?sid=${encodeURIComponent(id)}`;

  return NextResponse.json({ id, url });
}
