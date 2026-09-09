import { NextResponse } from "next/server";
import { useSupabaseApp } from "@/lib/runtime";
import { runMaintenance } from "@/lib/match";
import { runSupabaseMaintenance } from "@/lib/supabase/maintenance";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  if (useSupabaseApp()) {
    const result = await runSupabaseMaintenance();
    return NextResponse.json({ ok: true, ...result });
  }

  runMaintenance();
  return NextResponse.json({ ok: true });
}
