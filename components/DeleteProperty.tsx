"use client";

import Icon from "./Icon";
import { deletePropertyAction } from "@/lib/actions";

export default function DeletePropertyButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deletePropertyAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}" and everything kept against it? Undo in the header will bring it back.`)) {
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
