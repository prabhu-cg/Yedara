import type { RecentItem } from "@/lib/recent";

export type RecentGroup = { key: string; label: string; items: RecentItem[] };

const DAY_MS = 86_400_000;

/** Calendar-day number in a time zone, so "today" and "yesterday" follow the reader's clock. */
function dayNumber(iso: string | number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day")) / DAY_MS;
}

function monthLabel(iso: string, timeZone: string, includeYear: boolean) {
  return new Intl.DateTimeFormat("en", { timeZone, month: "long", ...(includeYear ? { year: "numeric" } : {}) }).format(new Date(iso));
}

/**
 * Buckets items (newest first) the way a file manager does: Today, Yesterday, the rest of the
 * past week, the past month, then by month. Order within and across groups is preserved.
 */
export function groupRecent(items: RecentItem[], now: number | string, timeZone: string): RecentGroup[] {
  const today = dayNumber(now, timeZone);
  const thisYear = new Date(now).getUTCFullYear();
  const groups: RecentGroup[] = [];

  for (const item of items) {
    const age = today - dayNumber(item.updatedAt, timeZone);
    let key: string;
    let label: string;
    if (age <= 0) [key, label] = ["today", "Today"];
    else if (age === 1) [key, label] = ["yesterday", "Yesterday"];
    else if (age <= 7) [key, label] = ["week", "Previous 7 days"];
    else if (age <= 30) [key, label] = ["month", "Previous 30 days"];
    else {
      const sameYear = new Date(item.updatedAt).getUTCFullYear() === thisYear;
      label = monthLabel(item.updatedAt, timeZone, !sameYear);
      key = `m-${label}`;
    }
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label, items: [item] });
  }
  return groups;
}
