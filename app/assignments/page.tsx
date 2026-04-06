import Link from "next/link";
import { AssignmentsListClient } from "@/components/AssignmentsListClient";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/assignments");
  }

  const items = await prisma.assignment.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      joinCode: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
  });

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--quiz-text-primary)]">
          Class assignments
        </h1>
        <p className="mt-2 text-sm text-[var(--quiz-text-secondary)]">
          Share a link or join code with students and review scores here. Create
          new assignments from your{" "}
          <Link
            href="/profile"
            className="font-medium text-[var(--quiz-brand-600)] hover:underline"
          >
            saved quizzes
          </Link>
          .
        </p>
        <AssignmentsListClient
          initialItems={items.map((i) => ({
            id: i.id,
            publicId: i.publicId,
            joinCode: i.joinCode,
            title: i.title,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
            submissionCount: i._count.submissions,
          }))}
        />
      </main>
    </div>
  );
}
