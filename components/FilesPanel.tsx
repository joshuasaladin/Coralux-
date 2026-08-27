"use client";

import { useActionState, useRef, useState } from "react";
import Icon from "./Icon";
import SubmitButton from "./SubmitButton";
import { detachFileAction, uploadFileAction, type ActionState } from "@/lib/actions";
import { fileSize, timeAgo } from "@/lib/format";

export default function FilesPanel({
  entity,
  entityId,
  files,
  title = "Documents",
}: {
  entity: string;
  entityId: string;
  files: Record<string, any>[];
  title?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(uploadFileAction, null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="panel">
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        <button className="btn btn-sm" onClick={() => setShowForm((v) => !v)}>
          <Icon name="paperclip" className="w-3.5 h-3.5" />
          Attach
        </button>
      </header>

      <div className="p-4">
        {showForm && (
          <form
            ref={formRef}
            action={async (fd) => {
              await formAction(fd);
              formRef.current?.reset();
            }}
            className="mb-4 space-y-2 rounded-lg p-3"
            style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
          >
            <input type="hidden" name="__entity" value={entity} />
            <input type="hidden" name="__id" value={entityId} />
            <input type="file" name="file" className="input" required />
            <input name="category" className="input" placeholder="Category (optional) — e.g. Contract" />
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
              <input type="checkbox" name="sensitive" className="w-4 h-4 accent-[var(--brand)]" />
              Confidential — restrict to admins
            </label>
            <SubmitButton className="btn btn-sm btn-primary" pendingLabel="Uploading…">
              Upload
            </SubmitButton>
            {state?.error && (
              <p className="text-xs" style={{ color: "var(--bad-fg)" }}>{state.error}</p>
            )}
            {state?.ok && (
              <p className="text-xs" style={{ color: "var(--good-fg)" }}>{state.ok}</p>
            )}
          </form>
        )}

        {files.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            Nothing attached yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-2.5">
                <Icon name="file" className="w-4 h-4 shrink-0" />
                <a href={`/api/files/${file.id}`} className="link text-sm truncate flex-1" target="_blank" rel="noreferrer">
                  {file.name}
                </a>
                <span className="text-xs shrink-0" style={{ color: "var(--ink-3)" }}>
                  {fileSize(file.size_bytes)} · {timeAgo(file.created_at)}
                </span>
                <form action={detachFileAction}>
                  <input type="hidden" name="file_id" value={file.id} />
                  <input type="hidden" name="__entity" value={entity} />
                  <input type="hidden" name="__id" value={entityId} />
                  <button className="btn btn-ghost btn-sm" title="Remove from this record">
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
