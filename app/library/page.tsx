import { Navbar } from "@/components/Navbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LibraryClient } from "./LibraryClient";

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/library");
  }

  const items = await prisma.savedQuiz.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <LibraryClient
        initialItems={items.map((i) => ({
          id: i.id,
          title: i.title,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
