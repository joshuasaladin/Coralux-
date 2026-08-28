"use client";

import Icon from "./Icon";
import { deleteListingAction } from "@/lib/actions";

export default function DeleteListingButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteListingAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}" and its whole checklist? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="__id" value={id} />
      <button className="btn btn-danger btn-sm" type="submit">
        <Icon name="trash" className="w-3.5 h-3.5" />
        Delete
      </button>
    </form>
  );
}
