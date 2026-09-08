import { createUser, completeOnboarding } from "../src/lib/users";
import {
  createRequest,
  applyToRequest,
  acceptApplication,
  listFeed,
  getMatchForUser,
  getMyPayment,
  getVenues,
  listApplicants,
} from "../src/lib/match";

import { getUnlockedCounterpartContacts } from "../src/lib/contacts";
import { combineTaipeiDateTime } from "../src/lib/time";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const stamp = Date.now();
const a = createUser(`a${stamp}@test.local`, "password123");
const b = createUser(`b${stamp}@test.local`, "password123");

completeOnboarding({
  userId: a.id,
  nickname: "K歌小明",
  realName: "測試甲",
  birthYear: 1995,
  avatar: "mic-purple",
  lineId: "ming-line",
  instagram: "ming_ig",
  threads: "",
  terms: true,
});
completeOnboarding({
  userId: b.id,
  nickname: "K歌阿明",
  realName: "測試乙",
  birthYear: 1996,
  avatar: "notes-cyan",
  lineId: "",
  instagram: "ahming",
  threads: "ahming_th",
  terms: true,
});

const venue = getVenues("cashbox")[0];
const tomorrow = new Date(Date.now() + 26 * 3600_000);
const y = tomorrow.toISOString().slice(0, 10);
const requestId = createRequest({
  userId: a.id,
  venueId: venue.id,
  singAt: combineTaipeiDateTime(y, "20:00"),
  durationHours: 3,
  genres: ["華語", "KPOP"],
  preferences: ["no_smoke", "share_mic"],
  note: "今天突然超想唱周杰倫，有人嗎",
  estimatedTotal: 900,
});

const feed = listFeed({}, b.id);
assert(feed.some((r) => r.id === requestId), "request should appear in feed");
assert(!feed[0] || !("line_id" in (feed.find((r) => r.id === requestId)?.initiator as object)), "no private fields");

try {
  applyToRequest(a.id, requestId);
  throw new Error("self apply should fail");
} catch (e) {
  assert(e instanceof Error && e.message === "SELF", "self apply blocked");
}

applyToRequest(b.id, requestId);
try {
  applyToRequest(b.id, requestId);
  throw new Error("duplicate apply should fail");
} catch (e) {
  assert(e instanceof Error && e.message === "DUPLICATE", "duplicate blocked");
}

const apps = listApplicants(a.id, requestId);
assert(apps.length === 1, "one applicant");
const matchId = acceptApplication(a.id, apps[0].application.id);

const match = getMatchForUser(a.id, matchId);
assert(match?.status === "MATCHED", `free first match should confirm immediately, got ${match?.status}`);

const payA = getMyPayment(matchId, a.id);
const payB = getMyPayment(matchId, b.id);
assert(payA?.status === "NOT_REQUIRED", "A first match free");
assert(payB?.status === "NOT_REQUIRED", "B first match free");

const contacts = getUnlockedCounterpartContacts(a.id, matchId);
assert(contacts.instagram_handle === "ahming", "unlock IG");
assert(contacts.phone_private === null, "never leak phone");

let blocked = false;
try {
  getUnlockedCounterpartContacts("stranger", matchId);
} catch {
  blocked = true;
}
assert(blocked, "stranger cannot unlock");

console.log("MVP match flow OK", { requestId, matchId });
