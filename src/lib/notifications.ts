import { getDb } from "./db";
import type { NotificationRecord } from "./types";
import { useSupabaseApp } from "./runtime";

export function listNotifications(userId: string) {
  if (useSupabaseApp()) return [];
  return getDb()
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 80`)
    .all(userId) as NotificationRecord[];
}

export function unreadCount(userId: string) {
  if (useSupabaseApp()) return 0;
  return (
    getDb()
      .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`)
      .get(userId) as { c: number }
  ).c;
}

export function markAllRead(userId: string) {
  getDb()
    .prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`)
    .run(userId);
}

export function markRead(userId: string, id: string) {
  getDb()
    .prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?`)
    .run(userId, id);
}
