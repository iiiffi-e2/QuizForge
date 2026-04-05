import { Navbar } from "@/components/Navbar";
import { EditProfileForm } from "@/components/EditProfileForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/profile/edit");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      image: true,
      passwordHash: true,
    },
  });

  if (!user) {
    redirect("/sign-in?callbackUrl=/profile/edit");
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--quiz-text-primary)]">
          Edit profile
        </h1>
        <p className="mt-2 text-sm text-[var(--quiz-text-secondary)]">
          Update how you appear on your profile and manage your password.
        </p>
        <div className="mt-8 rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 sm:p-6">
          <EditProfileForm
            initialName={user.name ?? ""}
            initialImage={user.image}
            hasPassword={!!user.passwordHash}
          />
        </div>
      </main>
    </div>
  );
}
