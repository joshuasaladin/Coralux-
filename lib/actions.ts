"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  atLeast,
  createSession,
  createUser,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
  type Role,
} from "./auth";
import { one, run, now, logActivity } from "./db";
import { getEntity } from "./entities";
import {
  addNote,
  createRecord,
  deleteRecord,
  updateRecord,
} from "./records";
import { deleteFile, linkFile, storeUpload, unlinkFile } from "./files";
import {
  addStep,
  createListing,
  deleteListing,
  deleteStep,
  setStepNote,
  toggleStep,
  updateListing,
} from "./listings";
import { clearShift, upsertShift } from "./cleaning";
import { canAccessSection, clearUserSections, setUserSections } from "./permissions";
import { capture, latestUndoable, recordDeletion, undoDeletion } from "./undo";

export type ActionState = { error?: string; ok?: string } | null;

// ------------------------------------------------------------------- session

export async function loginAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = one<{ id: string; password_hash: string; status: string }>(
    `SELECT id, password_hash, status FROM users WHERE email = ?`,
    [email],
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "That email and password do not match." };
  }
  if (user.status !== "active") return { error: "This account has been deactivated." };

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changeOwnPasswordAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const current = String(form.get("current_password") ?? "");
  const next = String(form.get("new_password") ?? "");
  if (next.length < 8) return { error: "Use at least 8 characters." };

  const row = one<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = ?`,
    [user.id],
  );
  if (!row || !verifyPassword(current, row.password_hash)) {
    return { error: "Your current password is not correct." };
  }
  run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
    hashPassword(next),
    now(),
    user.id,
  ]);
  return { ok: "Password updated." };
}

// ------------------------------------------------------------------- records

export async function createRecordAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const entityKey = String(form.get("__entity") ?? "");
  const entity = getEntity(entityKey);
  if (!entity) return { error: "Unknown section." };

  let recordId: string;
  try {
    recordId = createRecord(entityKey, form, user);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }

  const upload = form.get("__file");
  if (upload instanceof File && upload.size > 0) {
    try {
      await storeUpload(
        upload,
        { entity: entityKey, entityId: recordId, category: entity.label },
        user,
      );
    } catch (err) {
      // The record saved; only the attachment failed.
      revalidatePath(`/${entityKey}`);
      return { error: err instanceof Error ? err.message : "File could not be attached." };
    }
  }

  revalidatePath(`/${entityKey}`);
  revalidatePath("/");
  redirect(`/${entityKey}/${recordId}`);
}

export async function updateRecordAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const entityKey = String(form.get("__entity") ?? "");
  const recordId = String(form.get("__id") ?? "");
  try {
    updateRecord(entityKey, recordId, form, user);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
  revalidatePath(`/${entityKey}`);
  revalidatePath(`/${entityKey}/${recordId}`);
  revalidatePath("/");
  redirect(`/${entityKey}/${recordId}`);
}

/** Inline status change from a list row or detail header. */
export async function setFieldAction(form: FormData) {
  const user = await requireUser();
  const entityKey = String(form.get("__entity") ?? "");
  const recordId = String(form.get("__id") ?? "");
  const field = String(form.get("__field") ?? "");
  const entity = getEntity(entityKey);
  if (!entity || !entity.fields.some((f) => f.name === field)) return;

  const patch = new FormData();
  patch.set(field, String(form.get("value") ?? ""));
  updateRecord(entityKey, recordId, patch, user);

  revalidatePath(`/${entityKey}`);
  revalidatePath(`/${entityKey}/${recordId}`);
  revalidatePath("/");
}

export async function deleteRecordAction(form: FormData) {
  const user = await requireUser();
  const entityKey = String(form.get("__entity") ?? "");
  const recordId = String(form.get("__id") ?? "");
  deleteRecord(entityKey, recordId, user);
  revalidatePath(`/${entityKey}`);
  revalidatePath("/");
  redirect(`/${entityKey}`);
}

// --------------------------------------------------------------------- notes

export async function addNoteAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const entity = String(form.get("__entity") ?? "");
  const entityId = String(form.get("__id") ?? "");
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "Write something first." };

  addNote(entity, entityId, body, user);
  revalidatePath(`/${entity}/${entityId}`);
  return { ok: "Note added." };
}

export async function togglePinNoteAction(form: FormData) {
  await requireUser();
  const noteId = String(form.get("note_id") ?? "");
  const entity = String(form.get("__entity") ?? "");
  const entityId = String(form.get("__id") ?? "");
  run(`UPDATE notes SET pinned = CASE pinned WHEN 1 THEN 0 ELSE 1 END WHERE id = ?`, [noteId]);
  revalidatePath(`/${entity}/${entityId}`);
}

export async function deleteNoteAction(form: FormData) {
  const user = await requireUser();
  const noteId = String(form.get("note_id") ?? "");
  const entity = String(form.get("__entity") ?? "");
  const entityId = String(form.get("__id") ?? "");
  const note = one<{ author_id: string; body: string }>(
    `SELECT author_id, body FROM notes WHERE id = ?`,
    [noteId],
  );
  if (note && (note.author_id === user.id || atLeast(user.role, "admin"))) {
    recordDeletion({
      kind: "note",
      label: note.body.length > 40 ? `${note.body.slice(0, 40)}…` : note.body,
      actorId: user.id,
      snapshot: [capture("notes", "id = ?", [noteId])],
    });
    run(`DELETE FROM notes WHERE id = ?`, [noteId]);
  }
  revalidatePath(`/${entity}/${entityId}`);
}

// --------------------------------------------------------------------- files

export async function uploadFileAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canAccessSection(user, "files")) return { error: "Not permitted." };
  const upload = form.get("file");
  if (!(upload instanceof File) || upload.size === 0) {
    return { error: "Choose a file to upload." };
  }
  const entity = String(form.get("__entity") ?? "") || null;
  const entityId = String(form.get("__id") ?? "") || null;

  try {
    await storeUpload(
      upload,
      {
        category: String(form.get("category") ?? "") || null,
        sensitive: form.get("sensitive") === "on",
        entity,
        entityId,
        label: String(form.get("label") ?? "") || null,
      },
      user,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  revalidatePath("/files");
  if (entity && entityId) revalidatePath(`/${entity}/${entityId}`);
  return { ok: "File uploaded." };
}

export async function attachExistingFileAction(form: FormData) {
  const user = await requireUser();
  if (!canAccessSection(user, "files")) return;
  const fileId = String(form.get("file_id") ?? "");
  const entity = String(form.get("__entity") ?? "");
  const entityId = String(form.get("__id") ?? "");
  if (fileId && entity && entityId) linkFile(fileId, entity, entityId, null);
  revalidatePath(`/${entity}/${entityId}`);
}

export async function detachFileAction(form: FormData) {
  const user = await requireUser();
  if (!canAccessSection(user, "files")) return;
  const fileId = String(form.get("file_id") ?? "");
  const entity = String(form.get("__entity") ?? "");
  const entityId = String(form.get("__id") ?? "");
  unlinkFile(fileId, entity, entityId);
  revalidatePath(`/${entity}/${entityId}`);
}

export async function deleteFileAction(form: FormData) {
  const user = await requireUser();
  if (!atLeast(user.role, "manager") || !canAccessSection(user, "files")) return;
  await deleteFile(String(form.get("file_id") ?? ""), user);
  revalidatePath("/files");
}

// --------------------------------------------------------------------- admin

export async function createUserAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!atLeast(user.role, "admin")) return { error: "Admins only." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "staff") as Role;
  const password = String(form.get("password") ?? "");

  if (!email || !name) return { error: "Name and email are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (one(`SELECT id FROM users WHERE email = ?`, [email])) {
    return { error: "There is already an account with that email." };
  }

  const created = createUser({
    email,
    name,
    role,
    password,
    employeeId: String(form.get("employee_id") ?? "") || null,
  });
  logActivity("users", created, "created", `User ${name} created`, user.id);
  revalidatePath("/admin");
  return { ok: `${name} can now sign in.` };
}

export async function updateUserAction(form: FormData) {
  const user = await requireUser();
  if (!atLeast(user.role, "admin")) return;

  const targetId = String(form.get("user_id") ?? "");
  const role = String(form.get("role") ?? "") as Role;
  const status = String(form.get("status") ?? "");

  // An admin must not lock themselves out of their own account.
  if (targetId === user.id && (role !== user.role || status !== "active")) return;

  run(`UPDATE users SET role = ?, status = ?, updated_at = ? WHERE id = ?`, [
    role,
    status,
    now(),
    targetId,
  ]);
  revalidatePath("/admin");
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!atLeast(user.role, "admin")) return { error: "Admins only." };
  const targetId = String(form.get("user_id") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
    hashPassword(password),
    now(),
    targetId,
  ]);
  run(`DELETE FROM sessions WHERE user_id = ?`, [targetId]);
  revalidatePath("/admin");
  return { ok: "Password reset. They will need to sign in again." };
}

export async function deleteUserAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!atLeast(user.role, "admin")) return { error: "Admins only." };

  const targetId = String(form.get("user_id") ?? "");
  if (targetId === user.id) return { error: "You cannot delete your own account." };

  const target = one<{ name: string; role: Role }>(`SELECT name, role FROM users WHERE id = ?`, [
    targetId,
  ]);
  if (!target) return { error: "That account no longer exists." };

  if (target.role === "owner") {
    const owners = one<{ c: number }>(`SELECT COUNT(*) AS c FROM users WHERE role = 'owner'`);
    if ((owners?.c ?? 0) <= 1) return { error: "There must be at least one owner account." };
  }

  // sessions are deliberately left out: putting an account back should not
  // put somebody's old signed-in browser back with it
  recordDeletion({
    kind: "account",
    label: target.name,
    actorId: user.id,
    snapshot: [
      capture("users", "id = ?", [targetId]),
      capture("user_section_access", "user_id = ?", [targetId]),
      capture("user_access_custom", "user_id = ?", [targetId]),
    ],
  });

  run(`DELETE FROM sessions WHERE user_id = ?`, [targetId]);
  run(`DELETE FROM users WHERE id = ?`, [targetId]);
  logActivity("users", targetId, "deleted", `Removed ${target.name}'s account`, user.id);
  revalidatePath("/admin");
  return { ok: `${target.name}'s account has been deleted.` };
}

