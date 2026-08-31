import { all, id as newId, now, one, run } from "./db";
import { atLeast, type Role } from "./roles";

export type Row = Record<string, any>;
/** The rows a delete was about to remove, table by table. */
export type Snapshot = { table: string; rows: Row[] }[];

/** How long a deletion stays undoable. After this it is pruned, and any file
 * blob held back for it is removed from disk for real. */
const KEEP_DAYS = 30;

/** Grab the rows a delete is about to remove, so they can be put back. */
export function capture(table: string, where: string, params: unknown[]): { table: string; rows: Row[] } {
  return { table, rows: all<Row>(`SELECT * FROM ${table} WHERE ${where}`, params) };
}

/**
 * Remember what a delete threw away.
 *
 * Called immediately *before* the delete itself, while the rows are still
 * there to be read. An empty snapshot records nothing — there is no sense
 * offering to undo something that removed nothing.
 */
export function recordDeletion(opts: {
  kind: string;
  label: string;
  snapshot: Snapshot;
  /** Upload keys to keep on disk so the file can come back. */
  blobKeys?: string[];
  actorId?: string | null;
}): void {
  const snapshot = opts.snapshot.filter((part) => part.rows.length > 0);
  if (snapshot.length === 0) return;

  run(
    `INSERT INTO deleted_items (id, kind, label, payload, blob_keys, actor_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      opts.kind,
      opts.label || "item",
      JSON.stringify(snapshot),
      opts.blobKeys?.length ? JSON.stringify(opts.blobKeys) : null,
      opts.actorId ?? null,
      now(),
    ],
  );
  prune();
}

export type Undoable = {
  id: string;
  kind: string;
  label: string;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
};

/**
 * The most recent deletion still waiting to be undone. You always get your
 * own back; a manager can also undo somebody else's, so a mistake does not
 * have to wait for whoever made it.
 */
export function latestUndoable(user: { id: string; role: Role }): Undoable | undefined {
  const sql = `SELECT d.id, d.kind, d.label, d.actor_id, d.created_at, u.name AS actor_name
                 FROM deleted_items d
                 LEFT JOIN users u ON u.id = d.actor_id
                WHERE d.undone_at IS NULL ${atLeast(user.role, "manager") ? "" : "AND d.actor_id = ?"}
                ORDER BY d.created_at DESC
                LIMIT 1`;
  return one<Undoable>(sql, atLeast(user.role, "manager") ? [] : [user.id]);
}

/** Put a deletion back. */
export function undoDeletion(
  deletionId: string,
  user: { id: string; role: Role },
): { error?: string; label?: string } {
  const entry = one<{
    id: string; label: string; payload: string; actor_id: string | null; undone_at: string | null;
  }>(`SELECT id, label, payload, actor_id, undone_at FROM deleted_items WHERE id = ?`, [deletionId]);

  if (!entry) return { error: "There is nothing left to undo." };
  if (entry.undone_at) return { error: "That has already been put back." };
  if (entry.actor_id !== user.id && !atLeast(user.role, "manager")) {
    return { error: "Only a manager can undo somebody else's deletion." };
  }

  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(entry.payload) as Snapshot;
  } catch {
    return { error: "That deletion can no longer be read." };
  }

  for (const part of snapshot) {
    for (const row of part.rows) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;
      // OR IGNORE so a half-restored deletion can be retried safely
      run(
        `INSERT OR IGNORE INTO ${part.table} (${cols.join(", ")})
         VALUES (${cols.map(() => "?").join(", ")})`,
        cols.map((c) => row[c]),
      );
    }
  }

  run(`UPDATE deleted_items SET undone_at = ? WHERE id = ?`, [now(), deletionId]);
  return { label: entry.label };
}

/** Drop entries past the keep window, and with them any blob held on disk. */
function prune(): void {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const stale = all<{ id: string; blob_keys: string | null }>(
    `SELECT id, blob_keys FROM deleted_items WHERE created_at < ?`,
    [cutoff],
  );
  if (stale.length === 0) return;

  // required lazily: files.ts records its own deletions through this module,
  // so importing it up top would tie the two into a cycle
  const { removeUpload } = require("./files") as typeof import("./files");

  for (const entry of stale) {
    if (entry.blob_keys) {
      try {
        for (const key of JSON.parse(entry.blob_keys) as string[]) {
          // best effort: the row goes either way, an orphaned upload is
          // better than a prune that stops halfway
          void removeUpload(key).catch(() => {});
        }
      } catch {
        /* unreadable list — drop the row anyway */
      }
    }
    run(`DELETE FROM deleted_items WHERE id = ?`, [entry.id]);
  }
}
