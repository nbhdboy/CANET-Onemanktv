import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSupabaseProfile, fetchSupabaseProfile } from "@/lib/supabase/profiles";
import { ensureOAuthUser, getProfile } from "@/lib/users";
import { safeNextPath } from "@/lib/auth-redirect";
import { useSupabaseApp } from "@/lib/runtime";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const fail = new URL("/login", origin);
  fail.searchParams.set("error", "oauth");
  if (next !== "/") fail.searchParams.set("next", next);

  if (!code) return NextResponse.redirect(fail);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(fail);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(fail);

  try {
    if (useSupabaseApp()) {
      const profile =
        (await fetchSupabaseProfile(user.id)) ?? (await ensureSupabaseProfile(user.id));
      if (profile?.status === "BANNED" || profile?.status === "SUSPENDED") {
        const blocked = new URL("/login", origin);
        blocked.searchParams.set(
          "error",
          profile.status === "BANNED" ? "banned" : "suspended",
        );
        return NextResponse.redirect(blocked);
      }
      await createSession({ id: user.id, email: user.email });
      const dest = profile?.profile_completed ? next : "/onboarding";
      return NextResponse.redirect(new URL(dest, origin));
    }

    const local = ensureOAuthUser(user.id, user.email);
    const profile = getProfile(local.id);
    if (profile?.status === "BANNED" || profile?.status === "SUSPENDED") {
      const blocked = new URL("/login", origin);
      blocked.searchParams.set(
        "error",
        profile.status === "BANNED" ? "banned" : "suspended",
      );
      return NextResponse.redirect(blocked);
    }

    await createSession({ id: local.id, email: local.email });
    const dest = profile?.profile_completed ? next : "/onboarding";
    return NextResponse.redirect(new URL(dest, origin));
  } catch (err) {
    console.error("oauth callback", err);
    return NextResponse.redirect(fail);
  }
}
