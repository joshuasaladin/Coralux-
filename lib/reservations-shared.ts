/** Client-safe helpers for the reservations calendar — no database imports. */

/**
 * Twelve colours handed out to listings in the order they first appear.
 * Chosen to stay apart from each other and to sit quietly against the
 * app's paper background rather than shouting over it.
 */
export const LISTING_COLOURS = [
  { bg: "#dbeafe", fg: "#1e40af", dot: "#3b82f6" }, // blue
  { bg: "#dcfce7", fg: "#166534", dot: "#22c55e" }, // green
  { bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" }, // amber
  { bg: "#fce7f3", fg: "#9d174d", dot: "#ec4899" }, // pink
  { bg: "#e0e7ff", fg: "#3730a3", dot: "#6366f1" }, // indigo
  { bg: "#ccfbf1", fg: "#115e59", dot: "#14b8a6" }, // teal
  { bg: "#ffedd5", fg: "#9a3412", dot: "#f97316" }, // orange
  { bg: "#f3e8ff", fg: "#6b21a8", dot: "#a855f7" }, // purple
  { bg: "#ecfccb", fg: "#3f6212", dot: "#84cc16" }, // lime
  { bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" }, // red
  { bg: "#cffafe", fg: "#155e75", dot: "#06b6d4" }, // cyan
  { bg: "#e2e8f0", fg: "#334155", dot: "#64748b" }, // slate
] as const;

export function listingColour(index: number) {
  return LISTING_COLOURS[((index % LISTING_COLOURS.length) + LISTING_COLOURS.length) % LISTING_COLOURS.length]!;
}

/**
 * Whether a booking is off: cancelled, declined, expired, or "removed" —
 * the sync's own word for a booking Guesty has stopped listing. Anything
 * this says yes to is left off the calendar and out of the lists.
 */
export function isCancelled(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s.includes("cancel") || s === "declined" || s === "expired" || s === "removed";
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** Sunday-anchored week containing the given day. */
export function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return addDays(iso, -d.getDay());
}

/** The grid a month view draws: whole weeks covering the month. */
export function monthGrid(year: number, month: number): string[] {
  const first = isoDate(new Date(year, month, 1));
  const last = isoDate(new Date(year, month + 1, 0));
  const days: string[] = [];
  let cursor = weekStart(first);
  const end = addDays(weekStart(last), 6);
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function prettyDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function channelLabel(channel: string | null | undefined): string {
  if (!channel) return "Direct";
  const map: Record<string, string> = {
    airbnb: "Airbnb",
    airbnb2: "Airbnb",
    bookingCom: "Booking.com",
    bookingcom: "Booking.com",
    vrbo: "Vrbo",
    homeaway: "Vrbo",
    manual: "Direct",
    direct: "Direct",
  };
  return map[channel] ?? channel.replace(/([a-z])([A-Z])/g, "$1 $2");
}
