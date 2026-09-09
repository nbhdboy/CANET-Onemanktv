import { randomUUID } from "node:crypto";
import { logApp, logAppError } from "@/lib/log";
import { isPast } from "@/lib/time";
import { resolveCarrier } from "@/lib/tappay/carrier";
import { tapPayIssueTaxableInvoice, tapPayPayByPrime } from "@/lib/tappay/client";
import { getPublicAppUrl, isLivePayment } from "@/lib/tappay/env";
import { maybeConfirmSupabaseMatch } from "@/lib/supabase/matches";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function client() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

function makeOrderNumber(paymentId: string) {
  // TapPay 規格 order_number 上限 20 字
  const compact = paymentId.replace(/-/g, "").slice(0, 10);
  const time = Date.now().toString(36).slice(-6);
  return `KP${compact}${time}`.slice(0, 20);
}

async function issueInvoiceForPayment(row: Record<string, unknown>) {
  const fee = Number(row.fee_due ?? 0);
  if (fee <= 0) return;
  if (row.invoice_number || row.invoice_status === "ISSUED") return;

  const orderNumber = String(row.order_number || "");
  const buyerEmail = String(row.buyer_email || "");
  if (!orderNumber || !buyerEmail) {
    logAppError("payment.invoice_skipped", {
      paymentId: row.id,
      reason: "missing_order_or_email",
    });
    return;
  }

  const carrier =
    row.carrier_type === 1 || row.carrier_type === 2
      ? {
          type: Number(row.carrier_type) as 1 | 2,
          number: String(row.carrier_number || ""),
        }
      : { type: 0 as const };

  const result = await tapPayIssueTaxableInvoice({
    orderNumber,
    totalAmount: fee,
    buyerEmail,
    buyerName: row.buyer_name ? String(row.buyer_name) : null,
    buyerIdentifier: row.buyer_identifier ? String(row.buyer_identifier) : null,
    carrier,
    description: "K歌+1 媒合服務費",
  });

  const supabase = client();
  if (result.ok) {
    await supabase
      .from("payments")
      .update({
        invoice_status: "ISSUED",
        rec_invoice_id: result.rec_invoice_id ?? null,
        invoice_number: result.invoice_number ?? null,
        invoice_date: result.invoice_date ?? null,
        invoice_time: result.invoice_time ?? null,
      })
      .eq("id", row.id);
  } else {
    await supabase
      .from("payments")
      .update({ invoice_status: "FAILED" })
      .eq("id", row.id);
  }
}

