import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadProfile } from "@/lib/app-data";

export default async function VerifyRemovedPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await loadProfile(session.id);
  if (!profile?.profile_completed) redirect("/onboarding");
  redirect("/");
}
