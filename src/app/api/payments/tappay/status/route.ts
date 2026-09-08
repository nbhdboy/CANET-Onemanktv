import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const paymentId = new URL(req.url).searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "missing paymentId" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase unavailable" }, { status: 500 });
  }

  const { data: pay, error } = await supabase
    .from("payments")
    .select("id, match_id, status, invoice_status, invoice_number")
    .eq("id", paymentId)
    .eq("user_id", session.id)
    .maybeSingle();

  if (error || !pay) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: pay.status,
    matchId: pay.match_id,
    invoiceStatus: pay.invoice_status,
    invoiceNumber: pay.invoice_number,
  });
}
