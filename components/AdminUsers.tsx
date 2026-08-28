"use client";

import { useActionState, useState } from "react";
import Icon from "./Icon";
import SubmitButton from "./SubmitButton";
import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  updateUserAction,
  type ActionState,
} from "@/lib/actions";
import { ROLES } from "@/lib/roles";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export function NewUserForm({ employees }: { employees: { value: string; label: string }[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createUserAction, null);

  return (
    <form action={formAction} className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="role">Role</label>
        <select id="role" name="role" className="select" defaultValue="staff">
          {ROLES.filter((r) => r.value !== "owner").map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="employee_id">Linked employee</label>
        <select id="employee_id" name="employee_id" className="select" defaultValue="">
          <option value="">—</option>
          {employees.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="password">Temporary password</label>
        <input id="password" name="password" type="text" className="input" minLength={8} required />
        <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
          At least 8 characters. Tell them to change it under their account page.
        </p>
      </div>

      {state?.error && <p className="sm:col-span-2 chip chip-bad justify-center py-2">{state.error}</p>}
      {state?.ok && <p className="sm:col-span-2 chip chip-good justify-center py-2">{state.ok}</p>}

      <div className="sm:col-span-2">
        <SubmitButton>Create account</SubmitButton>
      </div>
    </form>
  );
}

export function UserRowControls({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [resetting, setResetting] = useState(false);
  const [state, resetAction] = useActionState<ActionState, FormData>(resetUserPasswordAction, null);
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteUserAction, null);

  return (
    <>
      <form action={updateUserAction} className="flex items-center gap-2">
        <input type="hidden" name="user_id" value={user.id} />
        <select name="role" defaultValue={user.role} className="select w-auto btn-sm" disabled={isSelf}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={user.status} className="select w-auto btn-sm" disabled={isSelf}>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <button className="btn btn-sm" disabled={isSelf} title={isSelf ? "You cannot change your own role" : "Save"}>
          Save
        </button>
      </form>

      <button className="btn btn-sm btn-ghost" onClick={() => setResetting((v) => !v)}>
        <Icon name="lock" className="w-3.5 h-3.5" />
        Reset password
      </button>

      {resetting && (
        <form action={resetAction} className="flex items-center gap-2 mt-2">
          <input type="hidden" name="user_id" value={user.id} />
          <input name="password" type="text" className="input" placeholder="New password" minLength={8} required />
          <SubmitButton className="btn btn-sm btn-primary">Set</SubmitButton>
          {state?.error && <span className="text-xs" style={{ color: "var(--bad-fg)" }}>{state.error}</span>}
          {state?.ok && <span className="text-xs" style={{ color: "var(--good-fg)" }}>{state.ok}</span>}
        </form>
      )}

      {!isSelf && (
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm(`Delete ${user.name}'s account? They will no longer be able to sign in. This cannot be undone.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="user_id" value={user.id} />
          <SubmitButton className="btn btn-sm btn-danger" pendingLabel="Deleting…">
            <Icon name="trash" className="w-3.5 h-3.5" />
            Delete
          </SubmitButton>
        </form>
      )}
      {deleteState?.error && <span className="text-xs" style={{ color: "var(--bad-fg)" }}>{deleteState.error}</span>}
    </>
  );
}
