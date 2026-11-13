import { all, id as newId, logActivity, now, one, run } from "./db";
import { CALENDAR_STATUSES, isOnCalendar } from "./reservations-shared";
import { CHECK_IN_TIME, CHECK_OUT_TIME, localNow, minutesOf } from "./clock";

/**
 * Talking to the Guesty Open API.
 *
 * Two things shape this file. Guesty rate-limits token requests far more
 * tightly than ordinary calls, so the access token is cached in the database
 * and reused until it is nearly expired — an in-memory cache would fetch a
 * fresh one on every restart and every deploy. And everything is paged, so
 * each list is walked until Guesty stops returning rows.
 *
 * Credentials come from the environment and are never written anywhere a
 * browser can reach: this module is server-only, and nothing it exports
 * returns the token or the secret.
 */

/** Guesty's own host. GUESTY_API_BASE overrides it, which exists so the sync
 * can be run against a stub in testing; leave it unset in production. */
const BASE = process.env.GUESTY_API_BASE ?? "https://open-api.guesty.com";
const TOKEN_URL = `${BASE}/oauth2/token`;
const API = `${BASE}/v1`;

/** Ask for a new token this long before the old one actually expires. */
const RENEW_MARGIN_MS = 10 * 60 * 1000;
const PAGE_SIZE = 100;
/** Guesty will not page past this; a guard against an endless loop. */
const MAX_PAGES = 200;
/**
 * How far back the calendar reaches. Guesty is asked for this window
 * explicitly: left to itself its list appears to cover only what is still to
 * come, which leaves past months empty and drops guests already checked in.
 */
const HISTORY_DAYS = 365;

export type SyncResult = {
  ok: boolean;
  listings: number;
  reservations: number;
  /** Properties created in this run because Guesty had a listing we did not. */
  properties: number;
  message: string;
  ranAt: string;
};

export function guestyConfigured(): boolean {
  return Boolean(process.env.GUESTY_CLIENT_ID && process.env.GUESTY_CLIENT_SECRET);
}

// ------------------------------------------------------------------- token

type TokenRow = { access_token: string | null; token_expires_at: string | null };

function cachedToken(): string | null {
  const row = one<TokenRow>(`SELECT access_token, token_expires_at FROM guesty_sync WHERE id = 1`);
  if (!row?.access_token || !row.token_expires_at) return null;
  const expires = new Date(row.token_expires_at).getTime();
  if (!Number.isFinite(expires)) return null;
  if (expires - RENEW_MARGIN_MS <= Date.now()) return null;
  return row.access_token;
}

function storeToken(token: string, expiresInSeconds: number): void {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  run(
    `INSERT INTO guesty_sync (id, access_token, token_expires_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET access_token = excluded.access_token,
                                   token_expires_at = excluded.token_expires_at`,
    [token, expiresAt],
  );
}

/** A usable access token, from the cache when there is one. */
export async function getAccessToken(force = false): Promise<string> {
  if (!force) {
    const cached = cachedToken();
    if (cached) return cached;
  }

  const clientId = process.env.GUESTY_CLIENT_ID;
  const clientSecret = process.env.GUESTY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GUESTY_CLIENT_ID and GUESTY_CLIENT_SECRET are not set.");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "open-api",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
  });

  if (!res.ok) {
    // deliberately not echoing the body: it can repeat the credentials back
    throw new Error(
      res.status === 429
        ? "Guesty is rate-limiting token requests. The cached token is reused between runs; wait a few minutes before retrying."
        : `Guesty refused the credentials (HTTP ${res.status}). Check GUESTY_CLIENT_ID and GUESTY_CLIENT_SECRET.`,
    );
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Guesty returned no access token.");
  storeToken(json.access_token, json.expires_in ?? 86400);
  return json.access_token;
}

// -------------------------------------------------------------------- http

/**
 * isOnCalendar() as SQL: the status lower-cased with its underscores, dashes
 * and spaces taken out, checked against the same list.
 */
const ON_CALENDAR_SQL = `REPLACE(REPLACE(REPLACE(LOWER(COALESCE(status, '')), '_', ''), '-', ''), ' ', '')
  IN (${CALENDAR_STATUSES.map((s) => `'${s}'`).join(", ")})`;

