import { getDb } from "./db";
import type { PrivateContacts } from "./types";
import { getMatchForUser, getPayments } from "./match";

export function getUnlockedCounterpartContacts(viewerId: string, matchId: string): PrivateContacts {
  const match = getMatchForUser(viewerId, matchId);
  if (!match) throw new Error("找不到媒合。");
  if (match.status !== "MATCHED" && match.status !== "COMPLETED") {
    throw new Error("媒合尚未成立，無法查看聯絡方式。");
  }
  const payments = getPayments(matchId);
  const settled = payments.every((p) => p.status === "PAID" || p.status === "NOT_REQUIRED");
  if (!settled) throw new Error("付款尚未完成。");

  const counterpartId =
    match.initiator_id === viewerId ? match.participant_id : match.initiator_id;

  const row = getDb()
    .prepare(
      `SELECT user_id, line_id, instagram_handle, threads_handle
       FROM user_private_contacts WHERE user_id = ?`,
    )
    .get(counterpartId) as
    | Omit<PrivateContacts, "phone_private">
    | undefined;
  if (!row) throw new Error("對方尚未設定聯絡方式。");
  return {
    user_id: row.user_id,
    line_id: row.line_id,
    instagram_handle: row.instagram_handle,
    threads_handle: row.threads_handle,
    phone_private: null,
  };
}
