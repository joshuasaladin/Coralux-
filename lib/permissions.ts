import { notFound } from "next/navigation";
import { all, one, run } from "./db";
import { atLeast, requireUser, type User } from "./auth";
import { isEnabled, isPageEnabled, NAV, navKey, PERMISSION_SECTIONS, type PermissionSection } from "./entities";
import type { Role } from "./roles";

export { PERMISSION_SECTIONS, type PermissionSection };

/** Everything a permission check needs to know about who is asking. */
export type Accessor = { id: string; role: Role };

/**
 * Access is decided per person. An admin can hand someone an exact list of
 * sections — a cleaner gets the cleaning schedule and inventory, nothing
 * else — and anyone left alone simply gets whatever their role gets. Owners
 * are deliberately outside all of it: they always have everything, so the
 * app can never be locked away from the person who runs it.
 */

/** The sections this person has been given by hand, or null if nobody has
 * customised them and their role's defaults still apply. */
export function customSectionsFor(userId: string): Set<string> | null {
  const isCustom = one<{ user_id: string }>(
    `SELECT user_id FROM user_access_custom WHERE user_id = ?`,
    [userId],
  );
  if (!isCustom) return null;
  const rows = all<{ section_key: string }>(
    `SELECT section_key FROM user_section_access WHERE user_id = ?`,
    [userId],
  );
  return new Set(rows.map((r) => r.section_key));
}

/** The role that opens a section when nobody has customised the person. */
function roleDefaultFor(key: string, fallback?: Role): Role {
  if (fallback) return fallback;
  return PERMISSION_SECTIONS.find((s) => s.key === key)?.defaultRole ?? "staff";
}

/**
 * Admin is the one section a custom list can never take away, so an admin
 * whose sections were picked for them keeps the page that could put it back.
 *
 * Everything else answers to the list — including sections with no nav entry
 * of their own, like the events behind the calendar. Letting those fall back
 * to the role would quietly hand a cleaner the whole diary.
 */
const ALWAYS_BY_ROLE = new Set(["admin"]);

/**
 * Whether this person may open a section. Owners always may; a customised
 * person gets exactly their list; everyone else falls back to their role.
 * Says nothing about whether the section is switched on — canSeeSection()
 * covers that.
 */
export function canAccessSection(user: Accessor, key: string, fallback?: Role): boolean {
  if (user.role === "owner") return true;
  const min = roleDefaultFor(key, fallback);

  if (ALWAYS_BY_ROLE.has(key)) return atLeast(user.role, min);

  const custom = customSectionsFor(user.id);
  if (custom) return custom.has(key);
  return atLeast(user.role, min);
}

/**
 * Whether a section is worth showing this person at all — switched on, and
 * open to them. For the places that link to sections from outside the nav
 * and the entity registry (the dashboard's cards and lists), so a section
 * somebody has been shut out of does not keep leaking its counts and record
 * titles through the front page.
 */
export function canSeeSection(user: Accessor, key: string): boolean {
  // the dashboard is the one section whose key is not its path
  const switchedOn = key === "overview" ? isPageEnabled("/") : isEnabled(key) || isPageEnabled(`/${key}`);
  if (!switchedOn) return false;
  return canAccessSection(user, key);
}

/**
 * Where to send somebody after they sign in, or when they land on a page they
 * cannot open. Usually the dashboard; for someone given only the cleaning
 * schedule, the cleaning schedule. null means they have been given nothing at
 * all, which the dashboard explains rather than bouncing them in a loop.
 */
export function landingPath(user: Accessor): string | null {
  if (canAccessSection(user, "overview")) return "/";
  for (const group of NAV) {
    for (const item of group.items) {
      if (item.href === "/") continue;
      if (canAccessSection(user, navKey(item), item.minRole ?? "staff")) return item.href;
    }
  }
  return null;
}

