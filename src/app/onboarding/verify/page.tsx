import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProfile } from "@/lib/users";

export default async function VerifyRemovedPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = getProfile(session.id);
  if (!profile?.profile_completed) redirect("/onboarding");
  redirect("/");
}
