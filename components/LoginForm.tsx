"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/lib/actions";
import SubmitButton from "./SubmitButton";

export default function LoginForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="username"
          placeholder="you@coralux.aw"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </div>

      {state?.error && (
        <p className="chip chip-bad w-full justify-center py-2">{state.error}</p>
      )}

      <SubmitButton className="btn btn-primary w-full justify-center" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
