import { AssignmentSubmissionsClient } from "@/components/AssignmentSubmissionsClient";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  if (!publicId?.trim()) {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/assignments/${encodeURIComponent(publicId)}`);
  }

  const assignment = await prisma.assignment.findFirst({
    where: { publicId: publicId.trim(), ownerId: session.user.id },
    select: { id: true, title: true },
  });

  if (!assignment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <AssignmentSubmissionsClient
          assignmentId={assignment.id}
          assignmentTitle={assignment.title}
        />
      </main>
    </div>
  );
}
