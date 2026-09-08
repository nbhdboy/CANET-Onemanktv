import { createUser, completeOnboarding, getUserByEmail } from "./users";
import { getDb, nid } from "./db";
import { combineTaipeiDateTime, nowIso, taipeiParts, nowUtc } from "./time";

export function ensureDemoAgeFeed() {
  const venues = getDb()
    .prepare(`SELECT id, brand_id FROM ktv_venues WHERE enabled = 1`)
    .all() as Array<{ id: string; brand_id: string }>;
  if (!venues.length) return;

  const pick = (brandId: string) =>
    venues.find((v) => v.brand_id === brandId && v.id.includes("台北市")) ??
    venues.find((v) => v.brand_id === brandId);
  const cashbox = pick("cashbox") ?? venues[0];
  const holiday = pick("holiday") ?? venues[1] ?? venues[0];
  const star = pick("star") ?? venues[2] ?? venues[0];
  const year = Number(taipeiParts(nowUtc()).year);

  const people = [
    {
      email: "demo20@kplus1.local",
      birthYear: year - 20,
      nickname: "K歌小杰",
      avatar: "fire-coral",
      lineId: "xiao-jie",
      venueId: cashbox.id,
      genres: ["華語", "KPOP"],
      note: "突然超想唱周杰倫，有同齡的人嗎",
      hours: 20,
    },
    {
      email: "demo30@kplus1.local",
      birthYear: year - 30,
      nickname: "K歌阿杰",
      avatar: "spark-blue",
      lineId: "ah-jay",
      venueId: holiday.id,
      genres: ["華語", "英文"],
      note: "下班後想唱兩首老歌，找 30 左右的 +1",
      hours: 21,
    },
    {
      email: "demo40@kplus1.local",
      birthYear: year - 40,
      nickname: "K歌阿慧",
      avatar: "notes-cyan",
      lineId: "hui-40",
      venueId: star.id,
      genres: ["台語", "經典老歌"],
      note: "想唱蔡琴和江蕙，找同輩一起分攤",
      hours: 19,
    },
    {
      email: "demo50@kplus1.local",
      birthYear: year - 50,
      nickname: "K歌阿蘭",
      avatar: "disco-pink",
      lineId: "lan-50",
      venueId: cashbox.id,
      genres: ["經典老歌", "華語"],
      note: "今晚想唱鄧麗君，找 50 左右的歌友",
      hours: 18,
    },
  ];

  const insert = getDb().prepare(
    `INSERT INTO sing_requests (
      id, initiator_id, venue_id, sing_at, duration_hours, music_genres,
      preferences, note, estimated_total_cost_2p, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`,
  );
  const hasOpen = getDb().prepare(
    `SELECT 1 AS ok FROM sing_requests WHERE initiator_id = ? AND status = 'OPEN' LIMIT 1`,
  );

  for (const [i, p] of people.entries()) {
    let user: { id: string; email: string } | undefined = getUserByEmail(p.email);
    if (!user) {
      user = createUser(p.email, "kplus1demo!");
      completeOnboarding({
        userId: user.id,
        nickname: p.nickname,
        realName: `示範${i + 1}`,
        birthYear: p.birthYear,
        avatar: p.avatar,
        lineId: p.lineId,
        instagram: "",
        threads: "",
        terms: true,
      });
    }
    if (!user) continue;
    getDb()
      .prepare(`UPDATE profiles SET birth_year_private = ? WHERE id = ?`)
      .run(p.birthYear, user.id);
    if (hasOpen.get(user.id)) continue;

    const day = new Date(nowUtc().getTime() + (i + 1) * 24 * 3_600_000);
    const y = taipeiParts(day).dateKey;
    const time = `${String(p.hours).padStart(2, "0")}:00`;
    const now = nowIso();
    insert.run(
      nid(),
      user.id,
      p.venueId,
      combineTaipeiDateTime(y, time),
      3,
      JSON.stringify(p.genres),
      JSON.stringify(["share_mic", "casual"]),
      p.note,
      900,
      now,
      now,
    );
  }
}