export async function saveSettingAction(form: FormData) {
  const user = await requireUser();
  if (!atLeast(user.role, "admin")) return;
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(form.get("key") ?? ""), String(form.get("value") ?? "")],
  );
  revalidatePath("/admin");
}

/**
 * Which sections one person may open. Called directly from the admin
 * editor's client component — the same RPC pattern as the cleaning grid.
 * Passing null puts them back on their role's defaults.
 */
export async function updateUserAccessAction(
  targetId: string,
  sectionKeys: string[] | null,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!atLeast(user.role, "admin")) return { error: "Admins only." };

  const target = one<{ role: Role }>(`SELECT role FROM users WHERE id = ?`, [targetId]);
  if (!target) return { error: "That account no longer exists." };

  // Two people are deliberately out of reach: yourself, so an admin cannot
  // shut themselves out of the settings that would undo it, and owners, who
  // always keep the run of the place.
  if (targetId === user.id) return { error: "You cannot change your own access." };
  if (target.role === "owner") return { error: "Owners always have full access." };

  if (sectionKeys === null) clearUserSections(targetId);
  else setUserSections(targetId, sectionKeys);

  logActivity("users", targetId, "access", "Section access updated", user.id);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return {};
}

// -------------------------------------------------------------- listings

export async function createListingAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canAccessSection(user, "listings")) return { error: "Not permitted." };
  let listingId: string;
  try {
    listingId = createListing(form, user);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
  revalidatePath("/listings");
  redirect(`/listings/${listingId}`);
}

