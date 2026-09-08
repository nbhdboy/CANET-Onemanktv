import { getDb, nid, track } from "./db";
import { nowIso } from "./time";
import { isBlockedEither } from "./users";

export function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new Error("不能封鎖自己。");
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)`,
    )
    .run(blockerId, blockedId, nowIso());
}

export function unblockUser(blockerId: string, blockedId: string) {
  getDb()
    .prepare(`DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`)
    .run(blockerId, blockedId);
}

export function listMyBlocks(userId: string) {
  return getDb()
    .prepare(
      `SELECT b.blocked_id, b.created_at, p.nickname, p.avatar_url
       FROM blocks b JOIN profiles p ON p.id = b.blocked_id
       WHERE b.blocker_id = ?
       ORDER BY b.created_at DESC`,
    )
    .all(userId) as Array<{
    blocked_id: string;
    created_at: string;
    nickname: string;
    avatar_url: string | null;
  }>;
}

export function createReport(input: {
  reporterId: string;
  reportedUserId: string;
  requestId?: string;
  matchId?: string;
  reason: string;
  description: string;
}) {
  if (input.reporterId === input.reportedUserId) throw new Error("不能檢舉自己。");
  const id = nid();
  getDb()
    .prepare(
      `INSERT INTO reports (
        id, reporter_id, reported_user_id, request_id, match_id, reason, description, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
    )
    .run(
      id,
      input.reporterId,
      input.reportedUserId,
      input.requestId ?? null,
      input.matchId ?? null,
      input.reason,
      input.description.trim() || null,
      nowIso(),
    );
  track("user_reported", input.reporterId, { reportId: id, reason: input.reason });
  return id;
}

export { isBlockedEither };
