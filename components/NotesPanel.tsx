"use client";

import { useActionState, useRef } from "react";
import Icon from "./Icon";
import SubmitButton from "./SubmitButton";
import {
  addNoteAction,
  deleteNoteAction,
  togglePinNoteAction,
  type ActionState,
} from "@/lib/actions";
import { timeAgo } from "@/lib/format";

export default function NotesPanel({
  entity,
  entityId,
  notes,
}: {
  entity: string;
  entityId: string;
  notes: Record<string, any>[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(addNoteAction, null);
  const formRef = useRef<HTMLFormElement>(null);

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
          <textarea
            name="body"
            className="textarea"
            rows={2}
            placeholder="Something worth remembering next time…"
          />
          <div className="flex items-center gap-2 mt-2">
            <SubmitButton className="btn btn-sm btn-primary" pendingLabel="Adding…">
              Add note
            </SubmitButton>
            {state?.error && <span className="text-xs" style={{ color: "var(--bad-fg)" }}>{state.error}</span>}
          </div>
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
                  <form action={togglePinNoteAction} className="ml-auto">
                    <input type="hidden" name="note_id" value={note.id} />
                    <input type="hidden" name="__entity" value={entity} />
                    <input type="hidden" name="__id" value={entityId} />
                    <button className="btn btn-ghost btn-sm" title={note.pinned ? "Unpin" : "Pin"}>
                      <Icon name="pin" className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  <form action={deleteNoteAction}>
                    <input type="hidden" name="note_id" value={note.id} />
                    <input type="hidden" name="__entity" value={entity} />
                    <input type="hidden" name="__id" value={entityId} />
                    <button className="btn btn-ghost btn-sm" title="Delete note">
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
