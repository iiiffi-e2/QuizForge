import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertValidQuizSessionForSave } from "@/lib/saved-quiz";
import type { QuizSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await context.params;
  if (!publicId?.trim()) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const row = await prisma.assignment.findUnique({
    where: { publicId: publicId.trim() },
  });

  if (!row || row.status !== "ACTIVE") {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  try {
    assertValidQuizSessionForSave(row.quizSnapshot);
  } catch {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const quizSession = row.quizSnapshot as unknown as QuizSession;

  return NextResponse.json({
    publicId: row.publicId,
    title: row.title,
    session: quizSession,
  });
}
