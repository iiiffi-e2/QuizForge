import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseQuizAttemptPayload } from "@/lib/quiz-attempt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  let parsed;
  try {
    parsed = parseQuizAttemptPayload({
      session: b.session,
      answers: b.answers,
      idempotencyKey: b.idempotencyKey,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid payload.";
    const status =
      msg.includes("too large") || msg.includes("large") ? 413 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const existing = await prisma.quizAttempt.findUnique({
    where: {
      userId_idempotencyKey: {
        userId: session.user.id,
        idempotencyKey: parsed.idempotencyKey,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { id: existing.id, duplicate: true },
      { status: 200 },
    );
  }

  try {
    const row = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        score: parsed.score,
        questionCount: parsed.questionCount,
        title: parsed.title,
        idempotencyKey: parsed.idempotencyKey,
      },
    });
    return NextResponse.json({ id: row.id, duplicate: false }, { status: 201 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const raced = await prisma.quizAttempt.findUnique({
        where: {
          userId_idempotencyKey: {
            userId: session.user.id,
            idempotencyKey: parsed.idempotencyKey,
          },
        },
      });
      if (raced) {
        return NextResponse.json(
          { id: raced.id, duplicate: true },
          { status: 200 },
        );
      }
    }
    throw e;
  }
}
