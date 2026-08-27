import { all, id as newId, logActivity, now, one, run } from "./db";
import {
  ENTITIES,
  type Entity,
  type EntityKey,
  type Field,
  getEntity,
  isEnabled,
} from "./entities";
import { atLeast, type Role, type User } from "./auth";

export type Row = Record<string, any>;

/** Columns that are never writable from a form. */
const RESERVED = new Set(["id", "created_at", "updated_at"]);

function writableFields(entity: Entity, role: Role): Field[] {
  return visibleFields(entity, role).filter((f) => !RESERVED.has(f.name));
}

export function visibleFields(entity: Entity, role: Role): Field[] {
  return entity.fields.filter((f) => {
    if (f.restricted && !atLeast(role, f.restricted)) return false;
    // a link to a section that is not switched on would only lead nowhere
    if (f.type === "ref" && f.ref && !isEnabled(f.ref)) return false;
    return true;
  });
}

export function canOpen(entity: Entity, role: Role): boolean {
  if (!isEnabled(entity.key)) return false;
  return !entity.minRole || atLeast(role, entity.minRole);
}

/** Coerce a submitted form value into what SQLite should store. */
function coerce(field: Field, raw: FormDataEntryValue | null): unknown {
  if (field.type === "bool") return raw ? 1 : 0;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "") return null;
  if (field.type === "number" || field.type === "money") {
    const n = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return value;
}

// ------------------------------------------------------------------ reading

export function listRecords(
  entity: Entity,
  opts: {
    search?: string;
    filters?: Record<string, string>;
    limit?: number;
    orderBy?: string;
  } = {},
): Row[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts.search && entity.searchFields.length) {
    const clause = entity.searchFields
      .map((f) => `COALESCE(${f}, '') LIKE ?`)
      .join(" OR ");
    where.push(`(${clause})`);
    entity.searchFields.forEach(() => params.push(`%${opts.search}%`));
  }

  for (const [key, value] of Object.entries(opts.filters ?? {})) {
    if (!value) continue;
    if (!entity.fields.some((f) => f.name === key)) continue;
    where.push(`${key} = ?`);
    params.push(value);
  }

  const sql = `SELECT * FROM ${entity.table}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${opts.orderBy ?? entity.defaultSort}
    ${opts.limit ? `LIMIT ${Number(opts.limit)}` : ""}`;

  return all<Row>(sql, params);
}

export function getRecord(entity: Entity, recordId: string): Row | undefined {
  return one<Row>(`SELECT * FROM ${entity.table} WHERE id = ?`, [recordId]);
}

export function relatedRecords(
  related: { entity: EntityKey; fk: string },
  recordId: string,
): Row[] {
  const child = ENTITIES[related.entity];
  return all<Row>(
    `SELECT * FROM ${child.table} WHERE ${related.fk} = ? ORDER BY ${child.defaultSort}`,
    [recordId],
  );
}

/** Strip fields the viewer is not allowed to see. */
export function redact(entity: Entity, row: Row | undefined, role: Role): Row | undefined {
  if (!row) return row;
  const out: Row = { ...row };
  for (const field of entity.fields) {
    if (field.restricted && !atLeast(role, field.restricted)) delete out[field.name];
  }
  return out;
}

// -------------------------------------------------------- reference lookups

const TITLE_SQL: Record<EntityKey, string> = Object.fromEntries(
  (Object.keys(ENTITIES) as EntityKey[]).map((k) => {
    const e = ENTITIES[k];
    if (k === "invoices") return [k, `COALESCE('#' || invoice_number, id)`];
    if (k === "payments") return [k, `COALESCE(reference, 'Payment')`];
    if (k === "timeoff") return [k, `type`];
    return [k, `COALESCE(${e.titleField}, id)`];
  }),
) as Record<EntityKey, string>;

/** id -> display label for one referenced entity. */
export function refMap(key: EntityKey): Map<string, string> {
  const e = ENTITIES[key];
  const rows = all<{ id: string; label: string }>(
    `SELECT id, ${TITLE_SQL[key]} AS label FROM ${e.table}`,
  );
  return new Map(rows.map((r) => [r.id, r.label]));
}

export function refOptions(key: EntityKey): { value: string; label: string }[] {
  const e = ENTITIES[key];
  return all<{ id: string; label: string }>(
    `SELECT id, ${TITLE_SQL[key]} AS label FROM ${e.table} ORDER BY label`,
  ).map((r) => ({ value: r.id, label: r.label }));
}

/** Build a lookup of every ref entity a given entity points at. */
export function refMapsFor(entity: Entity): Partial<Record<EntityKey, Map<string, string>>> {
  const maps: Partial<Record<EntityKey, Map<string, string>>> = {};
  for (const f of entity.fields) {
    if (f.type === "ref" && f.ref && !maps[f.ref]) maps[f.ref] = refMap(f.ref);
  }
  return maps;
}

export function recordTitle(entity: Entity, row: Row): string {
  if (entity.key === "invoices") return row.invoice_number ? `#${row.invoice_number}` : "Invoice";
  if (entity.key === "payments") return row.reference ? `Payment ${row.reference}` : "Payment";
  if (entity.key === "timeoff") return `${row.type ?? "Leave"}`;
  return String(row[entity.titleField] ?? "Untitled");
}

// ------------------------------------------------------------------ writing

