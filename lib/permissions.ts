import { notFound } from "next/navigation";
import { all, one, run } from "./db";
import { atLeast, requireUser, type User } from "./auth";
import { isEnabled, isPageEnabled, PERMISSION_SECTIONS, type PermissionSection } from "./entities";
import type { Role } from "./roles";

export { PERMISSION_SECTIONS, type PermissionSection };

/** All current role overrides, keyed by section. For rendering the whole
 * admin editor in one query — day-to-day checks use effectiveMinRole(). */
export function getRoleOverrides(): Record<string, Role> {
  const rows = all<{ section_key: string; min_role: Role }>(
    `SELECT section_key, min_role FROM role_overrides`,
  );
  const map: Record<string, Role> = {};
  for (const row of rows) map[row.section_key] = row.min_role;
  return map;
}

/** The role actually required to open a section right now — an admin's
 * override if they've set one, otherwise the code default. */
export function effectiveMinRole(key: string, fallback: Role = "staff"): Role {
  const row = one<{ min_role: Role }>(`SELECT min_role FROM role_overrides WHERE section_key = ?`, [key]);
  return row?.min_role ?? fallback;
}

/** Whether a role can open a section right now, given any override. For
 * server actions behind a custom page, where a failed check should return
 * an error instead of 404ing (that's requireSection's job). */
export function canAccessSection(role: Role, key: string, fallback: Role = "staff"): boolean {
  return atLeast(role, effectiveMinRole(key, fallback));
}

/**
 * Whether a section is worth showing this user at all — switched on, and
 * open to their role. Looks the code default up itself, for the places that
 * link to sections from outside the nav and the entity registry (the
 * dashboard's cards and lists), so a section an admin has locked down does
 * not keep leaking its counts and record titles through the front page.
 */
export function canSeeSection(role: Role, key: string): boolean {
  if (!isEnabled(key) && !isPageEnabled(`/${key}`)) return false;
  const section = PERMISSION_SECTIONS.find((s) => s.key === key);
  return atLeast(role, effectiveMinRole(key, section?.defaultRole ?? "staff"));
}

/** The section a link points at — "/tasks/abc?status=todo" -> "tasks". */
export function sectionKeyFromHref(href: string): string {
  return href.replace(/^\//, "").split(/[/?]/)[0] ?? "";
}

export function setRoleOverride(key: string, role: Role): void {
  run(
    `INSERT INTO role_overrides (section_key, min_role) VALUES (?, ?)
     ON CONFLICT(section_key) DO UPDATE SET min_role = excluded.min_role`,
    [key, role],
  );
}

/**
 * For a custom page (not backed by the entity registry, so canOpen() doesn't
 * cover it) — signs the user in, checks the section's effective role, and
 * 404s if they don't have it. For actions that shouldn't 404, use
 * effectiveMinRole() + atLeast() directly and return an error instead.
 */
export async function requireSection(key: string, fallback: Role = "staff"): Promise<User> {
  const user = await requireUser();
  if (!atLeast(user.role, effectiveMinRole(key, fallback))) notFound();
  return user;
}
