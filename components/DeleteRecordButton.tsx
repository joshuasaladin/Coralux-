"use client";

import Icon from "./Icon";
import { deleteRecordAction } from "@/lib/actions";

export default function DeleteRecordButton({
  entityKey,
  recordId,
  label,
}: {
  entityKey: string;
  recordId: string;
  label: string;
}) {
  return (
    <form
      action={deleteRecordAction}
      onSubmit={(e) => {
        if (!confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="__entity" value={entityKey} />
      <input type="hidden" name="__id" value={recordId} />
      <button className="btn btn-danger btn-sm" type="submit">
        <Icon name="trash" className="w-3.5 h-3.5" />
        Delete
      </button>
    </form>
  );
}
