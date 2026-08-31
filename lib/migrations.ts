import type Database from "better-sqlite3";
import crypto from "node:crypto";
import {
  ONBOARDING_STEPS,
  RETIRED_DEFAULT_STEPS,
} from "./onboarding-template";

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
  backfillOnboardingChecklists(db);
  syncInventoryStatuses(db);
}

function columnNames(db: Database.Database, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function addMissingColumns(db: Database.Database) {
  const steps = columnNames(db, "listing_steps");
  if (!steps.has("section")) db.exec(`ALTER TABLE listing_steps ADD COLUMN section TEXT`);
  if (!steps.has("note")) db.exec(`ALTER TABLE listing_steps ADD COLUMN note TEXT`);
}

/**
 * Give every listing the current checklist.
 *
 * Anything already ticked is left exactly as it is, and so is any extra step
 * somebody added by hand — only the retired generic steps are swept up, and
 * only while still unticked, so no record of finished work is ever thrown
 * away. Steps are matched on section *and* label, because a couple of labels
 * deliberately repeat across sections.
 */
function backfillOnboardingChecklists(db: Database.Database) {
  const listings = db.prepare(`SELECT id FROM listings`).all() as { id: string }[];
  if (listings.length === 0) return;

  const template = new Set<string>(ONBOARDING_STEPS.map((s) => `${s.section} :: ${s.label}`));
  const retired = new Set(RETIRED_DEFAULT_STEPS);

  const existingFor = db.prepare(
    `SELECT id, label, section, done FROM listing_steps WHERE listing_id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO listing_steps (id, listing_id, label, section, sort, done, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
  );
  const drop = db.prepare(`DELETE FROM listing_steps WHERE id = ?`);
  const reorder = db.prepare(`UPDATE listing_steps SET sort = ? WHERE id = ?`);

  const run = db.transaction(() => {
    for (const listing of listings) {
      const rows = existingFor.all(listing.id) as {
        id: string; label: string; section: string | null; done: number;
      }[];

      // clear out the old generic checklist, but never something ticked
      for (const row of rows) {
        const key = `${row.section ?? ""} :: ${row.label}`;
        if (!row.done && !row.section && retired.has(row.label) && !template.has(key)) {
          drop.run(row.id);
        }
      }

      const present = new Set<string>(
        (existingFor.all(listing.id) as { label: string; section: string | null }[]).map(
          (r) => `${r.section ?? ""} :: ${r.label}`,
        ),
      );

      let sort = 0;
      for (const step of ONBOARDING_STEPS) {
        const key = `${step.section} :: ${step.label}`;
        if (!present.has(key)) {
          insert.run(crypto.randomUUID(), listing.id, step.label, step.section, sort, new Date().toISOString());
        }
        sort += 1;
      }

      // keep template order stable, and push anything custom to the end
      const after = existingFor.all(listing.id) as { id: string; label: string; section: string | null }[];
      const order = new Map<string, number>(
        ONBOARDING_STEPS.map((s, i) => [`${s.section} :: ${s.label}`, i]),
      );
      for (const row of after) {
        const key = `${row.section ?? ""} :: ${row.label}`;
        reorder.run(order.get(key) ?? ONBOARDING_STEPS.length + 1, row.id);
      }
    }
  });
  run();
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
