"use client";

import { useActionState } from "react";
import SubmitButton from "./SubmitButton";
import { changeOwnPasswordAction, logoutAction, type ActionState } from "@/lib/actions";

export function PasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(changeOwnPasswordAction, null);

  return (
    <form action={formAction} className="space-y-3 max-w-sm">
      <div>
        <label className="label" htmlFor="current_password">Current password</label>
        <input id="current_password" name="current_password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label" htmlFor="new_password">New password</label>
        <input id="new_password" name="new_password" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <p className="chip chip-bad justify-center w-full py-2">{state.error}</p>}
      {state?.ok && <p className="chip chip-good justify-center w-full py-2">{state.ok}</p>}
      <SubmitButton>Change password</SubmitButton>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button className="btn">Sign out</button>
    </form>
  );
}
