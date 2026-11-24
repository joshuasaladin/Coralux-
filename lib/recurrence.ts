/**
 * How far apart repeating tasks fall, and when the next one is due.
 *
 * Pure date arithmetic — no database, no imports — so it can be checked on
 * its own and used on either side of the app.
 */

/** Each "Repeats" choice on a task, as days or calendar months. */
export const INTERVALS: Record<string, { days?: number; months?: number }> = {
  daily: { days: 1 },
  weekly: { days: 7 },
  monthly: { months: 1 },
  quarterly: { months: 3 },
  semiannual: { months: 6 },
  yearly: { months: 12 },
};

export function repeats(recurrence: string | null | undefined): boolean {
  return Boolean(recurrence && INTERVALS[recurrence]);
}

/** YYYY-MM-DD plus whole days or calendar months, clamping 31 Aug + 6 months to 28 Feb. */
export function addInterval(day: string, step: { days?: number; months?: number }): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  if (step.days) {
    const at = new Date(Date.UTC(y, m - 1, d + step.days));
    return at.toISOString().slice(0, 10);
  }
  const months = step.months ?? 0;
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return first.toISOString().slice(0, 10);
}

/**
 * When the next one is due, once this one is done.
 *
 * Done on time or early, the schedule holds: AC maintenance due 10 January
 * comes round again on 10 July, even if it was done on the 5th. Done late, it
 * counts from the day it was actually done — maintenance finally carried out
 * on 1 February is not due again four months later. With no due date at all,
 * it counts from today.
 */
export function nextDueDate(
  recurrence: string,
  dueDate: string | null | undefined,
  today: string,
): string | null {
  const step = INTERVALS[recurrence];
  if (!step) return null;
  const base = dueDate && dueDate >= today ? dueDate : today;
  return addInterval(base, step);
}
