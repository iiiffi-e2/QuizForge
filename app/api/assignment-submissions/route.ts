import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assertDisplayNameForGuest,
  normalizeJoinCode,
  parseAssignmentIdempotencyKey,
} from "@/lib/assignment-submission";
import { gradeQuizSnapshot } from "@/lib/assignment-grade";
import { prisma } from "@/lib/prisma";
import { allowRateLimit } from "@/lib/rate-limit-redis";
import { getClientIp } from "@/lib/rate-limit-ip";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ok = await allowRateLimit(`rl:assign-submit:${ip}`, 60, 60);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
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

  const publicId =
    typeof b.publicId === "string" && b.publicId.trim() ? b.publicId.trim() : null;
  const joinCodeRaw = typeof b.joinCode === "string" ? b.joinCode : "";
  const joinNorm = joinCodeRaw ? normalizeJoinCode(joinCodeRaw) : "";

  if (publicId && joinNorm) {
    return NextResponse.json(
      { error: "Provide only one of publicId or joinCode." },
      { status: 400 },
    );
  }
  if (!publicId && !joinNorm) {
    return NextResponse.json(
      { error: "publicId or joinCode is required." },
      { status: 400 },
    );
  }

  const assignment = publicId
    ? await prisma.assignment.findUnique({ where: { publicId } })
    : await prisma.assignment.findFirst({
        where: { joinCode: joinNorm, status: "ACTIVE" },
      });

  if (!assignment || assignment.status !== "ACTIVE") {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const authSession = await auth();
  const userId = authSession?.user?.id ?? null;

  let displayName: string | null = null;
  if (!userId) {
    try {
      displayName = assertDisplayNameForGuest(b.displayName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid display name.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  let idempotencyKey: string;
  try {
    idempotencyKey = parseAssignmentIdempotencyKey(b.idempotencyKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid idempotency key.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let graded: { score: number; questionCount: number };
  try {
    graded = gradeQuizSnapshot(assignment.quizSnapshot, b.answers);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid answers.";
    const status =
      msg.includes("too large") || msg.includes("large") ? 413 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const existingIdem = await prisma.assignmentSubmission.findUnique({
    where: {
      assignmentId_idempotencyKey: {
        assignmentId: assignment.id,
        idempotencyKey,
      },
    },
  });
  if (existingIdem) {
    return NextResponse.json(
      { id: existingIdem.id, duplicate: true },
      { status: 200 },
    );
  }

  if (userId) {
    const existingUser = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: assignment.id, userId },
    });
    if (existingUser) {
      return NextResponse.json(
        { id: existingUser.id, duplicate: true },
        { status: 200 },
      );
    }
  }

  try {
    const row = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: assignment.id,
        userId,
        displayName,
        score: graded.score,
        questionCount: graded.questionCount,
        idempotencyKey,
      },
    });
    return NextResponse.json({ id: row.id, duplicate: false }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const raced = await prisma.assignmentSubmission.findUnique({
        where: {
          assignmentId_idempotencyKey: {
            assignmentId: assignment.id,
            idempotencyKey,
          },
        },
      });
      if (raced) {
        return NextResponse.json(
          { id: raced.id, duplicate: true },
          { status: 200 },
        );
      }
      if (userId) {
        const racedUser = await prisma.assignmentSubmission.findFirst({
          where: { assignmentId: assignment.id, userId },
        });
        if (racedUser) {
          return NextResponse.json(
            { id: racedUser.id, duplicate: true },
            { status: 200 },
          );
        }
      }
    }
    throw e;
  }
}
