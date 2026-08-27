/**
 * Every time input in the app is a 15-minute dropdown rather than free text,
 * so times are always stored in the same "HH:MM" shape and nobody can type
 * "9ish" into a field the calendar later has to sort by.
 */
export const TIME_STEP_MINUTES = 15;

export type TimeOption = { value: string; label: string };

function label(hour: number, minute: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}  ·  ${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export const TIME_OPTIONS: TimeOption[] = Array.from(
  { length: (24 * 60) / TIME_STEP_MINUTES },
  (_, i) => {
    const minutes = i * TIME_STEP_MINUTES;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return {
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      label: label(hour, minute),
    };
  },
);

/** Normalise anything already stored (e.g. "9:5") onto the dropdown's grid. */
export function normaliseTime(value: unknown): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Math.min(23, Number(match[1]));
  const rounded = Math.round(Number(match[2]) / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  const minute = rounded >= 60 ? 45 : rounded;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "14:30" -> "2:30 pm" for display. */
export function formatTime(value: unknown): string {
  const normalised = normaliseTime(value);
  if (!normalised) return "—";
  const [h, m] = normalised.split(":").map(Number);
  const suffix = h! < 12 ? "am" : "pm";
  const h12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
