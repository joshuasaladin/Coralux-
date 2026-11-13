/**
 * What time it is where the properties are.
 *
 * The server on Render runs on UTC, four hours ahead of Aruba, so anything
 * that asked the server for "today" got tomorrow every evening from 8 PM:
 * the calendar highlighted the wrong day, a guest checking in tomorrow
 * showed as already in, and the cleaning schedule's green day jumped ahead.
 * Every "today" and "now" in the app comes from here instead.
 *
 * Client-safe: no database, no Node APIs.
 */
export const TIME_ZONE = "America/Aruba";

/** Standard times, as the houses run them. */
export const CHECK_IN_TIME = { hour: 16, minute: 0 }; // 4 PM
export const CHECK_OUT_TIME = { hour: 11, minute: 0 }; // 11 AM

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The local calendar day (YYYY-MM-DD) and minutes past local midnight. */
export function localNow(at: Date = new Date()): { day: string; minutes: number } {
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.formatToParts(at).find((p) => p.type === type)?.value ?? "00";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Today's date in Aruba, YYYY-MM-DD. */
export function localToday(at: Date = new Date()): string {
  return localNow(at).day;
}

export const minutesOf = (time: { hour: number; minute: number }) => time.hour * 60 + time.minute;
