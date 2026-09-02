import crypto from "node:crypto";
import { cookies } from "next/headers";
import { all, getDb, id, now, one, run } from "./db";

import { atLeast, type Role } from "./roles";

export type { Role };
export { atLeast };

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  employee_id: string | null;
  /** Opens every property's lock. Shown to the person it belongs to. */
  door_code: string | null;
};

const COOKIE = "coralux_session";
const SESSION_DAYS = 14;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(derived, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  run(
    `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
    [token, userId, expires.toISOString(), now()],
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run(`DELETE FROM sessions WHERE token = ?`, [token]);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  getDb(); // ensures the schema exists and the demo data is seeded on first boot
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const row = one<User & { expires_at: string }>(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.employee_id, u.door_code, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    [token],
  );
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    run(`DELETE FROM sessions WHERE token = ?`, [token]);
    return null;
  }
  if (row.status !== "active") return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    employee_id: row.employee_id,
    door_code: row.door_code,
  };
}

/** Throws to the login page when there is no session. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user!;
}

export function listUsers() {
  return all<User & { created_at: string }>(
    `SELECT id, email, name, role, status, employee_id, door_code, created_at
       FROM users ORDER BY name`,
  );
}

export function createUser(input: {
  email: string;
  name: string;
  role: Role;
  password: string;
  employeeId?: string | null;
}) {
  const userId = id();
  run(
    `INSERT INTO users (id, email, name, role, password_hash, status, employee_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      userId,
      input.email.toLowerCase().trim(),
      input.name.trim(),
      input.role,
      hashPassword(input.password),
      input.employeeId ?? null,
      now(),
      now(),
    ],
  );
  return userId;
}
