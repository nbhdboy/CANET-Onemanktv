import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { DEFAULT_CONFIG } from "./constants";
import { SEED_VENUES, VENUE_SEED_VERSION, seedVenueId } from "./ktv-venues";
import { nowIso } from "./time";
import { useSupabaseApp } from "./runtime";

const globalForDb = globalThis as unknown as { kplus1Db?: Database.Database };

function dbPath() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "kplus1.db");
}

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  real_name_private TEXT,
  birth_year_private INTEGER,
  age_verified INTEGER NOT NULL DEFAULT 0,
  account_verified INTEGER NOT NULL DEFAULT 0,
  terms_agreed INTEGER NOT NULL DEFAULT 0,
  profile_completed INTEGER NOT NULL DEFAULT 0,
  successful_match_count INTEGER NOT NULL DEFAULT 0,
  free_match_used INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  rating_avg REAL,
  rating_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_private_contacts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  line_id TEXT,
  instagram_handle TEXT,
  threads_handle TEXT,
  phone_private TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_codes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ktv_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  booking_url TEXT NOT NULL,
  logo_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ktv_venues (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES ktv_brands(id),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sing_requests (
  id TEXT PRIMARY KEY,
  initiator_id TEXT NOT NULL REFERENCES users(id),
  venue_id TEXT NOT NULL REFERENCES ktv_venues(id),
  sing_at TEXT NOT NULL,
  duration_hours INTEGER NOT NULL,
  music_genres TEXT NOT NULL,
  preferences TEXT NOT NULL,
  note TEXT,
  estimated_total_cost_2p INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status IN ('DRAFT','OPEN','MATCH_PENDING','MATCHED','CANCELLED','EXPIRED','COMPLETED'))
);

