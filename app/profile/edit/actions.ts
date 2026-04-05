"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const MAX_NAME = 80;
const MAX_IMAGE_URL = 2048;
const MIN_PASSWORD = 8;

function validateImageUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.length > MAX_IMAGE_URL) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return t;
}

export async function updateProfileAction(input: {
  name: string;
  imageUrl: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const name = input.name.trim().slice(0, MAX_NAME) || null;
  const image = validateImageUrl(input.imageUrl);
  if (input.imageUrl.trim() && image === null) {
    return { error: "Image must be a valid http(s) URL." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, image },
  });

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { ok: true };
}

export async function updatePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const { currentPassword, newPassword, confirmPassword } = input;
  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }
  if (newPassword.length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (user?.passwordHash) {
    if (!currentPassword) {
      return { error: "Enter your current password." };
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return { ok: true };
}
