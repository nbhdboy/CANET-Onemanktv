import { logApp, logAppError } from "@/lib/log";
import { withNotificationHref } from "@/lib/notification-links";
import { grantPointsFromPaidPayment } from "@/lib/supabase/credits";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function writeClient() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

/**
 * 雲端對齊本機 runMaintenance：
 * - 付款逾時 → EXPIRED_PAYMENT；已付轉點數；未付 FAILED；免費額度不扣
 * - 唱歌時間未過 → 歌局重回 OPEN；已過 → EXPIRED，並在通知說明
 * - 過期仍 OPEN 的歌局 → EXPIRED
 */
export async function runSupabaseMaintenance() {
  const client = writeClient();
  const now = new Date().toISOString();
  let expiredPayments = 0;
  let expiredRequests = 0;

  const { data: timedOut, error } = await client
    .from("matches")
    .select("id, request_id, initiator_id, participant_id, payment_deadline")
    .eq("status", "PENDING_PAYMENT")
    .not("payment_deadline", "is", null)
    .lte("payment_deadline", now);
  if (error) {
    logAppError("maintenance.list_timeout_failed", { message: error.message });
    throw new Error(error.message);
  }

  for (const match of timedOut || []) {
    try {
      const { data: req } = await client
        .from("sing_requests")
        .select("id, sing_at, status")
        .eq("id", match.request_id)
        .maybeSingle();

      const singAt = req?.sing_at ? new Date(String(req.sing_at)).getTime() : 0;
      const canReopen = Boolean(req && req.status === "MATCH_PENDING" && singAt > Date.now());

      await client
        .from("matches")
        .update({ status: "EXPIRED_PAYMENT" })
        .eq("id", match.id)
        .eq("status", "PENDING_PAYMENT");

      if (canReopen) {
        await client
          .from("sing_requests")
          .update({ status: "OPEN", updated_at: now })
          .eq("id", match.request_id)
          .eq("status", "MATCH_PENDING");
      } else if (req?.status === "MATCH_PENDING") {
        await client
          .from("sing_requests")
          .update({ status: "EXPIRED", updated_at: now })
          .eq("id", match.request_id)
          .eq("status", "MATCH_PENDING");
      }

      await client
        .from("match_applications")
        .update({ status: "EXPIRED_PAYMENT", updated_at: now })
        .eq("request_id", match.request_id)
        .eq("applicant_id", match.participant_id)
        .eq("status", "ACCEPTED");

      const { data: payments } = await client
        .from("payments")
        .select("id, user_id, status, fee_due, credited_at")
        .eq("match_id", match.id);

      for (const pay of payments || []) {
        if (pay.status === "PENDING") {
          await client.from("payments").update({ status: "FAILED" }).eq("id", pay.id);
        }
        if (pay.status === "PAID" && !pay.credited_at && Number(pay.fee_due) > 0) {
          await grantPointsFromPaidPayment({
            userId: String(pay.user_id),
            paymentId: String(pay.id),
            matchId: String(match.id),
            amount: Number(pay.fee_due),
          });
        }
      }

      const timeoutMessage = canReopen
        ? "這次媒合付款時間已結束，歌局已重新開放在找歌友。"
        : "這次媒合付款時間已結束，且唱歌時間已過，這場不會再出現在找歌友。";

      for (const uid of [match.initiator_id, match.participant_id]) {
        await client.from("notifications").insert({
          user_id: uid,
          type: "payment_timeout",
          payload: withNotificationHref("payment_timeout", {
            matchId: match.id,
            requestId: match.request_id,
            reopened: canReopen,
            message: timeoutMessage,
          }),
          is_read: false,
        });
      }

      expiredPayments += 1;
    } catch (e) {
      logAppError("maintenance.expire_one_failed", {
        matchId: match.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const { data: staleOpen, error: staleError } = await client
    .from("sing_requests")
    .select("id")
    .eq("status", "OPEN")
    .lte("sing_at", now);
  if (staleError) {
    logAppError("maintenance.list_stale_failed", { message: staleError.message });
  } else {
    for (const row of staleOpen || []) {
      const { error: upd } = await client
        .from("sing_requests")
        .update({ status: "EXPIRED", updated_at: now })
        .eq("id", row.id)
        .eq("status", "OPEN");
      if (!upd) expiredRequests += 1;
    }
  }

  logApp("maintenance.supabase_ok", { expiredPayments, expiredRequests });
  return { expiredPayments, expiredRequests };
}
