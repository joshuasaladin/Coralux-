import { all, id as newId, logActivity, now, one, run } from "./db";
import type { User } from "./auth";
import { ONBOARDING_STEPS } from "./onboarding-template";
import { capture, recordDeletion } from "./undo";

export type Listing = Record<string, any>;
export type ListingStep = Record<string, any>;

// Re-exported so server-side pages can import everything from one place;
// components that need these client-side must import lib/listing-options
// directly, since this module pulls in the (node-only) database layer.
export { PLATFORM_OPTIONS, STATUS_OPTIONS, statusTone, statusLabel, platformLabel } from "./listing-options";

export { ONBOARDING_TEMPLATE, ONBOARDING_STEPS } from "./onboarding-template";

export function listListings(): Listing[] {
  return all<Listing>(
    `SELECT l.*,
            COUNT(s.id) AS step_total,
            COALESCE(SUM(s.done), 0) AS step_done
       FROM listings l
       LEFT JOIN listing_steps s ON s.listing_id = l.id
      GROUP BY l.id
      ORDER BY l.status = 'active', l.status = 'paused', l.created_at DESC`,
  );
}

export function getListing(id: string): Listing | undefined {
  return one<Listing>(`SELECT * FROM listings WHERE id = ?`, [id]);
}

export function listSteps(listingId: string): ListingStep[] {
  return all<ListingStep>(
    `SELECT * FROM listing_steps WHERE listing_id = ? ORDER BY sort ASC, created_at ASC`,
    [listingId],
  );
}

export function stepProgress(listingId: string): { done: number; total: number } {
  const row = one<{ done: number; total: number }>(
    `SELECT COALESCE(SUM(done), 0) AS done, COUNT(*) AS total FROM listing_steps WHERE listing_id = ?`,
    [listingId],
  );
  return { done: Number(row?.done ?? 0), total: Number(row?.total ?? 0) };
}

function readListingFields(form: FormData) {
  return {
    name: String(form.get("name") ?? "").trim(),
    address: String(form.get("address") ?? "").trim() || null,
    owner_name: String(form.get("owner_name") ?? "").trim() || null,
    platforms: String(form.get("platforms") ?? "both"),
    target_date: String(form.get("target_date") ?? "").trim() || null,
    assignee: String(form.get("assignee") ?? "").trim() || null,
    notes: String(form.get("notes") ?? "").trim() || null,
  };
}

