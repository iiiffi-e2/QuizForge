import { NextResponse } from "next/server";
import { getRedis } from "@/lib/upstash";
import { QuizSession } from "@/lib/types";

export const dynamic = "force-dynamic";

const ID_PATTERN = /^[a-zA-Z0-9_-]{8,32}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Short links are not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!id || !ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid share id." }, { status: 400 });
  }

  const raw = await redis.get<string>(`share:${id}`);
  if (raw == null || raw === "") {
    return NextResponse.json(
      { error: "This link has expired or is invalid." },
      { status: 404 },
    );
  }

  let session: QuizSession;
  try {
    session = JSON.parse(raw) as QuizSession;
  } catch {
    return NextResponse.json({ error: "Corrupted share data." }, { status: 500 });
  }

  if (!session?.quiz?.questions?.length) {
    return NextResponse.json({ error: "Invalid share payload." }, { status: 500 });
  }

  return NextResponse.json({ session });
}
