"use client";

import { useState, useTransition } from "react";
import Icon from "./Icon";
import { syncGuestyAction } from "@/lib/actions";

/** Pull from Guesty now rather than waiting for the ten-minute schedule. */
export default function GuestySyncButton() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            setResult(await syncGuestyAction());
          })
        }
      >
        <Icon name="undo" className="w-3.5 h-3.5" />
        {busy ? "Syncing…" : "Sync from Guesty"}
      </button>
      {result && (
        <span
          className={`chip ${result.ok ? "chip-good" : "chip-bad"}`}
          title={result.message}
          style={{ maxWidth: 320 }}
        >
          <span className="truncate">{result.message}</span>
        </span>
      )}
    </>
  );
}
