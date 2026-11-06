import { all, id as newId, logActivity, now, one, run } from "./db";
import type { User } from "./auth";
import { atLeast } from "./roles";
import { capture, recordDeletion } from "./undo";

export type Property = Record<string, any>;
export type PropertyFact = Record<string, any>;

/**
 * The properties under management, and everything anyone needs to work at
 * one: how to get in, what the Wi-Fi is, who owns it, and whatever else is
 * worth writing down.
 *
 * Two audiences read this. A cleaner needs the address, the door and lockbox
 * codes and the Wi-Fi, and nothing else; whoever runs the place needs all of
 * it. Rather than guess, the split is explicit — see publicView() below, and
 * the staff_visible flag on each custom fact.
 */

/** The fields anybody who can open a property may see. */
const OPEN_FIELDS = [
  "id", "name", "address", "status",
  "door_code", "lockbox_code", "wifi_name", "wifi_password",
  "parking", "access_notes",
] as const;

/** Whether this person sees the owner's details and the private notes. */
export function seesEverything(user: { role: string }): boolean {
  return atLeast(user.role as never, "manager");
}

export function listProperties(): Property[] {
  return all<Property>(
    `SELECT * FROM properties ORDER BY status = 'inactive', name ASC`,
  );
}

export function getProperty(id: string): Property | undefined {
  return one<Property>(`SELECT * FROM properties WHERE id = ?`, [id]);
}

/** Strip a property down to what a cleaner should see. */
export function publicView(property: Property): Property {
  const out: Property = {};
  for (const key of OPEN_FIELDS) out[key] = property[key];
  return out;
}

// -------------------------------------------------------------------- facts

export function listFacts(propertyId: string, staffOnly = false): PropertyFact[] {
  return all<PropertyFact>(
    `SELECT * FROM property_facts
      WHERE property_id = ? ${staffOnly ? "AND staff_visible = 1" : ""}
      ORDER BY sort ASC, created_at ASC`,
    [propertyId],
  );
}

export function addFact(propertyId: string, label: string, user: User): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const row = one<{ next: number }>(
    `SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM property_facts WHERE property_id = ?`,
    [propertyId],
  );
  const factId = newId();
  run(
    `INSERT INTO property_facts (id, property_id, label, staff_visible, sort, created_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [factId, propertyId, trimmed, row?.next ?? 0, now()],
  );
  logActivity("properties", propertyId, "info", `Added "${trimmed}"`, user.id);
  return factId;
}

export function setFact(factId: string, patch: { label?: string; value?: string }): void {
  if (patch.label !== undefined) {
    run(`UPDATE property_facts SET label = ? WHERE id = ?`, [patch.label.trim() || "Untitled", factId]);
  }
  if (patch.value !== undefined) {
    run(`UPDATE property_facts SET value = ? WHERE id = ?`, [patch.value.trim() || null, factId]);
  }
}

export function setFactVisibility(factId: string, visible: boolean): void {
  run(`UPDATE property_facts SET staff_visible = ? WHERE id = ?`, [visible ? 1 : 0, factId]);
}

export function deleteFact(factId: string, user: User): void {
  const fact = one<PropertyFact>(`SELECT * FROM property_facts WHERE id = ?`, [factId]);
  if (!fact) return;
  recordDeletion({
    kind: "property detail",
    label: fact.label,
    actorId: user.id,
    snapshot: [capture("property_facts", "id = ?", [factId])],
  });
  run(`DELETE FROM property_facts WHERE id = ?`, [factId]);
  logActivity("properties", fact.property_id, "info", `Removed "${fact.label}"`, user.id);
}

// ------------------------------------------------------------------ writing

function readFields(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? "").trim() || null;
  return {
    name: String(form.get("name") ?? "").trim(),
    address: text("address"),
    status: String(form.get("status") ?? "active"),
    door_code: text("door_code"),
    lockbox_code: text("lockbox_code"),
    alarm_code: text("alarm_code"),
    wifi_name: text("wifi_name"),
    wifi_password: text("wifi_password"),
    parking: text("parking"),
    access_notes: text("access_notes"),
    owner_name: text("owner_name"),
    owner_email: text("owner_email"),
    owner_phone: text("owner_phone"),
    notes: text("notes"),
  };
}

const COLUMNS = [
  "name", "address", "status", "door_code", "lockbox_code", "alarm_code",
  "wifi_name", "wifi_password", "parking", "access_notes",
  "owner_name", "owner_email", "owner_phone", "notes",
] as const;

export function createProperty(form: FormData, user: User): string {
  const fields = readFields(form);
  if (!fields.name) throw new Error("Give the property a name.");

  const propertyId = newId();
  run(
    `INSERT INTO properties (id, ${COLUMNS.join(", ")}, created_at, updated_at)
     VALUES (?, ${COLUMNS.map(() => "?").join(", ")}, ?, ?)`,
    [propertyId, ...COLUMNS.map((c) => fields[c]), now(), now()],
  );
  logActivity("properties", propertyId, "created", `Property "${fields.name}" added`, user.id);
  return propertyId;
}

export function updateProperty(propertyId: string, form: FormData, user: User): void {
  const fields = readFields(form);
  if (!fields.name) throw new Error("Give the property a name.");

  run(
    `UPDATE properties SET ${COLUMNS.map((c) => `${c} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
    [...COLUMNS.map((c) => fields[c]), now(), propertyId],
  );
  logActivity("properties", propertyId, "updated", "Property details updated", user.id);
}

export function deleteProperty(propertyId: string, user: User): void {
  const property = getProperty(propertyId);

  recordDeletion({
    kind: "property",
    label: property?.name ?? "Property",
    actorId: user.id,
    snapshot: [
      capture("properties", "id = ?", [propertyId]),
      capture("property_facts", "property_id = ?", [propertyId]),
      capture("notes", "entity = 'properties' AND entity_id = ?", [propertyId]),
      capture("file_links", "entity = 'properties' AND entity_id = ?", [propertyId]),
    ],
  });

  run(`DELETE FROM properties WHERE id = ?`, [propertyId]);
  run(`DELETE FROM notes WHERE entity = 'properties' AND entity_id = ?`, [propertyId]);
  run(`DELETE FROM file_links WHERE entity = 'properties' AND entity_id = ?`, [propertyId]);
  logActivity("properties", propertyId, "deleted", `Property "${property?.name ?? ""}" deleted`, user.id);
}

export const PROPERTY_STATUS = [
  { value: "active", label: "Active", tone: "good" as const },
  { value: "inactive", label: "Inactive", tone: "muted" as const },
];
