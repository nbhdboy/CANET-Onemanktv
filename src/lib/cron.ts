import { getDb } from "./db";
import { nowIso } from "./time";

export function expirePaymentsHandler() {
  const now = nowIso();
  const db = getDb();
  const n = db
    .prepare(
      `SELECT COUNT(*) AS c FROM matches
       WHERE status = 'PENDING_PAYMENT' AND payment_deadline IS NOT NULL AND payment_deadline <= ?`,
    )
    .get(now) as { c: number };
  return n.c;
}
