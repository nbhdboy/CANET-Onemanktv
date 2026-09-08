import { TIMEZONE } from "./constants";

export function nowUtc(): Date {
  return new Date();
}

export function parseUtc(iso: string): Date {
  if (iso.includes("T")) return new Date(iso);
  return new Date(iso.replace(" ", "T") + "Z");
}

export function toSqliteUtc(input: Date | string): string {
  const d = typeof input === "string" ? parseUtc(input) : input;
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

export function nowIso(): string {
  return toSqliteUtc(nowUtc());
}

export function addMinutes(iso: string, minutes: number): string {
  return toSqliteUtc(new Date(parseUtc(iso).getTime() + minutes * 60_000));
}

export function addHours(iso: string, hours: number): string {
  return toSqliteUtc(new Date(parseUtc(iso).getTime() + hours * 3_600_000));
}

export function taipeiParts(date: Date | string) {
  const d = typeof date === "string" ? parseUtc(date) : date;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    weekday: parts.weekday,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function todayKey(): string {
  return taipeiParts(nowUtc()).dateKey;
}

export function tomorrowKey(): string {
  const t = new Date(nowUtc().getTime() + 24 * 3_600_000);
  return taipeiParts(t).dateKey;
}

export function combineTaipeiDateTime(date: string, time: string): string {
  const isoGuess = `${date}T${time}:00+08:00`;
  return toSqliteUtc(new Date(isoGuess));
}

export function formatDateTime(iso: string): string {
  const p = taipeiParts(iso);
  const weekdayMap: Record<string, string> = {
    Mon: "週一",
    Tue: "週二",
    Wed: "週三",
    Thu: "週四",
    Fri: "週五",
    Sat: "週六",
    Sun: "週日",
  };
  const today = todayKey();
  const tom = tomorrowKey();
  const dayLabel =
    p.dateKey === today
      ? "今天"
      : p.dateKey === tom
        ? "明天"
        : `${Number(p.month)}/${Number(p.day)} ${weekdayMap[p.weekday] ?? ""}`;
  return `${dayLabel} ${p.hour}:${p.minute}`;
}

export function formatClock(iso: string): string {
  const p = taipeiParts(iso);
  return `${p.hour}:${p.minute}`;
}

export function relativeFromNow(iso: string): string {
  const diff = parseUtc(iso).getTime() - nowUtc().getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return diff >= 0 ? "即將開始" : "剛剛";
  if (mins < 60) return diff >= 0 ? `${mins} 分鐘後` : `${mins} 分鐘前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return diff >= 0 ? `${hours} 小時後` : `${hours} 小時前`;
  const days = Math.round(hours / 24);
  return diff >= 0 ? `${days} 天後` : `${days} 天前`;
}

export function countdownLabel(deadlineIso: string): string {
  const remain = parseUtc(deadlineIso).getTime() - nowUtc().getTime();
  if (remain <= 0) return "00:00";
  const mins = Math.floor(remain / 60_000);
  const secs = Math.floor((remain % 60_000) / 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function hoursUntil(iso: string): number {
  return (parseUtc(iso).getTime() - nowUtc().getTime()) / 3_600_000;
}

export function isPast(iso: string): boolean {
  return parseUtc(iso).getTime() <= nowUtc().getTime();
}

export function accountAgeLabel(createdAt: string): string {
  const days = Math.max(
    1,
    Math.round((nowUtc().getTime() - parseUtc(createdAt).getTime()) / 86_400_000),
  );
  if (days < 30) return `加入 ${days} 天`;
  const months = Math.round(days / 30);
  if (months < 12) return `加入 ${months} 個月`;
  return `加入 ${Math.round(months / 12)} 年`;
}

export function ageFromBirthYear(year: number): number {
  return taipeiParts(nowUtc()).year
    ? Number(taipeiParts(nowUtc()).year) - year
    : new Date().getFullYear() - year;
}