export async function markPaymentPaidAndFulfill(input: {
  paymentId: string;
  transactionId: string;
  bankTransactionId?: string | null;
  provider?: string;
}) {
  const supabase = client();
  const { data: pay, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", input.paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!pay) throw new Error("找不到付款單。");

  if (pay.status === "PAID" || pay.status === "NOT_REQUIRED") {
    return { matchId: String(pay.match_id), alreadyPaid: true as const };
  }
  if (pay.status !== "PENDING") throw new Error("此付款單無法支付。");

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({
      status: "PAID",
      provider: input.provider || pay.provider || "TAPPAY",
      transaction_id: input.transactionId,
      bank_transaction_id: input.bankTransactionId ?? pay.bank_transaction_id ?? null,
      paid_at: now,
    })
    .eq("id", input.paymentId)
    .eq("status", "PENDING")
    .select("*")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!updated) {
    return { matchId: String(pay.match_id), alreadyPaid: true as const };
  }

  await maybeConfirmSupabaseMatch(String(updated.match_id));

  // 開票失敗不阻擋媒合成立
  try {
    await issueInvoiceForPayment(updated as Record<string, unknown>);
  } catch (e) {
    logAppError("payment.invoice_exception", {
      paymentId: input.paymentId,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  logApp("payment.tappay_settled", {
    paymentId: input.paymentId,
    matchId: updated.match_id,
    provider: input.provider || pay.provider,
  });

  return { matchId: String(updated.match_id), alreadyPaid: false as const };
}

export async function chargeTapPayPayment(input: {
  userId: string;
  paymentId: string;
  prime: string;
  buyerEmail: string;
  method?: "card" | "linepay";
  cardholderName?: string;
  carrier?: string | null;
  buyerIdentifier?: string | null;
  buyerName?: string | null;
}) {
  if (!isLivePayment()) {
    throw new Error("目前為 MOCK 模式，請使用模擬付款。");
  }

  const method = input.method === "linepay" || input.prime.startsWith("ln_") ? "linepay" : "card";
  const email = input.buyerEmail.trim();
  if (!email || !email.includes("@")) {
    throw new Error("請填寫有效的發票用 Email。");
  }

  const supabase = client();
  const { data: pay, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", input.paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!pay || pay.user_id !== input.userId) throw new Error("找不到付款單。");
  if (pay.status === "PAID" || pay.status === "NOT_REQUIRED") {
    return { ok: true as const, matchId: String(pay.match_id) };
  }
  if (pay.status !== "PENDING") throw new Error("此付款單無法支付。");

  const amount = Number(pay.fee_due);
  if (!(amount > 0)) throw new Error("此筆無需付款。");

  const { data: match } = await supabase
    .from("matches")
    .select("id, status, payment_deadline")
    .eq("id", pay.match_id)
    .maybeSingle();
  if (!match || match.status !== "PENDING_PAYMENT") {
    throw new Error("媒合已結束。");
  }
  if (match.payment_deadline && isPast(String(match.payment_deadline))) {
    throw new Error("這次媒合付款時間已結束，名額已重新開放。");
  }

  const orderNumber = String(pay.order_number || makeOrderNumber(String(pay.id)));
  const carrier = resolveCarrier(input.carrier);
  const appUrl = getPublicAppUrl();
  const provider = method === "linepay" ? "TAPPAY_LINEPAY" : "TAPPAY";
  const backendNotifyUrl =
    method === "linepay"
      ? `${appUrl}/api/payments/tappay/linepay-notify`
      : `${appUrl}/api/payments/tappay/notify`;

  const { error: prepError } = await supabase
    .from("payments")
    .update({
      order_number: orderNumber,
      provider,
      buyer_email: email,
      carrier_type: carrier.type,
      carrier_number: "number" in carrier ? carrier.number : null,
      buyer_identifier: input.buyerIdentifier?.trim() || null,
      buyer_name: input.buyerName?.trim() || null,
      invoice_status: pay.invoice_status || "PENDING",
    })
    .eq("id", pay.id)
    .eq("status", "PENDING");
  if (prepError) throw new Error(prepError.message);

  const result = await tapPayPayByPrime({
    prime: input.prime,
    amount,
    orderNumber,
    details: "K歌+1 媒合服務費",
    method,
    cardholder: {
      name: input.cardholderName || "",
      email,
      phone_number: "",
    },
    frontendRedirectUrl: `${appUrl}/matches/${pay.match_id}/pay-return?paymentId=${pay.id}`,
    backendNotifyUrl,
    threeDomainSecure: method === "card",
  });

  if (result.status !== 0) {
    throw new Error(result.msg || "TapPay 付款失敗");
  }

  if (result.payment_url) {
    if (result.bank_transaction_id) {
      await supabase
        .from("payments")
        .update({ bank_transaction_id: result.bank_transaction_id })
        .eq("id", pay.id);
    }
    return {
      ok: true as const,
      paymentUrl: result.payment_url,
      orderNumber,
      method,
    };
  }

  // LINE Pay 理論上一定會回 payment_url；若無則視為失敗
  if (method === "linepay") {
    throw new Error("未取得 LINE Pay 付款網址");
  }

  const settled = await markPaymentPaidAndFulfill({
    paymentId: String(pay.id),
    transactionId: result.rec_trade_id || `tappay_${randomUUID().slice(0, 8)}`,
    bankTransactionId: result.bank_transaction_id,
    provider,
  });

  return { ok: true as const, matchId: settled.matchId, orderNumber, method };
}

export async function settleTapPayNotify(body: {
  status?: number | string;
  order_number?: string;
  rec_trade_id?: string;
  bank_transaction_id?: string;
  msg?: string;
}) {
  if (Number(body.status) !== 0) {
    logApp("payment.tappay_notify_ignored", {
      status: body.status,
      orderNumber: body.order_number,
      msg: body.msg,
    });
    return { ok: true, ignored: true as const };
  }

  const orderNumber = body.order_number?.trim();
  if (!orderNumber) {
    return { ok: false, error: "missing order_number" };
  }

  const supabase = client();
  const { data: pay, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!pay) {
    logAppError("payment.tappay_notify_unknown_order", { orderNumber });
    return { ok: false, error: "payment not found" };
  }

  const amountDue = Number(pay.fee_due);
  // 金額以後端 fee_due 為準；notify 若帶 amount 僅記錄不一致
  if (body && typeof (body as { amount?: unknown }).amount === "number") {
    const notified = Number((body as { amount?: number }).amount);
    if (notified !== amountDue) {
      logAppError("payment.tappay_amount_mismatch", {
        orderNumber,
        feeDue: amountDue,
        notified,
      });
    }
  }

  await markPaymentPaidAndFulfill({
    paymentId: String(pay.id),
    transactionId: body.rec_trade_id || String(pay.transaction_id || `tappay_${pay.id}`),
    bankTransactionId: body.bank_transaction_id,
  });

  return { ok: true, matchId: String(pay.match_id) };
}
