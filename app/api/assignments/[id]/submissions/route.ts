import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    select: { id: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const rows = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: assignment.id },
    orderBy: { completedAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({
    submissions: rows.map((r) => ({
      id: r.id,
      score: r.score,
      questionCount: r.questionCount,
      completedAt: r.completedAt.toISOString(),
      displayName: r.displayName,
      userId: r.userId,
      displayLabel: r.userId
        ? rosterLabel(r.user?.name ?? null, r.user?.email ?? null)
        : (r.displayName ?? "Guest"),
    })),
  });
}
