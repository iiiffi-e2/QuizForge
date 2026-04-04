import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assertValidQuizSessionForSave,
  deriveDefaultTitle,
} from "@/lib/saved-quiz";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.savedQuiz.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const rawSession = (body as { session: unknown; title?: unknown }).session;
  try {
    assertValidQuizSessionForSave(rawSession);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid quiz session.";
    const status = msg.includes("too large") ? 413 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const titleRaw = (body as { title?: unknown }).title;
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim().slice(0, 200)
      : deriveDefaultTitle(rawSession.request);

  const row = await prisma.savedQuiz.create({
    data: {
      userId: session.user.id,
      title,
      session: rawSession as object,
    },
  });

  return NextResponse.json({ id: row.id }, { status: 201 });
}
