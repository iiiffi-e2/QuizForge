import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const statusRaw =
    typeof body === "object" && body !== null && "status" in body
      ? (body as { status: unknown }).status
      : null;

  if (statusRaw !== "CLOSED") {
    return NextResponse.json(
      { error: "Only status CLOSED is supported." },
      { status: 400 },
    );
  }

  const result = await prisma.assignment.updateMany({
    where: { id, ownerId: session.user.id },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