/** A refusal from Guesty, keeping the status so callers can tell kinds apart. */
class GuestyHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** A GET against the Open API, retrying once on an expired token. */
async function apiGet(path: string, params: Record<string, string>): Promise<any> {
  const url = `${API}${path}?${new URLSearchParams(params).toString()}`;

  for (const attempt of [0, 1]) {
    const token = await getAccessToken(attempt === 1);
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });

    // a stale cached token looks like a 401; get a fresh one and try again
    if (res.status === 401 && attempt === 0) continue;

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new GuestyHttpError(
        `Guesty ${path} failed (HTTP ${res.status}). ${detail.slice(0, 200)}`,
        res.status,
      );
    }
    return res.json();
  }
  throw new Error(`Guesty ${path} kept rejecting the access token.`);
}

/**
 * Walk a paged endpoint to the end.
 *
 * `complete` is false only when the page cap stopped the walk early, which
 * matters to anything that reads "Guesty did not send it" as "it is gone".
 */
async function fetchAll(
  path: string,
  extra: Record<string, string> = {},
): Promise<{ rows: any[]; complete: boolean }> {
  const rows: any[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const json = await apiGet(path, {
      ...extra,
      limit: String(PAGE_SIZE),
      skip: String(page * PAGE_SIZE),
    });
    const batch: any[] = json?.results ?? json?.data?.results ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return { rows, complete: true };
  }
  return { rows, complete: false };
}

// ------------------------------------------------------------------ shapes

/** The stay's first or last day as the property's own calendar has it. */
function localDay(row: any, end: "in" | "out"): string | null {
  return end === "in"
    ? asDate(row?.checkInDateLocalized) ?? asDate(row?.checkIn)
    : asDate(row?.checkOutDateLocalized) ?? asDate(row?.checkOut);
}

/** Guesty hands dates back in several shapes; we only ever store the day. */
function asDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Guest names arrive under a few different keys depending on the channel. */
function guestName(row: any): string | null {
  return (
    text(row?.guest?.fullName) ??
    text(
      [row?.guest?.firstName, row?.guest?.lastName].filter(Boolean).join(" ") || null,
    ) ??
    text(row?.guestName) ??
    null
  );
}

// ------------------------------------------------------------------- sync

/**
 * Pull everything and write it down.
 *
 * Upserts throughout: a reservation Guesty has cancelled comes back with
 * status "canceled" and updates the row we already hold rather than
 * disappearing, and a listing seen for the first time is created on the spot.
 */