export function createListing(form: FormData, user: User): string {
  const fields = readListingFields(form);
  if (!fields.name) throw new Error("Give the listing a name.");

  const listingId = newId();
  run(
    `INSERT INTO listings (id, name, address, owner_name, platforms, target_date, assignee, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', ?, ?, ?)`,
    [
      listingId,
      fields.name,
      fields.address,
      fields.owner_name,
      fields.platforms,
      fields.target_date,
      fields.assignee,
      fields.notes,
      now(),
      now(),
    ],
  );

  ONBOARDING_STEPS.forEach((step, index) => {
    run(
      `INSERT INTO listing_steps (id, listing_id, label, section, sort, done, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [newId(), listingId, step.label, step.section, index, now()],
    );
  });

  logActivity("listings", listingId, "created", `Listing created with a ${ONBOARDING_STEPS.length}-step checklist`, user.id);
  return listingId;
}

export function updateListing(listingId: string, form: FormData, user: User): void {
  const fields = readListingFields(form);
  if (!fields.name) throw new Error("Give the listing a name.");
  const status = String(form.get("status") ?? "in_progress");

  run(
    `UPDATE listings SET name = ?, address = ?, owner_name = ?, platforms = ?, target_date = ?,
            assignee = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?`,
    [
      fields.name,
      fields.address,
      fields.owner_name,
      fields.platforms,
      fields.target_date,
      fields.assignee,
      fields.notes,
      status,
      now(),
      listingId,
    ],
  );
  logActivity("listings", listingId, "updated", "Listing details updated", user.id);
}

export function deleteListing(listingId: string, user: User): void {
  const listing = getListing(listingId);

  // the checklist goes with the listing, so it has to come back with it too
  recordDeletion({
    kind: "listing",
    label: listing?.name ?? "Listing",
    actorId: user.id,
    snapshot: [
      capture("listings", "id = ?", [listingId]),
      capture("listing_steps", "listing_id = ?", [listingId]),
      capture("notes", "entity = 'listings' AND entity_id = ?", [listingId]),
      capture("file_links", "entity = 'listings' AND entity_id = ?", [listingId]),
    ],
  });

  run(`DELETE FROM listings WHERE id = ?`, [listingId]);
  run(`DELETE FROM notes WHERE entity = 'listings' AND entity_id = ?`, [listingId]);
  run(`DELETE FROM file_links WHERE entity = 'listings' AND entity_id = ?`, [listingId]);
  logActivity("listings", listingId, "deleted", `Listing "${listing?.name ?? ""}" deleted`, user.id);
}

export function toggleStep(stepId: string, user: User): void {
  const step = one<ListingStep>(`SELECT * FROM listing_steps WHERE id = ?`, [stepId]);
  if (!step) return;
  const nextDone = step.done ? 0 : 1;
  run(`UPDATE listing_steps SET done = ?, done_at = ? WHERE id = ?`, [
    nextDone,
    nextDone ? now() : null,
    stepId,
  ]);
  logActivity(
    "listings",
    step.listing_id,
    "checklist",
    `${nextDone ? "Checked off" : "Unchecked"} "${step.label}"`,
    user.id,
  );
  syncListingStatus(step.listing_id, user);
}

export function addStep(listingId: string, label: string, user: User): void {
  const trimmed = label.trim();
  if (!trimmed) return;
  const row = one<{ next: number }>(
    `SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM listing_steps WHERE listing_id = ?`,
    [listingId],
  );
  run(
    `INSERT INTO listing_steps (id, listing_id, label, sort, done, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
    [newId(), listingId, trimmed, row?.next ?? 0, now()],
  );
  logActivity("listings", listingId, "checklist", `Added step "${trimmed}"`, user.id);
  syncListingStatus(listingId, user);
}

/** Whatever detail somebody wants kept against one checklist item — a code,
 * a vendor name, why something is still outstanding. */
export function setStepNote(stepId: string, note: string): void {
  const trimmed = note.trim();
  run(`UPDATE listing_steps SET note = ? WHERE id = ?`, [trimmed || null, stepId]);
}

export function deleteStep(stepId: string, user: User): void {
  const step = one<ListingStep>(`SELECT * FROM listing_steps WHERE id = ?`, [stepId]);
  if (!step) return;
  // The standard villa checklist is the same for every property, so it is
  // not something to be edited away one listing at a time — only an extra
  // step somebody added by hand (which carries no section) can be removed.
  if (step.section) return;
  recordDeletion({
    kind: "checklist step",
    label: step.label,
    actorId: user.id,
    snapshot: [capture("listing_steps", "id = ?", [stepId])],
  });
  run(`DELETE FROM listing_steps WHERE id = ?`, [stepId]);
  logActivity("listings", step.listing_id, "checklist", `Removed step "${step.label}"`, user.id);
  syncListingStatus(step.listing_id, user);
}

/**
 * A listing's status follows its checklist, the same way an invoice's status
 * follows its payments — complete every step and it goes live on its own.
 * A manually paused listing is left alone until someone un-pauses it.
 */
function syncListingStatus(listingId: string, user?: User): void {
  const listing = getListing(listingId);
  if (!listing || listing.status === "paused") return;

  const { done, total } = stepProgress(listingId);
  const next = total > 0 && done === total ? "active" : "in_progress";

  if (next !== listing.status) {
    run(`UPDATE listings SET status = ?, updated_at = ? WHERE id = ?`, [next, now(), listingId]);
    logActivity(
      "listings",
      listingId,
      "status",
      next === "active" ? "Checklist complete — now active" : "Status follows the checklist — back to in progress",
      user?.id ?? null,
    );
  }
}
