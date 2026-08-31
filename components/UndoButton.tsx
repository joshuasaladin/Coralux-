"use client";

import { useState, useTransition } from "react";
import Icon from "./Icon";
import { undoDeleteAction } from "@/lib/actions";

export type PendingUndo = {
  id: string;
  kind: string;
  label: string;
  byOther: boolean;
  actorName: string | null;
};

/**
 * Puts back whatever was deleted last. Sits in the header rather than on any
 * one page, because a delete usually takes you somewhere else — off the
 * record you just removed — and that is exactly the moment you realise it
 * was a mistake.
 */
export default function UndoButton({ pending }: { pending: PendingUndo | null }) {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  if (!pending) return null;

  const restore = () => {
    setError(null);
    startTransition(async () => {
      const result = await undoDeleteAction(pending.id);
      if (result.error) setError(result.error);
      else setDone(result.ok ?? "Put back.");
    });
  };

  if (done) {
    return (
      <span className="chip chip-good" title={done}>
        <Icon name="check" className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{done}</span>
      </span>
    );
  }

  const who = pending.byOther && pending.actorName ? ` (deleted by ${pending.actorName})` : "";

  return (
    <button
      type="button"
      onClick={restore}
      disabled={busy}
      className="btn btn-sm"
      title={error ?? `Put back the ${pending.kind} “${pending.label}”${who}`}
      style={error ? { color: "var(--bad-fg)", borderColor: "var(--bad-fg)" } : undefined}
    >
      <Icon name="undo" className="w-3.5 h-3.5" />
      {/* deliberately just "Undo": anything containing the word "delete"
          collides with the delete buttons on the pages themselves */}
      <span className="hidden sm:inline">
        {busy ? "Undoing…" : error ? "Could not undo" : "Undo"}
      </span>
    </button>
  );
}
