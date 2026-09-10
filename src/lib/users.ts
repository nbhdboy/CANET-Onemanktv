import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb, nid, track } from "./db";
import { ageFromBirthYear, nowIso } from "./time";
import { hasContact } from "./format";
import type { PrivateContacts, Profile, UserStatus } from "./types";
import { useSupabaseApp } from "./runtime";

export function getProfile(id: string): Profile | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM profiles WHERE id = ?`)
    .get(id) as Profile | undefined;
  if (!row) return undefined;
  return { ...row, points: Number((row as Profile).points ?? 0) };
}

export function getUserByEmail(email: string) {
  return getDb()
    .prepare(`SELECT id, email, password_hash FROM users WHERE email = ?`)
    .get(email.toLowerCase().trim()) as
    | { id: string; email: string; password_hash: string }
    | undefined;
}

export function createUser(email: string, password: string, adminEmail?: string) {
  return insertLocalAccount(nid(), email, bcrypt.hashSync(password, 10), adminEmail);
}

export function ensureOAuthUser(id: string, email: string) {
  const db = getDb();
  const byId = db
    .prepare(`SELECT id, email FROM users WHERE id = ?`)
    .get(id) as { id: string; email: string } | undefined;
  if (byId) return byId;

  const byEmail = getUserByEmail(email);
  if (byEmail) return { id: byEmail.id, email: byEmail.email };

  return insertLocalAccount(id, email, bcrypt.hashSync(randomBytes(32).toString("hex"), 10));
}

function insertLocalAccount(id: string, email: string, passwordHash: string, adminEmail?: string) {
  const db = getDb();
  const now = nowIso();
  const normalized = email.toLowerCase().trim();
  const isAdmin =
    normalized === (adminEmail || process.env.ADMIN_EMAIL || "").toLowerCase() ? 1 : 0;
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    ).run(id, normalized, passwordHash, now);
    db.prepare(
      `INSERT INTO profiles (
        id, nickname, avatar_url, real_name_private, birth_year_private,
        age_verified, account_verified, terms_agreed, profile_completed,
        successful_match_count, free_match_used, rating_avg, rating_count,
        status, is_admin, created_at, updated_at
      ) VALUES (?, NULL, 'age20-f', NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 'ACTIVE', ?, ?, ?)`,
    ).run(id, isAdmin, now, now);
    db.prepare(
      `INSERT INTO user_private_contacts (
        user_id, line_id, instagram_handle, threads_handle, phone_private, created_at, updated_at
      ) VALUES (?, NULL, NULL, NULL, NULL, ?, ?)`,
    ).run(id, now, now);
  });
  tx();
  track("signup_completed", id);
  return { id, email: normalized };
}

export function verifyPassword(hash: string, password: string) {
  return bcrypt.compareSync(password, hash);
}

export function getOwnContacts(userId: string): PrivateContacts | undefined {
  return getDb()
    .prepare(`SELECT * FROM user_private_contacts WHERE user_id = ?`)
    .get(userId) as PrivateContacts | undefined;
}

export function saveOwnContacts(
  userId: string,
  data: Partial<Omit<PrivateContacts, "user_id">>,
) {
  const now = nowIso();
  getDb()
    .prepare(
      `UPDATE user_private_contacts
       SET line_id = ?,
           instagram_handle = ?,
           threads_handle = ?,
           phone_private = COALESCE(?, phone_private),
           updated_at = ?
       WHERE user_id = ?`,
    )
    .run(
      data.line_id ?? null,
      data.instagram_handle ?? null,
      data.threads_handle ?? null,
      data.phone_private ?? null,
      now,
      userId,
    );
}

export function updateProfileFields(
  userId: string,
  fields: Partial<Profile>,
) {
  const allowed = [
    "nickname",
    "avatar_url",
    "real_name_private",
    "birth_year_private",
    "age_verified",
    "account_verified",
    "terms_agreed",
    "profile_completed",
    "status",
  ] as const;
  const sets: string[] = ["updated_at = ?"];
  const values: unknown[] = [nowIso()];
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  values.push(userId);
  getDb()
    .prepare(`UPDATE profiles SET ${sets.join(", ")} WHERE id = ?`)
    .run(...values);
}

export function completeOnboarding(input: {
  userId: string;
  nickname: string;
  realName: string;
  birthYear: number;
  avatar: string;
  lineId: string;
  instagram: string;
  threads: string;
  terms: boolean;
}) {
  if (!input.terms) throw new Error("TERMS");
  if (ageFromBirthYear(input.birthYear) < 18) throw new Error("AGE");
  if (!hasContact({
    line_id: input.lineId,
    instagram_handle: input.instagram,
    threads_handle: input.threads,
  })) {
    throw new Error("CONTACT");
  }
  const now = nowIso();
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE profiles SET
        nickname = ?, real_name_private = ?, birth_year_private = ?,
        avatar_url = ?, age_verified = 1, terms_agreed = 1,
        profile_completed = 1, updated_at = ?
       WHERE id = ?`,
    ).run(
      input.nickname.trim(),
      input.realName.trim(),
      input.birthYear,
      input.avatar,
      now,
      input.userId,
    );
    db.prepare(
      `UPDATE user_private_contacts SET
        line_id = ?, instagram_handle = ?, threads_handle = ?,
        phone_private = NULL, updated_at = ?
       WHERE user_id = ?`,
    ).run(
      input.lineId.trim() || null,
      input.instagram.trim() || null,
      input.threads.trim() || null,
      now,
      input.userId,
    );
  });
  tx();
  track("profile_completed", input.userId);
}

export function assertActive(profile: Profile) {
  if (profile.status === "BANNED") throw new Error("BANNED");
  if (profile.status === "SUSPENDED") throw new Error("SUSPENDED");
}

export function assertCanCreateOrApply(userId: string) {
  const profile = getProfile(userId);
  if (!profile) throw new Error("UNAUTHORIZED");
  assertActive(profile);
  if (!profile.age_verified) throw new Error("AGE");
  if (!profile.terms_agreed || !profile.profile_completed) throw new Error("PROFILE");
  const contacts = getOwnContacts(userId);
  if (!contacts || !hasContact(contacts)) throw new Error("CONTACT");
  return { profile, contacts };
}

export function isBlockedEither(a: string, b: string) {
  if (useSupabaseApp()) return false;
  const row = getDb()
    .prepare(
      `SELECT 1 FROM blocks
       WHERE (blocker_id = ? AND blocked_id = ?)
          OR (blocker_id = ? AND blocked_id = ?)`,
    )
    .get(a, b, b, a);
  return Boolean(row);
}

export function setUserStatus(userId: string, status: UserStatus) {
  getDb()
    .prepare(`UPDATE profiles SET status = ?, updated_at = ? WHERE id = ?`)
    .run(status, nowIso(), userId);
}
