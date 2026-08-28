"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import Icon from "./Icon";
import SubmitButton from "./SubmitButton";
import {
  addListingStepAction,
  deleteListingStepAction,
  toggleListingStepAction,
  type ActionState,
} from "@/lib/actions";
import { timeAgo } from "@/lib/format";

type Step = Record<string, any>;

export default function ListingChecklist({ listingId, steps }: { listingId: string; steps: Step[] }) {
  const [state, addAction] = useActionState<ActionState, FormData>(addListingStepAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const done = steps.filter((s) => s.done).length;

  return (
    <section className="panel">
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <h2 className="text-sm font-semibold">Onboarding checklist</h2>
        <span className="chip chip-muted">
          {done}/{steps.length}
        </span>
      </header>

      {steps.length === 0 ? (
        <p className="text-sm p-4" style={{ color: "var(--ink-3)" }}>
          No steps yet — add one below.
        </p>
      ) : (
        <ul>
          {steps.map((step, i) => (
            <StepRow key={step.id} listingId={listingId} step={step} bordered={i > 0} />
          ))}
        </ul>
      )}

      <div className="p-4" style={{ borderTop: "1px solid var(--line)" }}>
        <form
          ref={formRef}
          action={async (fd) => {
            await addAction(fd);
            formRef.current?.reset();
          }}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="__id" value={listingId} />
          <input
            name="label"
            className="input"
            placeholder="Add an extra step…"
            aria-label="Add a step"
          />
          <SubmitButton className="btn btn-sm" pendingLabel="Adding…">
            <Icon name="plus" className="w-3.5 h-3.5" />
            Add
          </SubmitButton>
        </form>
        {state?.error && (
          <p className="text-xs mt-1.5" style={{ color: "var(--bad-fg)" }}>
            {state.error}
          </p>
        )}
      </div>
    </section>
  );
}

function StepRow({ listingId, step, bordered }: { listingId: string; step: Step; bordered: boolean }) {
  return (
    <li
      className="group flex items-start gap-3 px-4 py-2.5"
      style={bordered ? { borderTop: "1px solid var(--line)" } : undefined}
    >
      <ToggleForm listingId={listingId} step={step} />
      <div className="min-w-0 flex-1">
        <span
          className="text-sm"
          style={{
            color: step.done ? "var(--ink-3)" : "var(--ink)",
            textDecoration: step.done ? "line-through" : "none",
          }}
        >
          {step.label}
        </span>
        {Boolean(step.done) && step.done_at && (
          <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
            checked {timeAgo(step.done_at)}
          </span>
        )}
      </div>
      <form action={deleteListingStepAction} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <input type="hidden" name="__id" value={listingId} />
        <input type="hidden" name="step_id" value={step.id} />
        <button className="btn btn-ghost btn-sm" title="Remove this step" type="submit">
          <Icon name="x" className="w-3.5 h-3.5" />
        </button>
      </form>
    </li>
  );
}

function ToggleForm({ listingId, step }: { listingId: string; step: Step }) {
  return (
    <form action={toggleListingStepAction} className="mt-0.5 shrink-0">
      <input type="hidden" name="__id" value={listingId} />
      <input type="hidden" name="step_id" value={step.id} />
      <Checkbox defaultChecked={Boolean(step.done)} />
    </form>
  );
}

function Checkbox({ defaultChecked }: { defaultChecked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={defaultChecked}
      title={defaultChecked ? "Mark as not done" : "Mark as done"}
      className="grid place-items-center w-5 h-5 rounded-md shrink-0 transition-colors"
      style={{
        background: defaultChecked ? "var(--good-fg)" : "var(--panel)",
        border: `1.5px solid ${defaultChecked ? "var(--good-fg)" : "var(--line-2)"}`,
        opacity: pending ? 0.6 : 1,
        cursor: pending ? "progress" : "pointer",
      }}
    >
      {defaultChecked && (
        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
        </svg>
      )}
    </button>
  );
}