export async function syncGuesty(): Promise<SyncResult> {
  const ranAt = now();

  if (!guestyConfigured()) {
    const message = "GUESTY_CLIENT_ID and GUESTY_CLIENT_SECRET are not set on this service.";
    recordRun({ ok: false, listings: 0, reservations: 0, properties: 0, message, ranAt });
    return { ok: false, listings: 0, reservations: 0, properties: 0, message, ranAt };
  }

  try {
    const listings = (await fetchAll("/listings")).rows;
    const listingCount = upsertListings(listings, ranAt);

    const fields = [
      "_id", "listingId", "checkIn", "checkOut",
      "checkInDateLocalized", "checkOutDateLocalized", "status", "source",
      "integration", "guest", "guestsCount", "nightsCount",
      "confirmationCode", "lastUpdatedAt",
    ].join(" ");
    const since = daysBefore(ranAt, HISTORY_DAYS);

    // Every stay that ends inside the window, whatever its status: past
    // months, guests in the house right now, and everything to come.
    let pulled: { rows: any[]; complete: boolean };
    let windowed = true;
    try {
      pulled = await fetchAll("/reservations", {
        fields,
        filters: JSON.stringify([{ field: "checkOut", operator: "$gte", value: since }]),
      });
    } catch (err) {
      if (!(err instanceof GuestyHttpError) || err.status !== 400) throw err;
      // Guesty would not take the date filter. Fall back to its default list
      // rather than fail the whole sync — but what that list covers is then
      // unknown, so nothing below may read a missing booking as a removed one.
      windowed = false;
      pulled = await fetchAll("/reservations", { fields });
    }
    const reservationCount = upsertReservations(pulled.rows, ranAt);

    // Only trust "Guesty did not send it" when Guesty was asked for the whole
    // window and sent a whole answer: a fallback, empty or cut-short reply
    // must never take the calendar down with it.
    const removed =
      windowed && pulled.complete && reservationCount > 0 ? clearVanished(ranAt, since) : 0;

    // every Guesty listing should have somewhere to keep its door code
    const created = syncProperties(ranAt);

    const message =
      `Synced ${listingCount} listings and ${reservationCount} reservations${spanOf(pulled.rows)}.` +
      offCalendar(pulled.rows) +
      (windowed
        ? ""
        : " Guesty would not accept the date range, so past months may be missing.") +
      (removed
        ? ` Took ${removed} ${removed === 1 ? "booking" : "bookings"} Guesty no longer lists off the calendar.`
        : "") +
      (created ? ` Added ${created} ${created === 1 ? "property" : "properties"}.` : "");
    const result = {
      ok: true as const,
      listings: listingCount,
      reservations: reservationCount,
      properties: created,
      message,
      ranAt,
    };
    recordRun(result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    recordRun({ ok: false, listings: 0, reservations: 0, properties: 0, message, ranAt });
    return { ok: false, listings: 0, reservations: 0, properties: 0, message, ranAt };
  }
}

function upsertListings(rows: any[], syncedAt: string): number {
  // colours are handed out in the order listings are first seen, and kept,
  // so a property does not change colour every time the list grows
  const taken = one<{ c: number }>(`SELECT COUNT(*) AS c FROM guesty_listings`)?.c ?? 0;
  let next = taken;
  let seen = 0;

  for (const row of rows) {
    const guestyId = text(row?._id) ?? text(row?.id);
    if (!guestyId) continue;
    const name = text(row?.title) ?? text(row?.nickname) ?? text(row?.name) ?? "Untitled listing";
    const nickname = text(row?.nickname);
    const active = row?.active === false ? 0 : 1;

    const existing = one<{ id: string }>(
      `SELECT id FROM guesty_listings WHERE guesty_id = ?`,
      [guestyId],
    );

    if (existing) {
      run(
        `UPDATE guesty_listings SET name = ?, nickname = ?, active = ?, synced_at = ?, updated_at = ?
          WHERE guesty_id = ?`,
        [name, nickname, active, syncedAt, syncedAt, guestyId],
      );
    } else {
      run(
        `INSERT INTO guesty_listings (id, guesty_id, name, nickname, colour, active, synced_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), guestyId, name, nickname, next % 12, active, syncedAt, syncedAt, syncedAt],
      );
      next += 1;
    }
    seen += 1;
  }
  return seen;
}

/** Same name, give or take the spacing and the capitals. */
function normalise(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Give every Guesty listing a row in Properties.
 *
 * A property is where the door code, the lockbox, the Wi-Fi and the owner's
 * details live, and Guesty holds none of that — so a listing arriving from
 * Guesty needs somewhere to put it. A property already called by the same
 * name is adopted rather than duplicated; anything else gets created with
 * just its name, ready to be filled in.
 *
 * It only ever adds. Renaming a property here, or deleting one, is a
 * decision somebody made on purpose, and the link is what stops the next
 * sync from undoing it.
 */
function syncProperties(syncedAt: string): number {
  const listings = all<{ guesty_id: string; name: string; nickname: string | null }>(
    `SELECT guesty_id, name, nickname FROM guesty_listings WHERE active = 1`,
  );
  if (listings.length === 0) return 0;

  const properties = all<{ id: string; name: string; guesty_listing_id: string | null }>(
    `SELECT id, name, guesty_listing_id FROM properties`,
  );
  const linked = new Set(
    properties.map((p) => p.guesty_listing_id).filter(Boolean) as string[],
  );
  // only an unclaimed property can be adopted, and the first one wins
  const byName = new Map<string, string>();
  for (const property of properties) {
    if (property.guesty_listing_id) continue;
    const key = normalise(property.name);
    if (key && !byName.has(key)) byName.set(key, property.id);
  }

  let created = 0;
  for (const listing of listings) {
    if (linked.has(listing.guesty_id)) continue;

    const match =
      byName.get(normalise(listing.name)) ?? byName.get(normalise(listing.nickname));

    if (match) {
      run(`UPDATE properties SET guesty_listing_id = ?, updated_at = ? WHERE id = ?`, [
        listing.guesty_id,
        syncedAt,
        match,
      ]);
      byName.delete(normalise(listing.name));
      if (listing.nickname) byName.delete(normalise(listing.nickname));
      linked.add(listing.guesty_id);
      continue;
    }

    const propertyId = newId();
    run(
      `INSERT INTO properties (id, name, status, guesty_listing_id, created_at, updated_at)
       VALUES (?, ?, 'active', ?, ?, ?)`,
      [propertyId, listing.name, listing.guesty_id, syncedAt, syncedAt],
    );
    logActivity(
      "properties",
      propertyId,
      "created",
      `Property "${listing.name}" added from Guesty`,
    );
    linked.add(listing.guesty_id);
    created += 1;
  }
  return created;
}

function upsertReservations(rows: any[], syncedAt: string): number {
  let seen = 0;

  for (const row of rows) {
    const guestyId = text(row?._id) ?? text(row?.id);
    const listingId = text(row?.listingId) ?? text(row?.listing?._id);
    // The property's own calendar day, which is what Guesty's calendar shows.
    // checkIn/checkOut are UTC timestamps: a late arrival in Aruba is already
    // tomorrow in UTC, so the day cut from them can land one day off.
    const checkIn = localDay(row, "in");
    const checkOut = localDay(row, "out");
    // without these four there is nothing to put on a calendar
    if (!guestyId || !listingId || !checkIn || !checkOut) continue;

    const values = {
      guesty_listing_id: listingId,
      check_in: checkIn,
      check_out: checkOut,
      guest_name: guestName(row),
      channel: text(row?.source) ?? text(row?.integration?.platform) ?? null,
      status: text(row?.status) ?? "unknown",
      nights: typeof row?.nightsCount === "number" ? row.nightsCount : null,
      guest_count: typeof row?.guestsCount === "number" ? row.guestsCount : null,
      confirmation_code: text(row?.confirmationCode),
      last_updated: text(row?.lastUpdatedAt),
    };

    const cols = Object.keys(values) as (keyof typeof values)[];
    const existing = one<{ id: string }>(`SELECT id FROM reservations WHERE guesty_id = ?`, [guestyId]);

    if (existing) {
      run(
        `UPDATE reservations SET ${cols.map((c) => `${c} = ?`).join(", ")}, synced_at = ?, updated_at = ?
          WHERE guesty_id = ?`,
        [...cols.map((c) => values[c]), syncedAt, syncedAt, guestyId],
      );
    } else {
      run(
        `INSERT INTO reservations (id, guesty_id, ${cols.join(", ")}, synced_at, created_at, updated_at)
         VALUES (?, ?, ${cols.map(() => "?").join(", ")}, ?, ?, ?)`,
        [newId(), guestyId, ...cols.map((c) => values[c]), syncedAt, syncedAt, syncedAt],
      );
    }
    seen += 1;
  }
  return seen;
}

/**
 * Take bookings Guesty has stopped listing off the calendar.
 *
 * Updating what Guesty sends back is not enough on its own: a booking that
 * is cancelled, moved or deleted can simply stop appearing in Guesty's list,
 * and then nothing ever tells us. Every booking Guesty does send is stamped
 * with this run's synced_at, so whatever is left with an older stamp is
 * exactly what has gone missing.
 *
 * Such a row is marked "removed" rather than deleted, which isOnCalendar()
 * leaves off like any cancellation — and if Guesty ever lists it again, the next
 * upsert simply writes its real status back. Bookings already over are left
 * alone: they are history, and Guesty dropping old stays from its list says
 * nothing about whether they happened.
 */
function clearVanished(ranAt: string, since: string): number {
  // Guesty was asked for every stay ending on or after `since`, so only a
  // booking inside that window can be missing from its answer; and of those,
  // only one not yet over is acted on. A guest checked in last week is still
  // inside the window, so they are only ever cleared if Guesty truly dropped
  // them.
  const today = ranAt.slice(0, 10);
  const result = run(
    `UPDATE reservations
        SET status = 'removed', updated_at = ?
      WHERE synced_at < ?
        AND check_out >= ?
        AND check_out >= ?
        AND ${ON_CALENDAR_SQL}`,
    [ranAt, ranAt, today, since],
  );
  return Number(result?.changes ?? 0);
}

/**
 * " Not on the calendar: 31 inquiry, 12 canceled." — what Guesty sent that
 * is deliberately not drawn, by status, so the last-sync line shows exactly
 * why a number differs from Guesty's and any status nobody expected.
 */
function offCalendar(rows: any[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const status = text(row?.status) ?? "no status";
    if (isOnCalendar(status)) continue;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  if (counts.size === 0) return "";
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, n]) => `${n} ${status}`);
  return ` Not on the calendar: ${parts.join(", ")}.`;
}

/** The day `days` before the given timestamp, as YYYY-MM-DD. */
function daysBefore(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * " from Nov 2025 to Mar 2027" — what the reply actually covered, so the
 * last-sync line shows at a glance whether past months came through.
 */
function spanOf(rows: any[]): string {
  let first: string | null = null;
  let last: string | null = null;
  for (const row of rows) {
    const inDay = localDay(row, "in");
    const outDay = localDay(row, "out");
    if (inDay && (!first || inDay < first)) first = inDay;
    if (outDay && (!last || outDay > last)) last = outDay;
  }
  if (!first || !last) return "";
  const month = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return ` from ${month(first)} to ${month(last)}`;
}

function recordRun(result: SyncResult): void {
  run(
    `INSERT INTO guesty_sync (id, last_run_at, last_status, last_message, listings_seen, reservations_seen)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_run_at = excluded.last_run_at,
                                   last_status = excluded.last_status,
                                   last_message = excluded.last_message,
                                   listings_seen = excluded.listings_seen,
                                   reservations_seen = excluded.reservations_seen`,
    [result.ranAt, result.ok ? "ok" : "error", result.message, result.listings, result.reservations],
  );
}

export type SyncState = {
  last_run_at: string | null;
  last_status: string | null;
  last_message: string | null;
  listings_seen: number | null;
  reservations_seen: number | null;
};

export function lastSync(): SyncState | undefined {
  return one<SyncState>(
    `SELECT last_run_at, last_status, last_message, listings_seen, reservations_seen
       FROM guesty_sync WHERE id = 1`,
  );
}

// ------------------------------------------------------------------ reading

export type GuestyListing = Record<string, any>;
export type Reservation = Record<string, any>;

export function listGuestyListings(): GuestyListing[] {
  return all<GuestyListing>(
    `SELECT * FROM guesty_listings ORDER BY active DESC, COALESCE(nickname, name) ASC`,
  );
}

/** Reservations touching a date range, cancellations included so the page can
 * decide whether to show them. */
/**
 * The listings with a guest in them at this moment, Aruba time.
 *
 * A stay runs from check-in time on its first day to check-out time on its
 * last (4 PM and 11 AM, lib/clock.ts), so on a changeover day a property is
 * occupied until 11, empty until 4, and occupied again after. Only bookings
 * the calendar shows count — the test is isOnCalendar() in
 * lib/reservations-shared.ts.
 */
export function occupiedListingIds(at: Date = new Date()): Set<string> {
  const { day, minutes } = localNow(at);
  const arrived = minutes >= minutesOf(CHECK_IN_TIME) ? 1 : 0;
  const notYetLeft = minutes < minutesOf(CHECK_OUT_TIME) ? 1 : 0;
  const rows = all<{ guesty_listing_id: string }>(
    `SELECT DISTINCT guesty_listing_id
       FROM reservations
      WHERE (check_in < ? OR (check_in = ? AND ? = 1))
        AND (check_out > ? OR (check_out = ? AND ? = 1))
        AND ${ON_CALENDAR_SQL}`,
    [day, day, arrived, day, day, notYetLeft],
  );
  return new Set(rows.map((r) => r.guesty_listing_id));
}

export function reservationsBetween(from: string, to: string): Reservation[] {
  return all<Reservation>(
    `SELECT r.*, COALESCE(l.nickname, l.name) AS listing_name, l.colour AS colour
       FROM reservations r
       LEFT JOIN guesty_listings l ON l.guesty_id = r.guesty_listing_id
      WHERE r.check_out >= ? AND r.check_in <= ?
      ORDER BY r.check_in ASC`,
    [from, to],
  );
}
