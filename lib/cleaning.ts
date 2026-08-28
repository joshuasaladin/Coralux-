import { all, id as newId, now, one, run } from "./db";

export type CleaningShift = Record<string, any>;

// Re-exported so server-side pages can import everything from one place;
// components that need these client-side must import lib/cleaning-shared
// directly, since this module pulls in the (node-only) database layer.
export {
  CLEANING_TIME_SLOTS,
  shiftKey,
  weeksForMonth,
  type CleaningWeek,
} from "./cleaning-shared";

export function listShiftsForWeeks(weekStarts: string[]): CleaningShift[] {
  if (weekStarts.length === 0) return [];
  const placeholders = weekStarts.map(() => "?").join(", ");
  return all<CleaningShift>(
    `SELECT * FROM cleaning_shifts WHERE week_start IN (${placeholders})`,
    weekStarts,
  );
}

export function upsertShift(
  weekStart: string,
  dayOfWeek: number,
  timeSlot: string,
  listing: string,
  notes: string,
): void {
  const trimmedListing = listing.trim();
  const trimmedNotes = notes.trim();

  if (!trimmedListing && !trimmedNotes) {
    clearShift(weekStart, dayOfWeek, timeSlot);
    return;
  }

  const existing = one<{ id: string }>(
    `SELECT id FROM cleaning_shifts WHERE week_start = ? AND day_of_week = ? AND time_slot = ?`,
    [weekStart, dayOfWeek, timeSlot],
  );

  if (existing) {
    run(`UPDATE cleaning_shifts SET listing = ?, notes = ?, updated_at = ? WHERE id = ?`, [
      trimmedListing || null,
      trimmedNotes || null,
      now(),
      existing.id,
    ]);
  } else {
    run(
      `INSERT INTO cleaning_shifts (id, week_start, day_of_week, time_slot, listing, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), weekStart, dayOfWeek, timeSlot, trimmedListing || null, trimmedNotes || null, now(), now()],
    );
  }
}

export function clearShift(weekStart: string, dayOfWeek: number, timeSlot: string): void {
  run(`DELETE FROM cleaning_shifts WHERE week_start = ? AND day_of_week = ? AND time_slot = ?`, [
    weekStart,
    dayOfWeek,
    timeSlot,
  ]);
}