/** The section a link points at — "/tasks/abc?status=todo" -> "tasks". */
export function sectionKeyFromHref(href: string): string {
  return href.replace(/^\//, "").split(/[/?]/)[0] ?? "";
}

// ----------------------------------------------------------------- managing

/**
 * Sections where the right to change things is handed out per person rather
 * than by role. Opening Inventory lets someone read it; to add, adjust or
 * delete items a staff member has to be given it as well — a manager always
 * has it. Every other section keeps the rules it had.
 */
export const MANAGED_SECTIONS = ["inventory"] as const;

export function isManagedSection(key: string): boolean {
  return (MANAGED_SECTIONS as readonly string[]).includes(key);
}

/** The managed sections this person has been given editing in. */
export function manageGrantsFor(userId: string): Set<string> {
  const rows = all<{ section_key: string }>(
    `SELECT section_key FROM user_section_manage WHERE user_id = ?`,
    [userId],
  );
  return new Set(rows.map((r) => r.section_key));
}

/**
 * Whether this person may add, change and remove records in a section — not
 * just read it. Opening the section comes first; then managers and up always
 * may, and staff only where they have been given it.
 */
export function canManageSection(user: Accessor, key: string): boolean {
  if (!canAccessSection(user, key)) return false;
  if (atLeast(user.role, "manager")) return true;
  return isManagedSection(key) && manageGrantsFor(user.id).has(key);
}

/** Give or take away editing in one managed section. */
export function setManageGrant(userId: string, key: string, on: boolean): void {
  if (!isManagedSection(key)) return;
  if (on) {
    run(`INSERT OR IGNORE INTO user_section_manage (user_id, section_key) VALUES (?, ?)`, [userId, key]);
  } else {
    run(`DELETE FROM user_section_manage WHERE user_id = ? AND section_key = ?`, [userId, key]);
  }
}

// ------------------------------------------------------------------ editing

/** Give one person an exact set of sections, replacing whatever they had. */
export function setUserSections(userId: string, keys: string[]): void {
  const allowed = new Set(PERMISSION_SECTIONS.map((s) => s.key));
  run(`INSERT OR IGNORE INTO user_access_custom (user_id) VALUES (?)`, [userId]);
  run(`DELETE FROM user_section_access WHERE user_id = ?`, [userId]);
  for (const key of keys) {
    if (!allowed.has(key)) continue; // ignore anything not a real section
    run(
      `INSERT OR IGNORE INTO user_section_access (user_id, section_key) VALUES (?, ?)`,
      [userId, key],
    );
  }
  // editing goes with the section: tick Inventory again later and they come
  // back able to read it, not quietly able to change it
  for (const key of MANAGED_SECTIONS) {
    if (!keys.includes(key)) setManageGrant(userId, key, false);
  }
}

/** Put one person back on their role's defaults — editing grants included. */
export function clearUserSections(userId: string): void {
  run(`DELETE FROM user_section_access WHERE user_id = ?`, [userId]);
  run(`DELETE FROM user_access_custom WHERE user_id = ?`, [userId]);
  run(`DELETE FROM user_section_manage WHERE user_id = ?`, [userId]);
}

/** The sections a role gets on its own, before anyone customises a person. */
export function sectionsForRole(role: Role): string[] {
  if (role === "owner") return PERMISSION_SECTIONS.map((s) => s.key);
  return PERMISSION_SECTIONS.filter((s) => atLeast(role, s.defaultRole)).map((s) => s.key);
}

/** What each person can currently open, for rendering the admin editor in
 * one pass. `custom: false` means they are still on their role's defaults. */
export function accessOverview(
  users: { id: string; role: Role }[],
): Record<string, { custom: boolean; keys: string[]; roleDefaultKeys: string[]; manage: string[] }> {
  const out: Record<string, { custom: boolean; keys: string[]; roleDefaultKeys: string[]; manage: string[] }> = {};
  for (const user of users) {
    const custom = customSectionsFor(user.id);
    const roleDefaultKeys = sectionsForRole(user.role);
    const manage = [...manageGrantsFor(user.id)];
    out[user.id] = custom
      ? { custom: true, keys: [...custom], roleDefaultKeys, manage }
      : { custom: false, keys: roleDefaultKeys, roleDefaultKeys, manage };
  }
  return out;
}

// ------------------------------------------------------------------ guarding

/**
 * For a custom page (not backed by the entity registry, so canOpen() doesn't
 * cover it) — signs the user in, checks they may open the section, and 404s
 * if they may not. For actions that shouldn't 404, use canAccessSection()
 * directly and return an error instead.
 */
export async function requireSection(key: string, fallback?: Role): Promise<User> {
  const user = await requireUser();
  if (!canAccessSection(user, key, fallback)) notFound();
  return user;
}