CREATE TABLE IF NOT EXISTS match_applications (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sing_requests(id),
  applicant_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (request_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sing_requests(id),
  initiator_id TEXT NOT NULL REFERENCES users(id),
  participant_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  payment_deadline TEXT,
  booking_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_live_match
  ON matches(request_id)
  WHERE status IN ('MATCHED', 'COMPLETED', 'PENDING_PAYMENT');

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  fee_due INTEGER NOT NULL,
  payment_required INTEGER NOT NULL,
  provider TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  credit_applied INTEGER NOT NULL DEFAULT 0,
  credited_at TEXT
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  message TEXT,
  source_match_id TEXT REFERENCES matches(id),
  source_payment_id TEXT REFERENCES payments(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewee_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  tags TEXT NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (match_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id),
  blocked_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reported_user_id TEXT NOT NULL REFERENCES users(id),
  request_id TEXT,
  match_id TEXT,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  admin_note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cancellations (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  match_id TEXT,
  user_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_feed
  ON sing_requests(status, sing_at, created_at);
CREATE INDEX IF NOT EXISTS idx_apps_request
  ON match_applications(request_id, status);
CREATE INDEX IF NOT EXISTS idx_notifs_user
  ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_match
  ON payments(match_id, user_id);

CREATE TRIGGER IF NOT EXISTS prevent_self_apply
BEFORE INSERT ON match_applications
BEGIN
  SELECT RAISE(ABORT, 'cannot apply to own request')
  WHERE NEW.applicant_id = (
    SELECT initiator_id FROM sing_requests WHERE id = NEW.request_id
  );
END;
`;

const SEED_BRANDS = [
  {
    id: "cashbox",
    name: "錢櫃",
    booking_url: "https://www.cashboxparty.com/",
    logo_url: "🎤",
  },
  {
    id: "holiday",
    name: "好樂迪",
    booking_url: "https://www.holiday.com.tw/",
    logo_url: "🎵",
  },
  {
    id: "star",
    name: "星聚點",
    booking_url: "https://www.star-ktv.com/",
    logo_url: "⭐",
  },
];

function seedVenues(db: Database.Database) {
  const now = nowIso();
  const version = db
    .prepare(`SELECT value FROM platform_config WHERE key = 'venue_seed_version'`)
    .get() as { value: string } | undefined;
  if (version?.value === VENUE_SEED_VERSION) return;

  const upsertVenue = db.prepare(
    `INSERT INTO ktv_venues (id, brand_id, name, city, district, address, enabled, created_at)
     VALUES (@id, @brand_id, @name, @city, @district, @address, 1, @created_at)
     ON CONFLICT(id) DO UPDATE SET
       brand_id = excluded.brand_id,
       name = excluded.name,
       city = excluded.city,
       district = excluded.district,
       address = excluded.address,
       enabled = 1`,
  );
  const officialIds = new Set<string>();
  for (const v of SEED_VENUES) {
    const id = seedVenueId(v);
    officialIds.add(id);
    upsertVenue.run({ id, ...v, created_at: now });
  }
  const existing = db.prepare(`SELECT id FROM ktv_venues`).all() as Array<{ id: string }>;
  const disable = db.prepare(`UPDATE ktv_venues SET enabled = 0 WHERE id = ?`);
  for (const row of existing) {
    if (!officialIds.has(row.id)) disable.run(row.id);
  }
  db.prepare(
    `INSERT INTO platform_config (key, value, updated_at) VALUES ('venue_seed_version', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(VENUE_SEED_VERSION, now);
}

function seed(db: Database.Database) {
  const now = nowIso();
  const insertBrand = db.prepare(
    `INSERT OR IGNORE INTO ktv_brands (id, name, booking_url, logo_url, enabled)
     VALUES (@id, @name, @booking_url, @logo_url, 1)`,
  );
  const insertConfig = db.prepare(
    `INSERT OR IGNORE INTO platform_config (key, value, updated_at) VALUES (?, ?, ?)`,
  );

  for (const b of SEED_BRANDS) insertBrand.run(b);
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    insertConfig.run(key, value, now);
  }
  seedVenues(db);
}

function ensureSchemaPatches(db: Database.Database) {
  const cols = (table: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);
  const profileCols = cols("profiles");
  if (!profileCols.includes("points")) {
    db.exec(`ALTER TABLE profiles ADD COLUMN points INTEGER NOT NULL DEFAULT 0`);
  }
  const payCols = cols("payments");
  if (!payCols.includes("credit_applied")) {
    db.exec(`ALTER TABLE payments ADD COLUMN credit_applied INTEGER NOT NULL DEFAULT 0`);
  }
  const payCols2 = cols("payments");
  if (!payCols2.includes("credited_at")) {
    db.exec(`ALTER TABLE payments ADD COLUMN credited_at TEXT`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      message TEXT,
      source_match_id TEXT REFERENCES matches(id),
      source_payment_id TEXT REFERENCES payments(id),
      created_at TEXT NOT NULL
    )
  `);
  db.prepare(
    `UPDATE platform_config SET value = ?, updated_at = ? WHERE key = 'payment_timeout_minutes'`,
  ).run(DEFAULT_CONFIG.payment_timeout_minutes, nowIso());
}

export function getDb(): Database.Database {
  if (globalForDb.kplus1Db) {
    seedVenues(globalForDb.kplus1Db);
    ensureSchemaPatches(globalForDb.kplus1Db);
    return globalForDb.kplus1Db;
  }
  const db = new Database(dbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seed(db);
  ensureSchemaPatches(db);
  globalForDb.kplus1Db = db;
  return db;
}

export function nid(): string {
  return nanoid(16);
}

export function getConfig(key: string): string {
  const row = getDb()
    .prepare(`SELECT value FROM platform_config WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG] ?? "";
}

export function setConfig(key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO platform_config (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, nowIso());
}

export function getAllConfig(): Record<string, string> {
  const rows = getDb()
    .prepare(`SELECT key, value FROM platform_config`)
    .all() as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function track(
  name: string,
  userId?: string | null,
  payload?: Record<string, unknown>,
) {
  if (useSupabaseApp()) return;
  getDb()
    .prepare(
      `INSERT INTO analytics_events (id, user_id, name, payload, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(nid(), userId ?? null, name, payload ? JSON.stringify(payload) : null, nowIso());
}

export function notify(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, type, payload, is_read, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    )
    .run(nid(), userId, type, JSON.stringify(payload), nowIso());
}
