"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Icon from "./Icon";
import SubmitButton from "./SubmitButton";
import {
  addPropertyFactAction,
  deletePropertyFactAction,
  setPropertyFactAction,
  setPropertyFactVisibilityAction,
  type ActionState,
} from "@/lib/actions";

type Fact = Record<string, any>;

/**
 * Whatever else is worth keeping about a property, in whatever words suit —
 * bin day, how often pest control comes, which day the pool is done. Each
 * entry can be hidden from the cleaners if it is not their business.
 *
 * Read-only for staff: they see the entries meant for them and nothing to
 * press.
 */
export default function PropertyFacts({
  propertyId,
  facts,
  canEdit,
}: {
  propertyId: string;
  facts: Fact[];
  canEdit: boolean;
}) {
  const [state, addAction] = useActionState<ActionState, FormData>(addPropertyFactAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="panel">
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <h2 className="text-sm font-semibold">Good to know</h2>
        {canEdit && (
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>
            anything you want to keep here
          </span>
        )}
      </header>

      {facts.length === 0 ? (
        <p className="text-sm p-4" style={{ color: "var(--ink-3)" }}>
          {canEdit
            ? "Nothing yet — add the bin day, the pool schedule, how often pest control comes."
            : "Nothing recorded for this property yet."}
        </p>
      ) : (
        <ul>
          {facts.map((fact, i) => (
            <FactRow
              key={fact.id}
              propertyId={propertyId}
              fact={fact}
              canEdit={canEdit}
              bordered={i > 0}
            />
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="p-4" style={{ borderTop: "1px solid var(--line)" }}>
          <form
            ref={formRef}
            action={async (fd) => {
              await addAction(fd);
              formRef.current?.reset();
            }}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="__id" value={propertyId} />
            <input
              name="label"
              className="input"
              placeholder="Add something — e.g. Garbage collection"
              aria-label="Add a detail"
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
      )}
    </section>
  );
}

function FactRow({
  propertyId,
  fact,
  canEdit,
  bordered,
}: {
  propertyId: string;
  fact: Fact;
  canEdit: boolean;
  bordered: boolean;
}) {
  const [label, setLabel] = useState<string>(fact.label ?? "");
  const [value, setValue] = useState<string>(fact.value ?? "");
  const [visible, setVisible] = useState<boolean>(Boolean(fact.staff_visible));
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const save = (patch: { label?: string; value?: string }) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        await setPropertyFactAction(propertyId, fact.id, patch);
      });
    }, 600);
  };

  if (!canEdit) {
    return (
      <li
        className="px-4 py-2.5 flex items-baseline gap-3"
        style={bordered ? { borderTop: "1px solid var(--line)" } : undefined}
      >
        <span className="text-sm font-medium w-44 shrink-0" style={{ color: "var(--ink-2)" }}>
          {fact.label}
        </span>
        <span className="text-sm flex-1" style={{ color: "var(--ink)" }}>
          {fact.value || "—"}
        </span>
      </li>
    );
  }

  return (
    <li
      className="group px-4 py-2.5"
      style={bordered ? { borderTop: "1px solid var(--line)" } : undefined}
    >
      <div className="flex items-start gap-2">
        <input
          className="input w-44 shrink-0"
          style={{ fontSize: ".8125rem", padding: ".35rem .55rem" }}
          aria-label="Detail name"
          value={label}
          onChange={(e) => { setLabel(e.target.value); save({ label: e.target.value }); }}
        />
        <input
          className="input flex-1"
          style={{ fontSize: ".8125rem", padding: ".35rem .55rem" }}
          aria-label={`Value for ${fact.label}`}
          placeholder="Tuesdays and Fridays…"
          value={value}
          onChange={(e) => { setValue(e.target.value); save({ value: e.target.value }); }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm shrink-0"
          title={visible ? "Cleaners can see this — click to hide it" : "Hidden from cleaners — click to show it"}
          onClick={() => {
            const next = !visible;
            setVisible(next);
            startTransition(async () => {
              await setPropertyFactVisibilityAction(propertyId, fact.id, next);
            });
          }}
        >
          <Icon name={visible ? "users" : "lock"} className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{visible ? "Shared" : "Private"}</span>
        </button>
        <form action={deletePropertyFactAction} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <input type="hidden" name="__id" value={propertyId} />
          <input type="hidden" name="fact_id" value={fact.id} />
          <button className="btn btn-ghost btn-sm" title="Remove this detail" type="submit">
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </li>
  );
}
