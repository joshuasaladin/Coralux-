/** Client-safe cleaning-schedule logic — no node-only imports here. */

export type CleaningWeek = {
  /** Sunday of this week, YYYY-MM-DD — the key everything else hangs off. */
  start: string;
  /** Saturday of this week, YYYY-MM-DD. */
  end: string;
  /** The 7 dates in this week, Sunday through Saturday. */
  days: string[];
  /** e.g. "Aug 23–29" or "Jul 28 – Aug 3" when a week spans two months. */
  label: string;
};

/**
 * The grid's hour rows. Edit this to change what hours the schedule covers —
 * everything else (the grid, the cell keys) follows from it.
 */
export const CLEANING_TIME_SLOTS: string[] = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function monthDay(iso: string): { month: string; day: number } {
  const d = new Date(`${iso}T00:00:00`);
  return { month: d.toLocaleDateString("en-US", { month: "short" }), day: d.getDate() };
}

/** Every Sunday-starting week that touches the given month, in order. */
export function weeksForMonth(year: number, month: number): CleaningWeek[] {
  const first = new Date(year, month - 1, 1);
  const lastIso = isoDate(new Date(year, month, 0));
  const firstSunday = addDays(isoDate(first), -first.getDay());

  const weeks: CleaningWeek[] = [];
  let start = firstSunday;
  while (start <= lastIso) {
    const end = addDays(start, 6);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const a = monthDay(start);
    const b = monthDay(end);
    const label = a.month === b.month ? `${a.month} ${a.day}–${b.day}` : `${a.month} ${a.day} – ${b.month} ${b.day}`;
    weeks.push({ start, end, days, label });
    start = addDays(start, 7);
  }
  return weeks;
}

export function shiftKey(weekStart: string, dayOfWeek: number, timeSlot: string): string {
  return `${weekStart}|${dayOfWeek}|${timeSlot}`;
}
