/**
 * Next runs this once when the server starts, which is where the Guesty
 * sync schedule is set going. Guarded to the Node runtime so it never tries
 * to start during a build or on the edge runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startGuestySchedule } = await import("./lib/guesty-schedule");
  startGuestySchedule();
}
