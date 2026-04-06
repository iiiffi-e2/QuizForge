import { NextRequest, NextResponse } from "next/server";
import { normalizeJoinCode } from "@/lib/assignment-submission";
import { prisma } from "@/lib/prisma";
import { allowRateLimit } from "@/lib/rate-limit-redis";
import { getClientIp } from "@/lib/rate-limit-ip";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const ok = await allowRateLimit(`rl:assign-resolve:${ip}`, 30, 60);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const codeRaw = request.nextUrl.searchParams.get("code") ?? "";
  const code = normalizeJoinCode(codeRaw);
  if (!code.length) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const row = await prisma.assignment.findFirst({
    where: { joinCode: code, status: "ACTIVE" },
    select: { publicId: true },
  });

  if (!row) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  return NextResponse.json({ publicId: row.publicId });
}
