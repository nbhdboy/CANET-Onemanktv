import { randomUUID } from "node:crypto";
import { logApp, logAppError } from "@/lib/log";
import { withNotificationHref } from "@/lib/notification-links";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { CreditLedgerEntry } from "@/lib/types";

function writeClient() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

export async function listSupabaseCreditLedger(
  userId: string,
  limit = 20,
): Promise<CreditLedgerEntry[]> {
  const client = writeClient();
  const { data, error } = await client
    .from("credit_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logAppError("credits.list_failed", { userId, message: error.message });
    return [];
  }
  return (data || []).map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    delta: Number(row.delta),
    balance_after: Number(row.balance_after),
    reason: String(row.reason),
    message: row.message ? String(row.message) : null,
    source_match_id: row.source_match_id ? String(row.source_match_id) : null,
    source_payment_id: row.source_payment_id ? String(row.source_payment_id) : null,
    created_at: String(row.created_at),
  }));
}

/** 將已付款金額轉成點數（逾時未成局）。已轉換過的付款不會重複入帳。 */
export async function grantPointsFromPaidPayment(input: {
  userId: string;
  paymentId: string;
  matchId: string;
  amount: number;
}) {
  if (!(input.amount > 0)) return null;
  const client = writeClient();
  const now = new Date().toISOString();

  const { data: pay } = await client
    .from("payments")
    .select("id, status, fee_due, credited_at, user_id")
    .eq("id", input.paymentId)
    .maybeSingle();
  if (!pay || pay.user_id !== input.userId) return null;
  if (pay.status !== "PAID") return null;
  if (pay.credited_at) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("points")
    .eq("id", input.userId)
    .maybeSingle();
  const current = Number(profile?.points ?? 0);
  const next = current + input.amount;
  const message =
    "因為配對對方逾時未付款，已將你支付的金額轉換為點數。下次接受或配對時可全額使用點數支付，無需再刷卡。";

  const ledgerId = randomUUID();
  const { error: ledgerError } = await client.from("credit_ledger").insert({
    id: ledgerId,
    user_id: input.userId,
    delta: input.amount,
    balance_after: next,
    reason: "MATCH_TIMEOUT_CREDIT",
    message,
    source_match_id: input.matchId,
    source_payment_id: input.paymentId,
    created_at: now,
  });
  if (ledgerError) {
    logAppError("credits.grant_ledger_failed", {
      userId: input.userId,
      paymentId: input.paymentId,
      message: ledgerError.message,
    });
    throw new Error(ledgerError.message);
  }

  const { error: profileError } = await client
    .from("profiles")
    .update({ points: next, updated_at: now })
    .eq("id", input.userId);
  if (profileError) throw new Error(profileError.message);

  await client
    .from("payments")
    .update({ credited_at: now })
    .eq("id", input.paymentId)
    .is("credited_at", null);

  await client.from("notifications").insert({
    user_id: input.userId,
    type: "points_credit",
    payload: withNotificationHref("points_credit", {
      matchId: input.matchId,
      paymentId: input.paymentId,
      delta: input.amount,
      balance: next,
      message: `+${input.amount} 點：${message}`,
    }),
    is_read: false,
  });

  logApp("credits.granted", {
    userId: input.userId,
    paymentId: input.paymentId,
    matchId: input.matchId,
    amount: input.amount,
    balance: next,
  });
  return { balance: next, message };
}

/** 全額以點數支付媒合服務費（不開發票）。 */
export async function redeemPointsForPayment(userId: string, paymentId: string) {
  const client = writeClient();
  const now = new Date().toISOString();

  const { data: pay, error } = await client
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!pay || pay.user_id !== userId) throw new Error("找不到付款單。");
  if (pay.status === "PAID" || pay.status === "NOT_REQUIRED") return String(pay.match_id);
  if (pay.status !== "PENDING") throw new Error("此付款單無法支付。");

  const amount = Number(pay.fee_due ?? 0);
  if (!(amount > 0)) throw new Error("此筆無需付款。");

  const { data: match } = await client
    .from("matches")
    .select("id, status, payment_deadline")
    .eq("id", pay.match_id)
    .maybeSingle();
  if (!match || match.status !== "PENDING_PAYMENT") throw new Error("媒合已結束。");
  if (match.payment_deadline && new Date(String(match.payment_deadline)).getTime() <= Date.now()) {
    throw new Error("這次媒合付款時間已結束，名額已重新開放。");
  }

  const { data: profile } = await client
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .maybeSingle();
  const current = Number(profile?.points ?? 0);
  if (current < amount) throw new Error("點數不足，請改用信用卡或 LINE Pay。");

  const next = current - amount;
  const message = `使用 ${amount} 點支付媒合服務費。`;

  const { error: payError } = await client
    .from("payments")
    .update({
      status: "PAID",
      provider: "POINTS",
      credit_applied: amount,
      transaction_id: `pts_${randomUUID().slice(0, 8)}`,
      paid_at: now,
      invoice_status: "NOT_REQUIRED",
    })
    .eq("id", paymentId)
    .eq("status", "PENDING")
    .eq("user_id", userId);
  if (payError) throw new Error(payError.message);

  const { error: profileError } = await client
    .from("profiles")
    .update({ points: next, updated_at: now })
    .eq("id", userId);
  if (profileError) throw new Error(profileError.message);

  await client.from("credit_ledger").insert({
    id: randomUUID(),
    user_id: userId,
    delta: -amount,
    balance_after: next,
    reason: "REDEEM",
    message,
    source_match_id: String(pay.match_id),
    source_payment_id: paymentId,
    created_at: now,
  });

  await client.from("notifications").insert({
    user_id: userId,
    type: "points_redeem",
    payload: withNotificationHref("points_redeem", {
      matchId: pay.match_id,
      paymentId,
      delta: -amount,
      balance: next,
      message: `-${amount} 點：${message}`,
    }),
    is_read: false,
  });

  logApp("credits.redeemed", {
    userId,
    paymentId,
    matchId: pay.match_id,
    amount,
    balance: next,
  });

  const { maybeConfirmSupabaseMatch } = await import("@/lib/supabase/matches");
  await maybeConfirmSupabaseMatch(String(pay.match_id));
  return String(pay.match_id);
}