export async function updateListingAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canAccessSection(user, "listings")) return { error: "Not permitted." };
  const listingId = String(form.get("__id") ?? "");
  try {
    updateListing(listingId, form, user);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  redirect(`/listings/${listingId}`);
}

export async function deleteListingAction(form: FormData) {
  const user = await requireUser();
  if (!atLeast(user.role, "manager") || !canAccessSection(user, "listings")) return;
  const listingId = String(form.get("__id") ?? "");
  deleteListing(listingId, user);
  revalidatePath("/listings");
  redirect("/listings");
}

export async function toggleListingStepAction(form: FormData) {
  const user = await requireUser();
  if (!canAccessSection(user, "listings")) return;
  const listingId = String(form.get("__id") ?? "");
  const stepId = String(form.get("step_id") ?? "");
  toggleStep(stepId, user);
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
}

export async function addListingStepAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canAccessSection(user, "listings")) return { error: "Not permitted." };
  const listingId = String(form.get("__id") ?? "");
  const label = String(form.get("label") ?? "");
  if (!label.trim()) return { error: "Write the step first." };
  addStep(listingId, label, user);
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { ok: "Step added." };
}

/** A note kept against one checklist item. Called straight from the
 * checklist's client component as you type, so there is nothing to press. */
export async function setListingStepNoteAction(
  listingId: string,
  stepId: string,
  note: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!canAccessSection(user, "listings")) return { error: "Not permitted." };
  setStepNote(stepId, note);
  revalidatePath(`/listings/${listingId}`);
  return {};
}

