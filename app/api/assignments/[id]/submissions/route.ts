import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseStoredSubmissionAnswers } from "@/lib/assignment-submission-answers";
import { prisma } from "@/lib/prisma";
import { assertValidQuizSessionForSave } from "@/lib/saved-quiz";
import type { QuizSession } from "@/lib/types";

export const dynamic = "force-dynamic";

function rosterLabel(name: string | null, email: string | null): string {
  if (name?.trim()) return name.trim();
  const e = email?.trim();
  if (e && e.includes("@")) return e.split("@")[0] ?? e;
  return e ?? "Student";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      title: true,
      publicId: true,
      joinCode: true,
      status: true,
      createdAt: true,
      closedAt: true,
      quizSnapshot: true,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  let questions: Array<{
    prompt: string;
    choices: string[];
    correctIndex: number;
  }> = [];

  try {
    assertValidQuizSessionForSave(assignment.quizSnapshot);
    const snap = assignment.quizSnapshot as unknown as QuizSession;
    questions = snap.quiz.questions.map((q) => ({
      prompt: q.question,
      choices: q.choices,
      correctIndex: q.correct_index,
    }));
  } catch {
    questions = [];
  }

  const rows = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: assignment.id },
    orderBy: { completedAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const qLen = questions.length;

  return NextResponse.json({
    assignment: {
      title: assignment.title,
      publicId: assignment.publicId,
      joinCode: assignment.joinCode,
      status: assignment.status,
      createdAt: assignment.createdAt.toISOString(),
      closedAt: assignment.closedAt?.toISOString() ?? null,
      questionCount: qLen,
    },
    questions,
    submissions: rows.map((r) => {
      const answers =
        qLen > 0
          ? parseStoredSubmissionAnswers(r.answers, qLen)
          : parseStoredSubmissionAnswers(r.answers, r.questionCount);
      return {
        id: r.id,
        score: r.score,
        questionCount: r.questionCount,
        completedAt: r.completedAt.toISOString(),
        displayName: r.displayName,
        userId: r.userId,
        displayLabel: r.userId
          ? rosterLabel(r.user?.name ?? null, r.user?.email ?? null)
          : (r.displayName ?? "Guest"),
        answers,
      };
    }),
  });
}
