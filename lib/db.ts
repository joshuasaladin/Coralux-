import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Storage locations. On Render these point at the mounted persistent disk
 * (see render.yaml), locally they default to ./data which is git-ignored.
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.join(DATA_DIR, "coralux.db");

declare global {
  // eslint-disable-next-line no-var
  var __coraluxDb: Database.Database | undefined;
}

function connect(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(
    path.join(process.cwd(), "db", "schema.sql"),
    "utf8",
  );
  db.exec(schema);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__coraluxDb) {
    global.__coraluxDb = connect();
    // seed() is imported lazily to avoid a circular import at module load
    const { seedIfEmpty } = require("./seed") as typeof import("./seed");
    seedIfEmpty(global.__coraluxDb);
  }
  return global.__coraluxDb;
}

export function id(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

/** Typed-ish query helpers. */
export function all<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

export function one<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T | undefined {
  return getDb().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, params: unknown[] = []) {
  return getDb()
    .prepare(sql)
    .run(...(params as never[]));
}

export function count(sql: string, params: unknown[] = []): number {
  const row = one<{ c: number }>(sql, params);
  return row ? Number(row.c) : 0;
}

export function logActivity(
  entity: string,
  entityId: string,
  action: string,
  summary: string,
  actorId?: string | null,
) {
  run(
    `INSERT INTO activity (id, entity, entity_id, action, summary, actor_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id(), entity, entityId, action, summary, actorId ?? null, now()],
  );
}
