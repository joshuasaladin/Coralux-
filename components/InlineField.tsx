"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { setFieldAction } from "@/lib/actions";
import type { Field, Tone } from "@/lib/entities";
import { TIME_OPTIONS, normaliseTime } from "@/lib/time-options";

/**
 * Edit one field straight from a list row. The form posts to the shared
 * setFieldAction as soon as the value changes — no save button, no navigating
 * into the record.
 */
export default function InlineField({
  entityKey,
  recordId,
  field,
  value,
  hint,
}: {
  entityKey: string;
  recordId: string;
  field: Field;
  value: unknown;
  hint?: string | null;
}) {
  return (
    <form action={setFieldAction} className="inline-block">
      <input type="hidden" name="__entity" value={entityKey} />
      <input type="hidden" name="__id" value={recordId} />
      <input type="hidden" name="__field" value={field.name} />
      <Control field={field} value={value} hint={hint} />
    </form>
  );
}

function Control({
  field,
  value,
  hint,
}: {
  field: Field;
  value: unknown;
  hint?: string | null;
}) {
  const { pending } = useFormStatus();
  const [current, setCurrent] = useState(
    value === null || value === undefined ? "" : String(value),
  );

  const submit = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setCurrent(e.currentTarget.value);
    e.currentTarget.form?.requestSubmit();
  };

  if (field.type === "select" || field.type === "time") {
    const options =
      field.type === "time"
        ? TIME_OPTIONS
        : (field.options ?? []).map((o) => ({ value: o.value, label: o.label }));

    const tone: Tone =
      field.type === "time"
        ? "neutral"
        : (field.options?.find((o) => o.value === current)?.tone ?? "neutral");

    return (
      <select
        name="value"
        value={field.type === "time" ? normaliseTime(current) : current}
        onChange={submit}
        disabled={pending}
        aria-label={field.label}
        title={`${field.label} — click to change`}
        className={`inline-select chip-${current ? tone : "muted"}`}
        style={{ opacity: pending ? 0.5 : 1 }}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "number" || field.type === "money") {
    const commit = (e: React.SyntheticEvent<HTMLInputElement>) => {
      e.currentTarget.form?.requestSubmit();
    };
    return (
      <input
        type="number"
        name="value"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit(e)}
        disabled={pending}
        aria-label={field.label}
        title={`${field.label} — click to change`}
        className="input"
        step={field.type === "money" ? "0.01" : "any"}
        style={{ width: 90, padding: ".25rem .5rem", fontSize: ".8125rem", opacity: pending ? 0.5 : 1 }}
      />
    );
  }

  // date
  return (
    <span className="inline-block">
      <input
        type="date"
        name="value"
        value={current}
        onChange={submit}
        disabled={pending}
        aria-label={field.label}
        title={`${field.label} — click to change`}
        className="inline-date"
        style={{ opacity: pending ? 0.5 : 1 }}
      />
      {hint && (
        <span
          className="block text-xs pl-1"
          style={{ color: hint.includes("overdue") ? "var(--bad-fg)" : "var(--ink-3)" }}
        >
          {hint}
        </span>
      )}
    </span>
  );
}
