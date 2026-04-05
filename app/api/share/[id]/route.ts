import { NextResponse } from "next/server";
import { getRedis } from "@/lib/upstash";
import { getSharedQuizSessionById, SHARE_ID_PATTERN } from "@/lib/share-resolve";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!getRedis()) {
    return NextResponse.json(
      { error: "Short links are not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!id || !SHARE_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid share id." }, { status: 400 });
  }

  const session = await getSharedQuizSessionById(id);
  if (!session) {
    return NextResponse.json(
      { error: "This link has expired or is invalid." },
      { status: 404 },
    );
  }

  return NextResponse.json({ session });
}
