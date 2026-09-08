import { NextResponse } from "next/server";
import { getDb, getConfig, track } from "@/lib/db";
import { maybeConfirmMatch, runMaintenance } from "@/lib/match";
import { nowIso } from "@/lib/time";
import type { PaymentRecord } from "@/lib/types";

/**
 * LIVE 金流 webhook。成功與否以伺服器收到的 gateway 事件為準，
 * 前端顯示付款成功不可直接改 Match。
 */
export async function POST(req: Request) {
  const mode = getConfig("payment_mode") || process.env.PAYMENT_MODE || "MOCK";
  if (mode !== "LIVE") {
    return NextResponse.json({ error: "PAYMENT_MODE 不是 LIVE" }, { status: 400 });
  }

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const header = req.headers.get("x-kplus1-webhook-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    transaction_id?: string;
    payment_id?: string;
    status?: string;
  };

  if (!body.payment_id || body.status !== "PAID") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  runMaintenance();
  const db = getDb();
  const pay = db
    .prepare(`SELECT * FROM payments WHERE id = ?`)
    .get(body.payment_id) as PaymentRecord | undefined;
  if (!pay) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (pay.status === "PAID" || pay.status === "NOT_REQUIRED") {
    return NextResponse.json({ ok: true });
  }

  const now = nowIso();
  db.prepare(
    `UPDATE payments SET status = 'PAID', transaction_id = ?, paid_at = ?
     WHERE id = ? AND status = 'PENDING'`,
  ).run(body.transaction_id || `live_${pay.id}`, now, pay.id);
  track("payment_success", pay.user_id, { paymentId: pay.id, matchId: pay.match_id });
  maybeConfirmMatch(pay.match_id);
  return NextResponse.json({ ok: true });
}
