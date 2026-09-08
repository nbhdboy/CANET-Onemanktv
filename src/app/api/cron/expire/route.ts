import { NextResponse } from "next/server";
import { runMaintenance } from "@/lib/match";

export async function GET() {
  runMaintenance();
  return NextResponse.json({ ok: true });
}
