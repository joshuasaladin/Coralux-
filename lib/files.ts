import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, all, id as newId, logActivity, now, one, run } from "./db";
import type { User } from "./auth";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Files are stored on disk (a Render persistent disk in production) and only
 * *referenced* from the database, so the database stays small and fast.
 * Swapping in S3 or Supabase Storage means reimplementing put/read/remove
 * below — nothing else in the app touches the filesystem.
 */
async function put(key: string, bytes: Buffer): Promise<void> {
  const target = path.join(UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}

export async function readStored(key: string): Promise<Buffer> {
  const target = path.join(UPLOAD_DIR, key);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    throw new Error("Invalid storage key");
  }
  return fs.readFile(resolved);
}

async function remove(key: string): Promise<void> {
  try {
    await fs.unlink(path.join(UPLOAD_DIR, key));
  } catch {
    /* already gone */
  }
}

function safeName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
}

export async function storeUpload(
  file: File,
  meta: {
    category?: string | null;
    sensitive?: boolean;
    entity?: string | null;
    entityId?: string | null;
    label?: string | null;
  },
  user: User,
): Promise<string> {
  if (file.size === 0) throw new Error("That file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Files must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }

  const fileId = newId();
  const key = `${fileId}-${safeName(file.name)}`;
  await put(key, Buffer.from(await file.arrayBuffer()));

  run(
    `INSERT INTO files (id, name, category, mime_type, size_bytes, storage_key, sensitive, uploaded_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fileId,
      safeName(file.name),
      meta.category ?? null,
      file.type || "application/octet-stream",
      file.size,
      key,
      meta.sensitive ? 1 : 0,
      user.id,
      now(),
      now(),
    ],
  );

  if (meta.entity && meta.entityId) {
    linkFile(fileId, meta.entity, meta.entityId, meta.label ?? null);
    logActivity(meta.entity, meta.entityId, "file", `Attached ${safeName(file.name)}`, user.id);
  }
  return fileId;
}

export function linkFile(fileId: string, entity: string, entityId: string, label: string | null) {
  run(
    `INSERT OR IGNORE INTO file_links (file_id, entity, entity_id, label) VALUES (?, ?, ?, ?)`,
    [fileId, entity, entityId, label],
  );
}

export function unlinkFile(fileId: string, entity: string, entityId: string) {
  run(`DELETE FROM file_links WHERE file_id = ? AND entity = ? AND entity_id = ?`, [
    fileId,
    entity,
    entityId,
  ]);
}

export function getFile(fileId: string) {
  return one<Record<string, any>>(`SELECT * FROM files WHERE id = ?`, [fileId]);
}

export function listAllFiles(opts: { search?: string; category?: string } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.search) {
    where.push(`(f.name LIKE ? OR COALESCE(f.category, '') LIKE ?)`);
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  if (opts.category) {
    where.push(`f.category = ?`);
    params.push(opts.category);
  }
  return all<Record<string, any>>(
    `SELECT f.*, u.name AS uploader,
            (SELECT COUNT(*) FROM file_links l WHERE l.file_id = f.id) AS link_count
       FROM files f LEFT JOIN users u ON u.id = f.uploaded_by
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY f.created_at DESC`,
    params,
  );
}

export function fileLinks(fileId: string) {
  return all<Record<string, any>>(
    `SELECT entity, entity_id, label FROM file_links WHERE file_id = ?`,
    [fileId],
  );
}

export async function deleteFile(fileId: string, user: User) {
  const file = getFile(fileId);
  if (!file) return;
  await remove(file.storage_key);
  run(`DELETE FROM files WHERE id = ?`, [fileId]);
  logActivity("files", fileId, "deleted", `Deleted ${file.name}`, user.id);
}
