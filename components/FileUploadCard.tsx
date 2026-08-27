"use client";

import { useActionState, useRef } from "react";
import SubmitButton from "./SubmitButton";
import { uploadFileAction, type ActionState } from "@/lib/actions";

export default function FileUploadCard({ categories }: { categories: string[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(uploadFileAction, null);
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await formAction(fd);
        ref.current?.reset();
      }}
      className="panel p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold">Upload a document</h2>
      <input type="file" name="file" className="input" required />
      <input
        name="category"
        className="input"
        list="file-categories"
        placeholder="Category — e.g. Contracts, Licences, Templates"
      />
      <datalist id="file-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <label className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
        <input type="checkbox" name="sensitive" className="w-4 h-4 accent-[var(--brand)]" />
        Confidential — only admins and owners can open it
      </label>
      <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
      {state?.error && <p className="text-xs" style={{ color: "var(--bad-fg)" }}>{state.error}</p>}
      {state?.ok && <p className="text-xs" style={{ color: "var(--good-fg)" }}>{state.ok}</p>}
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        Files are stored outside the database and referenced from it. PDFs, images, Word and
        Excel files are all fine, up to 25 MB.
      </p>
    </form>
  );
}
