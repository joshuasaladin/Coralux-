import type Database from "better-sqlite3";
import crypto from "node:crypto";
import { CHECKLISTS, RETIRED_DEFAULT_STEPS } from "./onboarding-template";

/**
 * Small, idempotent catch-up work run at every boot.
 *
 * schema.sql only ever creates things that do not exist, so a column added to
 * an existing table has to be added by hand — and a checklist that grows needs
 * carrying onto the listings created before it grew. Both are safe to run over
 * and over, which is what makes it fine to do on every start.
 */
export function migrate(db: Database.Database) {
  addMissingColumns(db);
  purgeUnusedSections(db);
  backfillChecklists(db);
  syncInventoryStatuses(db);
}

function columnNames(db: Database.Database, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function addMissingColumns(db: Database.Database) {
  if (!columnNames(db, "users").has("door_code")) {
    db.exec(`ALTER TABLE users ADD COLUMN door_code TEXT`);
  }
  const props = columnNames(db, "properties");
  for (const [col, type] of [
    ["door_code", "TEXT"], ["lockbox_code", "TEXT"], ["alarm_code", "TEXT"],
    ["wifi_name", "TEXT"], ["wifi_password", "TEXT"], ["parking", "TEXT"],
    ["access_notes", "TEXT"], ["owner_email", "TEXT"], ["owner_phone", "TEXT"],
    ["guesty_listing_id", "TEXT"],
  ] as const) {
    if (!props.has(col)) db.exec(`ALTER TABLE properties ADD COLUMN ${col} ${type}`);
  }

  const steps = columnNames(db, "listing_steps");
  if (!steps.has("section")) db.exec(`ALTER TABLE listing_steps ADD COLUMN section TEXT`);
  if (!steps.has("note")) db.exec(`ALTER TABLE listing_steps ADD COLUMN note TEXT`);
  if (!steps.has("list")) {
    db.exec(`ALTER TABLE listing_steps ADD COLUMN list TEXT NOT NULL DEFAULT 'onboarding'`);
  }
  if (!steps.has("coralux_supplied")) {
    db.exec(`ALTER TABLE listing_steps ADD COLUMN coralux_supplied INTEGER NOT NULL DEFAULT 0`);
  }
}

/**
 * Give every listing the current checklists.
 *
 * Anything already ticked is left exactly as it is, and so is any extra step
 * somebody added by hand — only the retired generic steps are swept up, and
 * only while still unticked, so no record of finished work is ever thrown
 * away. Steps are matched on list, section and label together, because labels
 * repeat both across sections and across the two lists.
 */
function backfillChecklists(db: Database.Database) {
  const listings = db.prepare(`SELECT id FROM listings`).all() as { id: string }[];
  if (listings.length === 0) return;

  const retired = new Set(RETIRED_DEFAULT_STEPS);
  const template = new Set<string>();
  const order = new Map<string, number>();
  let position = 0;
  for (const list of CHECKLISTS) {
    for (const step of list.steps) {
      const key = `${list.key} :: ${step.section} :: ${step.label}`;
      template.add(key);
      order.set(key, position);
      position += 1;
    }
  }

  const existingFor = db.prepare(
    `SELECT id, label, list, section, done, coralux_supplied FROM listing_steps WHERE listing_id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO listing_steps (id, listing_id, label, list, section, coralux_supplied, sort, done, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  );
  const drop = db.prepare(`DELETE FROM listing_steps WHERE id = ?`);
  const reorder = db.prepare(`UPDATE listing_steps SET sort = ? WHERE id = ?`);
  const markSupplied = db.prepare(`UPDATE listing_steps SET coralux_supplied = ? WHERE id = ?`);

  const keyOf = (row: { list?: string | null; section: string | null; label: string }) =>
    `${row.list ?? "onboarding"} :: ${row.section ?? ""} :: ${row.label}`;

  const run = db.transaction(() => {
    for (const listing of listings) {
      const rows = existingFor.all(listing.id) as {
        id: string; label: string; list: string | null; section: string | null; done: number;
      }[];

      // clear out the old generic checklist, but never something ticked
      for (const row of rows) {
        if (!row.done && !row.section && retired.has(row.label) && !template.has(keyOf(row))) {
          drop.run(row.id);
        }
      }

      const present = new Set<string>(
        (existingFor.all(listing.id) as { label: string; list: string | null; section: string | null }[])
          .map(keyOf),
      );

      let sort = 0;
      for (const list of CHECKLISTS) {
        for (const step of list.steps) {
          const key = `${list.key} :: ${step.section} :: ${step.label}`;
          if (!present.has(key)) {
            insert.run(
              crypto.randomUUID(), listing.id, step.label, list.key, step.section,
              step.coralux ? 1 : 0, sort, new Date().toISOString(),
            );
          }
          sort += 1;
        }
      }

      // keep template order stable, push anything custom to the end, and let
      // a change to who supplies an item reach the listings that already have it
      const after = existingFor.all(listing.id) as {
        id: string; label: string; list: string | null; section: string | null; coralux_supplied: number;
      }[];
      const supplied = new Map<string, boolean>();
      for (const list of CHECKLISTS) {
        for (const step of list.steps) {
          supplied.set(`${list.key} :: ${step.section} :: ${step.label}`, step.coralux);
        }
      }
      for (const row of after) {
        const key = keyOf(row);
        reorder.run(order.get(key) ?? order.size + 1, row.id);
        const should = supplied.get(key);
        if (should !== undefined && Number(should) !== row.coralux_supplied) {
          markSupplied.run(should ? 1 : 0, row.id);
        }
      }
    }
  });
  run();
}

/**
 * Empty the tables for sections that are not switched on.
 *
 * None of them can be reached through the app, so anything sitting in them is
 * leftover demo data cluttering the counts in Admin. The tables themselves
 * stay: they cost nothing empty, and switching one of these sections on later
 * is still a one-line change rather than a rebuild.
 */
const UNUSED_TABLES = [
  "projects", "requests", "invoices", "payments", "payouts",
  "recurring_expenses", "contracts", "time_off", "contacts", "assets",
  "sops", "meetings",
];

/** What those tables are called where notes, files and history point at them. */
const UNUSED_ENTITIES = [
  "projects", "requests", "invoices", "payments", "payouts",
  "recurring", "contracts", "timeoff", "contacts", "assets",
  "sops", "meetings",
];

function purgeUnusedSections(db: Database.Database) {
  const run = db.transaction(() => {
    for (const table of UNUSED_TABLES) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch {
        /* table not there on an older database — nothing to clear */
      }
    }
    const placeholders = UNUSED_ENTITIES.map(() => "?").join(", ");
    for (const side of ["notes", "file_links", "activity"]) {
      db.prepare(`DELETE FROM ${side} WHERE entity IN (${placeholders})`).run(...UNUSED_ENTITIES);
    }
  });
  run();
  // the space those rows held goes back to the operating system
  try {
    db.exec("VACUUM");
  } catch {
    /* vacuum is a nicety, not worth failing a boot over */
  }
}

/**
 * Bring existing stock rows in line with the quantity that is actually on the
 * shelf, so the status column means something the moment this ships rather
 * than only after each item is next edited.
 */
function syncInventoryStatuses(db: Database.Database) {
  db.exec(`
    UPDATE inventory
       SET status = CASE
             WHEN quantity IS NULL THEN status
             WHEN quantity <= 0 THEN 'out'
             WHEN par_level IS NOT NULL AND quantity < par_level THEN 'low'
             ELSE 'in_stock'
           END
     WHERE status != 'discontinued'
  `);
}
