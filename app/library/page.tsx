import { redirect } from "next/navigation";

/** @deprecated Use `/profile` — saved quizzes live on the profile page. */
export default function LibraryRedirectPage() {
  redirect("/profile");
}