export async function deleteListingStepAction(form: FormData) {
  const user = await requireUser();
  if (!canAccessSection(user, "listings")) return;
  const listingId = String(form.get("__id") ?? "");
  const stepId = String(form.get("step_id") ?? "");
  deleteStep(stepId, user);
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
}

// ------------------------------------------------------------ cleaning grid
//
// Called directly from the grid's client component (not through a <form>) —
// a plain RPC to a "use server" function is the natural fit for a table of
// many small editable cells, where a <form>-per-cell would mean carrying a
// hidden __week_start/__day/__slot input into every one of them.

export async function saveCleaningShiftAction(
  weekStart: string,
  dayOfWeek: number,
  timeSlot: string,
  listing: string,
  notes: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!canAccessSection(user, "cleaning")) return { error: "Not permitted." };
  try {
    upsertShift(weekStart, dayOfWeek, timeSlot, listing, notes);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
  revalidatePath("/cleaning");
  return {};
}

export async function clearCleaningShiftAction(
  weekStart: string,
  dayOfWeek: number,
  timeSlot: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!canAccessSection(user, "cleaning")) return { error: "Not permitted." };
  const cell = "week_start = ? AND day_of_week = ? AND time_slot = ?";
  const shift = one<{ listing: string | null }>(
    `SELECT listing FROM cleaning_shifts WHERE ${cell}`,
    [weekStart, dayOfWeek, timeSlot],
  );
  recordDeletion({
    kind: "cleaning shift",
    label: shift?.listing || `${timeSlot} shift`,
    actorId: user.id,
    snapshot: [capture("cleaning_shifts", cell, [weekStart, dayOfWeek, timeSlot])],
  });
  clearShift(weekStart, dayOfWeek, timeSlot);
  revalidatePath("/cleaning");
  return {};
}

// ---------------------------------------------------------------------- undo

/** What the Undo button in the header should currently offer, if anything. */
export async function pendingUndo() {
  const user = await requireUser();
  const entry = latestUndoable(user);
  if (!entry) return null;
  return {
    id: entry.id,
    kind: entry.kind,
    label: entry.label,
    byOther: entry.actor_id !== user.id,
    actorName: entry.actor_name,
  };
}

/** Put the most recent deletion back. */
export async function undoDeleteAction(deletionId: string): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const result = undoDeletion(deletionId, user);
  if (result.error) return { error: result.error };

  // a restore can land anywhere, so refresh the whole tree rather than
  // guess which list the row belongs back in
  revalidatePath("/", "layout");
  return { ok: `${result.label} is back.` };
}