export function createRecord(
  entityKey: string,
  form: FormData,
  user: User,
): string {
  const entity = getEntity(entityKey);
  if (!entity) throw new Error(`Unknown section: ${entityKey}`);
  if (!canOpen(entity, user.role)) throw new Error("Not permitted");

  const fields = writableFields(entity, user.role);
  const data: Row = { id: newId(), created_at: now(), updated_at: now() };

  for (const f of fields) {
    if (f.type === "bool") data[f.name] = form.get(f.name) ? 1 : 0;
    else if (form.has(f.name)) data[f.name] = coerce(f, form.get(f.name));
  }

  for (const f of fields) {
    if (f.required && (data[f.name] === null || data[f.name] === undefined)) {
      throw new Error(`${f.label} is required`);
    }
  }

  const cols = Object.keys(data);
  run(
    `INSERT INTO ${entity.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    cols.map((c) => data[c]),
  );

  logActivity(entity.key, data.id, "created", `${entity.singular} created`, user.id);
  afterWrite(entity, data.id, user);
  return data.id;
}

export function updateRecord(
  entityKey: string,
  recordId: string,
  form: FormData,
  user: User,
): void {
  const entity = getEntity(entityKey);
  if (!entity) throw new Error(`Unknown section: ${entityKey}`);
  if (!canOpen(entity, user.role)) throw new Error("Not permitted");

  const before = getRecord(entity, recordId);
  if (!before) throw new Error("Record not found");

  const fields = writableFields(entity, user.role);
  const sets: string[] = [];
  const params: unknown[] = [];
  const changes: string[] = [];

  for (const f of fields) {
    let value: unknown;
    if (f.type === "bool") value = form.get(f.name) ? 1 : 0;
    else if (form.has(f.name)) value = coerce(f, form.get(f.name));
    else continue;

    if (String(before[f.name] ?? "") !== String(value ?? "")) {
      changes.push(f.label);
    }
    sets.push(`${f.name} = ?`);
    params.push(value);
  }

  if (entity.key === "tasks" && form.has("status")) {
    sets.push("completed_at = ?");
    params.push(form.get("status") === "done" ? now() : null);
  }

  if (!sets.length) return;
  sets.push("updated_at = ?");
  params.push(now(), recordId);

  run(`UPDATE ${entity.table} SET ${sets.join(", ")} WHERE id = ?`, params);

  if (changes.length) {
    logActivity(
      entity.key,
      recordId,
      "updated",
      `Updated ${changes.slice(0, 4).join(", ")}${changes.length > 4 ? "…" : ""}`,
      user.id,
    );
  }
  afterWrite(entity, recordId, user);
}

export function deleteRecord(entityKey: string, recordId: string, user: User) {
  const entity = getEntity(entityKey);
  if (!entity) throw new Error(`Unknown section: ${entityKey}`);
  if (!atLeast(user.role, "manager")) throw new Error("Not permitted");
  run(`DELETE FROM ${entity.table} WHERE id = ?`, [recordId]);
  run(`DELETE FROM notes WHERE entity = ? AND entity_id = ?`, [entity.key, recordId]);
  run(`DELETE FROM file_links WHERE entity = ? AND entity_id = ?`, [entity.key, recordId]);
  logActivity(entity.key, recordId, "deleted", `${entity.singular} deleted`, user.id);
}

/**
 * Cross-record consistency. Invoice status follows its payments, so marking a
 * payment does not leave the invoice lying about itself.
 */
function afterWrite(entity: Entity, recordId: string, user: User) {
  if (entity.key === "payments") {
    const payment = one<Row>(`SELECT invoice_id FROM payments WHERE id = ?`, [recordId]);
    if (payment?.invoice_id) syncInvoiceStatus(payment.invoice_id, user);
  }
  if (entity.key === "invoices") syncInvoiceStatus(recordId, user);
}

export function syncInvoiceStatus(invoiceId: string, user?: User) {
  const invoice = one<Row>(`SELECT * FROM invoices WHERE id = ?`, [invoiceId]);
  if (!invoice) return;
  if (invoice.status === "void" || invoice.status === "disputed") return;

  const paid = one<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = ?`,
    [invoiceId],
  );
  const total = paid?.total ?? 0;
  const next = total <= 0 ? "unpaid" : total + 0.005 >= invoice.amount ? "paid" : "partial";

  if (next !== invoice.status) {
    run(`UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?`, [next, now(), invoiceId]);
    logActivity(
      "invoices",
      invoiceId,
      "status",
      `Status follows payments — now ${next}`,
      user?.id ?? null,
    );
  }
}

// ------------------------------------------------------------ notes & files

export function listNotes(entity: string, entityId: string) {
  return all<Row>(
    `SELECT n.*, u.name AS author_name
       FROM notes n LEFT JOIN users u ON u.id = n.author_id
      WHERE n.entity = ? AND n.entity_id = ?
      ORDER BY n.pinned DESC, n.created_at DESC`,
    [entity, entityId],
  );
}

export function addNote(entity: string, entityId: string, body: string, user: User) {
  const noteId = newId();
  run(
    `INSERT INTO notes (id, entity, entity_id, body, author_id, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [noteId, entity, entityId, body, user.id, now(), now()],
  );
  logActivity(entity, entityId, "note", "Note added", user.id);
  return noteId;
}

export function listFilesFor(entity: string, entityId: string) {
  return all<Row>(
    `SELECT f.* FROM files f
       JOIN file_links l ON l.file_id = f.id
      WHERE l.entity = ? AND l.entity_id = ?
      ORDER BY f.created_at DESC`,
    [entity, entityId],
  );
}

export function listActivity(entity: string, entityId: string, limit = 20) {
  return all<Row>(
    `SELECT a.*, u.name AS actor_name
       FROM activity a LEFT JOIN users u ON u.id = a.actor_id
      WHERE a.entity = ? AND a.entity_id = ?
      ORDER BY a.created_at DESC LIMIT ?`,
    [entity, entityId, limit],
  );
}
