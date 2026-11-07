import { guestyConfigured, syncGuesty } from "./guesty";

/**
 * The every-ten-minutes sync.
 *
 * It runs inside the web service rather than as a separate Render Cron Job
 * for a concrete reason: a Render disk attaches to exactly one service, and
 * the SQLite file lives on the web service's disk. A cron job is its own
 * service, so it could call Guesty but would have nowhere to write the
 * answer. Keeping the schedule here puts the work in the one process that
 * can actually persist it.
 */
const EVERY_MS = 10 * 60 * 1000;
/** A moment after boot, so the first sync does not fight the cold start. */
const FIRST_RUN_DELAY_MS = 30 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __guestyTimer: ReturnType<typeof setInterval> | undefined;
}

export function startGuestySchedule(): void {
  if (global.__guestyTimer) return; // survives hot reloads in development
  if (process.env.GUESTY_SCHEDULE === "off") {
    console.log("[guesty] GUESTY_SCHEDULE=off — the scheduled sync is disabled.");
    return;
  }
  if (!guestyConfigured()) {
    console.log("[guesty] no credentials set — the scheduled sync is off.");
    return;
  }

  const tick = async () => {
    try {
      const result = await syncGuesty();
      console.log(`[guesty] ${result.ok ? "ok" : "failed"}: ${result.message}`);
    } catch (err) {
      // never let a bad sync take the server down with it
      console.error("[guesty] sync threw:", err instanceof Error ? err.message : err);
    }
  };

  setTimeout(tick, FIRST_RUN_DELAY_MS);
  global.__guestyTimer = setInterval(tick, EVERY_MS);
  console.log("[guesty] sync scheduled every 10 minutes.");
}
