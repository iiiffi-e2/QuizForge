import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateJoinCode } from "@/lib/assignment-join-code";
import { prisma } from "@/lib/prisma";
import {
  assertValidQuizSessionForSave,
  deriveDefaultTitle,
} from "@/lib/saved-quiz";
import { extractQuestionCountFromSnapshot } from "@/lib/assignment-snapshot-meta";
import type { QuizSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.assignment.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      joinCode: true,
      title: true,
      status: true,
      createdAt: true,
      closedAt: true,
      quizSnapshot: true,
      _count: { select: { submissions: true } },
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      publicId: r.publicId,
      joinCode: r.joinCode,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      closedAt: r.closedAt?.toISOString() ?? null,
      submissionCount: r._count.submissions,
      questionCount: extractQuestionCountFromSnapshot(r.quizSnapshot),
    })),
  });
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

  if (typeof body !== "object" || body === null || !("savedQuizId" in body)) {
    return NextResponse.json({ error: "Body must include savedQuizId." }, { status: 400 });
  }

  const savedQuizId = (body as { savedQuizId: unknown }).savedQuizId;
  if (typeof savedQuizId !== "string" || !savedQuizId.trim()) {
    return NextResponse.json({ error: "savedQuizId is required." }, { status: 400 });
  }

  const saved = await prisma.savedQuiz.findFirst({
    where: { id: savedQuizId.trim(), userId: session.user.id },
  });

  if (!saved) {
    return NextResponse.json({ error: "Saved quiz not found." }, { status: 404 });
  }

  const rawSession = saved.session;
  try {
    assertValidQuizSessionForSave(rawSession);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid quiz session.";
    const status = msg.includes("too large") ? 413 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const quizSession = rawSession as QuizSession;
  const title = deriveDefaultTitle(quizSession.request).slice(0, 200);
  const origin = new URL(request.url).origin;

  for (let attempt = 0; attempt < 5; attempt++) {
    const publicId = nanoid(12);
    const joinCode = generateJoinCode();
    try {
      const row = await prisma.assignment.create({
        data: {
          publicId,
          joinCode,
          ownerId: session.user.id,
          title,
          quizSnapshot: rawSession as object,
          sourceSavedQuizId: saved.id,
          status: "ACTIVE",
        },
      });
      return NextResponse.json(
        {
          id: row.id,
          publicId: row.publicId,
          joinCode: row.joinCode,
          title: row.title,
          assignmentUrl: `${origin}/quiz?aid=${encodeURIComponent(row.publicId)}`,
        },
        { status: 201 },
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        attempt < 4
      ) {
        continue;
      }
      throw e;
    }
  }

  return NextResponse.json({ error: "Could not create assignment." }, { status: 500 });
}
