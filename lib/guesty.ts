import { all, id as newId, now, one, run } from "./db";

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

export type SyncResult = {
  ok: boolean;
  listings: number;
  reservations: number;
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
      throw new Error(`Guesty ${path} failed (HTTP ${res.status}). ${detail.slice(0, 200)}`);
    }
    return res.json();
  }
  throw new Error(`Guesty ${path} kept rejecting the access token.`);
}

/** Walk a paged endpoint to the end. */
async function fetchAll(path: string, extra: Record<string, string> = {}): Promise<any[]> {
  const rows: any[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const json = await apiGet(path, {
      ...extra,
      limit: String(PAGE_SIZE),
      skip: String(page * PAGE_SIZE),
    });
    const batch: any[] = json?.results ?? json?.data?.results ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

// ------------------------------------------------------------------ shapes

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
    recordRun({ ok: false, listings: 0, reservations: 0, message, ranAt });
    return { ok: false, listings: 0, reservations: 0, message, ranAt };
  }

  try {
    const listings = await fetchAll("/listings");
    const listingCount = upsertListings(listings, ranAt);

    const reservations = await fetchAll("/reservations", {
      // everything, cancellations included — the status is the point
      fields: [
        "_id", "listingId", "checkIn", "checkOut", "status", "source",
        "integration", "guest", "guestsCount", "nightsCount",
        "confirmationCode", "lastUpdatedAt",
      ].join(" "),
    });
    const reservationCount = upsertReservations(reservations, ranAt);

    const message = `Synced ${listingCount} listings and ${reservationCount} reservations.`;
    recordRun({ ok: true, listings: listingCount, reservations: reservationCount, message, ranAt });
    return { ok: true, listings: listingCount, reservations: reservationCount, message, ranAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    recordRun({ ok: false, listings: 0, reservations: 0, message, ranAt });
    return { ok: false, listings: 0, reservations: 0, message, ranAt };
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

function upsertReservations(rows: any[], syncedAt: string): number {
  let seen = 0;

  for (const row of rows) {
    const guestyId = text(row?._id) ?? text(row?.id);
    const listingId = text(row?.listingId) ?? text(row?.listing?._id);
    const checkIn = asDate(row?.checkIn ?? row?.checkInDateLocalized);
    const checkOut = asDate(row?.checkOut ?? row?.checkOutDateLocalized);
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
