"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Icon from "./Icon";
import SubmitButton from "./SubmitButton";
import {
  addListingStepAction,
  deleteListingStepAction,
  setListingStepNoteAction,
  toggleListingStepAction,
  type ActionState,
} from "@/lib/actions";
import { timeAgo } from "@/lib/format";

type Step = Record<string, any>;

const EXTRAS = "Extra steps";

export default function ListingChecklist({ listingId, steps }: { listingId: string; steps: Step[] }) {
  const [state, addAction] = useActionState<ActionState, FormData>(addListingStepAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const done = steps.filter((s) => s.done).length;

  // Keep the checklist in the order the server sent, grouped by its section.
  // Anything added by hand has no section and gathers at the end.
  const groups: { section: string; items: Step[] }[] = [];
  for (const step of steps) {
    const section = step.section || EXTRAS;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.items.push(step);
    else groups.push({ section, items: [step] });
  }

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
        groups.map((group, i) => (
          <SectionBlock
            key={`${group.section}-${i}`}
            listingId={listingId}
            section={group.section}
            items={group.items}
          />
        ))
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

/** One part of the checklist. Finished sections fold themselves away so the
 * list stays readable at a hundred-odd items. */
function SectionBlock({
  listingId,
  section,
  items,
}: {
  listingId: string;
  section: string;
  items: Step[];
}) {
  const done = items.filter((s) => s.done).length;
  const complete = done === items.length;

  return (
    <details open={!complete} style={{ borderTop: "1px solid var(--line)" }}>
      <summary
        className="px-4 py-2.5 cursor-pointer flex items-center gap-2 select-none"
        style={{ listStyle: "none", background: "var(--panel-2)" }}
      >
        <span className="text-sm font-semibold flex-1" style={{ color: "var(--ink)" }}>
          {section}
        </span>
        <span className={`chip ${complete ? "chip-good" : "chip-muted"}`}>
          {done}/{items.length}
        </span>
      </summary>
      <ul>
        {items.map((step, i) => (
          <StepRow key={step.id} listingId={listingId} step={step} bordered={i > 0} />
        ))}
      </ul>
    </details>
  );
}

function StepRow({ listingId, step, bordered }: { listingId: string; step: Step; bordered: boolean }) {
  return (
    <li
      className="group px-4 py-2.5"
      style={bordered ? { borderTop: "1px solid var(--line)" } : undefined}
    >
      <div className="flex items-start gap-3">
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
          <StepNote listingId={listingId} step={step} />
        </div>
        <form action={deleteListingStepAction} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <input type="hidden" name="__id" value={listingId} />
          <input type="hidden" name="step_id" value={step.id} />
          <button className="btn btn-ghost btn-sm" title="Remove this step" type="submit">
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </li>
  );
}

/** A note against one item. Hidden behind a small link until there is
 * something to say, so a long checklist is not drowned in empty boxes.
 * Saves shortly after you stop typing — nothing to press. */
function StepNote({ listingId, step }: { listingId: string; step: Step }) {
  const [note, setNote] = useState<string>(step.note ?? "");
  const [open, setOpen] = useState<boolean>(Boolean(step.note));
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const change = (value: string) => {
    setNote(value);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        await setListingStepNoteAction(listingId, step.id, value);
        setSaved(true);
      });
    }, 600);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--ink-3)", textDecoration: "underline" }}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        add a note
      </button>
    );
  }

  return (
    <div className="mt-1.5">
      <textarea
        ref={inputRef}
        rows={2}
        className="input"
        placeholder="Note — a code, a vendor, what is still outstanding…"
        aria-label={`Note for ${step.label}`}
        value={note}
        onChange={(e) => change(e.target.value)}
        onBlur={() => {
          if (!note.trim()) setOpen(false);
        }}
        style={{ fontSize: ".8125rem", padding: ".4rem .6rem" }}
      />
      {saved && (
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>
          saved
        </span>
      )}
    </div>
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
