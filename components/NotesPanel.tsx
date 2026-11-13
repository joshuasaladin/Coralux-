"use client";

import { useActionState, useRef, useState } from "react";
import Icon from "./Icon";
import SubmitButton from "./SubmitButton";
import {
  addNoteAction,
  deleteNoteAction,
  setNoteSharedAction,
  togglePinNoteAction,
  type ActionState,
} from "@/lib/actions";
import { timeAgo } from "@/lib/format";

/**
 * Notes against a record.
 *
 * Pass `sharing` where staff can read the notes too (Properties). Then a
 * manager chooses per note whether staff see it, and can change their mind;
 * staff only ever see shared notes, and whatever they write is shared, with
 * no choice offered. Pinning stays a manager's call there. The server
 * enforces the same rules in the note actions. Without `sharing`, the panel
 * behaves as it always has.
 */
export default function NotesPanel({
  entity,
  entityId,
  notes,
  sharing,
}: {
  entity: string;
  entityId: string;
  notes: Record<string, any>[];
  sharing?: { isManager: boolean; currentUserId: string; canDeleteAny: boolean };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(addNoteAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  // a new note starts private, as every note was before staff could read them
  const [shareNew, setShareNew] = useState(false);
  const managerSharing = Boolean(sharing?.isManager);
  const staffSharing = Boolean(sharing && !sharing.isManager);

  return (
    <section className="panel">
      <header className="px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
        <h2 className="text-sm font-semibold">Notes</h2>
      </header>

      <div className="p-4">
        <form
          ref={formRef}
          action={async (fd) => {
            await formAction(fd);
            formRef.current?.reset();
          }}
          className="mb-4"
        >
          <input type="hidden" name="__entity" value={entity} />
          <input type="hidden" name="__id" value={entityId} />
          {managerSharing && <input type="hidden" name="shared" value={shareNew ? "1" : "0"} />}
          <textarea
            name="body"
            className="textarea"
            rows={2}
            placeholder="Something worth remembering next time…"
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <SubmitButton className="btn btn-sm btn-primary" pendingLabel="Adding…">
              Add note
            </SubmitButton>
            {managerSharing && (
              <SharedChip
                shared={shareNew}
                label="this new note"
                onClick={() => setShareNew((v) => !v)}
              />
            )}
            {state?.error && <span className="text-xs" style={{ color: "var(--bad-fg)" }}>{state.error}</span>}
          </div>
          {staffSharing && (
            <p className="text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>
              Notes you add are shared with the team.
            </p>
          )}
        </form>

        {notes.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            No notes yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg p-3"
                style={{
                  background: note.pinned ? "var(--warn-bg)" : "var(--panel-2)",
                  border: "1px solid var(--line)",
                }}
              >
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--ink)" }}>
                  {note.body}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
                  <span>{note.author_name ?? "Someone"}</span>
                  <span>·</span>
                  <span>{timeAgo(note.created_at)}</span>
                  <span className="ml-auto" />
                  {managerSharing && (
                    <form action={setNoteSharedAction}>
                      <input type="hidden" name="note_id" value={note.id} />
                      <input type="hidden" name="__id" value={entityId} />
                      <input type="hidden" name="shared" value={note.shared ? "0" : "1"} />
                      <SharedChip shared={Boolean(note.shared)} label="this note" submit />
                    </form>
                  )}
                  {!staffSharing && (
                    <form action={togglePinNoteAction}>
                      <input type="hidden" name="note_id" value={note.id} />
                      <input type="hidden" name="__entity" value={entity} />
                      <input type="hidden" name="__id" value={entityId} />
                      <button className="btn btn-ghost btn-sm" title={note.pinned ? "Unpin" : "Pin"}>
                        <Icon name="pin" className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}
                  {(!sharing || sharing.canDeleteAny || note.author_id === sharing.currentUserId) && (
                  <form action={deleteNoteAction}>
                    <input type="hidden" name="note_id" value={note.id} />
                    <input type="hidden" name="__entity" value={entity} />
                    <input type="hidden" name="__id" value={entityId} />
                    <button className="btn btn-ghost btn-sm" title="Delete note">
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** The same Shared / Private chip Good to know uses, so the two read alike. */
function SharedChip({
  shared,
  label,
  onClick,
  submit,
}: {
  shared: boolean;
  label: string;
  onClick?: () => void;
  submit?: boolean;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      className={`chip ${shared ? "chip-info" : "chip-muted"}`}
      style={{ cursor: "pointer", border: "none" }}
      aria-label={`${label} — ${shared ? "shared with staff" : "private"}`}
      title={shared ? "Staff can see this. Click to keep it private." : "Only managers can see this. Click to share it."}
    >
      <Icon name={shared ? "users" : "lock"} className="w-3 h-3" />
      {shared ? "Shared" : "Private"}
    </button>
  );
}
