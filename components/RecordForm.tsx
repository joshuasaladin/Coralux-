"use client";

import Link from "next/link";
import { useActionState } from "react";
import SubmitButton from "./SubmitButton";
import {
  createRecordAction,
  updateRecordAction,
  type ActionState,
} from "@/lib/actions";
import type { Field } from "@/lib/entities";

type Options = Record<string, { value: string; label: string }[]>;

export default function RecordForm({
  entityKey,
  singular,
  fields,
  record,
  refOptions,
  cancelHref,
  allowAttachment,
}: {
  entityKey: string;
  singular: string;
  fields: Field[];
  record?: Record<string, any> | null;
  refOptions: Options;
  cancelHref: string;
  allowAttachment?: boolean;
}) {
  const isEdit = Boolean(record?.id);
  const [state, formAction] = useActionState<ActionState, FormData>(
    isEdit ? updateRecordAction : createRecordAction,
    null,
  );

  const groups = new Map<string, Field[]>();
  for (const field of fields) {
    const key = field.group ?? "Details";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(field);
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="__entity" value={entityKey} />
      {isEdit && <input type="hidden" name="__id" value={record!.id} />}

      {Array.from(groups.entries()).map(([group, groupFields]) => (
        <section key={group} className="panel p-5">
          <h2 className="text-sm font-semibold mb-4">{group}</h2>
          <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
            {groupFields.map((field) => (
              <div
                key={field.name}
                className={field.full || field.type === "textarea" || field.type === "richtext" ? "sm:col-span-2" : ""}
              >
                <label className="label" htmlFor={field.name}>
                  {field.label}
                  {field.required && <span style={{ color: "var(--bad-fg)" }}> *</span>}
                </label>
                <FieldInput field={field} record={record} refOptions={refOptions} />
                {field.help && (
                  <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
                    {field.help}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {allowAttachment && !isEdit && (
        <section className="panel p-5">
          <h2 className="text-sm font-semibold mb-1">Attachment</h2>
          <p className="text-xs mb-3" style={{ color: "var(--ink-3)" }}>
            Optional. The PDF, photo or scan that goes with this {singular.toLowerCase()}.
          </p>
          <input type="file" name="__file" className="input" />
        </section>
      )}

      {state?.error && (
        <p className="chip chip-bad w-full justify-center py-2">{state.error}</p>
      )}

      <div className="flex items-center gap-2">
        <SubmitButton>{isEdit ? "Save changes" : `Create ${singular.toLowerCase()}`}</SubmitButton>
        <Link href={cancelHref} className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  record,
  refOptions,
}: {
  field: Field;
  record?: Record<string, any> | null;
  refOptions: Options;
}) {
  const value = record?.[field.name];

  if (field.type === "select") {
    return (
      <select id={field.name} name={field.name} className="select" defaultValue={value ?? ""}>
        <option value="">—</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "ref") {
    const options = refOptions[field.ref ?? ""] ?? [];
    return (
      <select id={field.name} name={field.name} className="select" defaultValue={value ?? ""}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea" || field.type === "richtext") {
    return (
      <textarea
        id={field.name}
        name={field.name}
        className="textarea"
        defaultValue={value ?? ""}
        placeholder={field.placeholder}
        rows={field.type === "richtext" ? 9 : 4}
      />
    );
  }

  if (field.type === "bool") {
    return (
      <label className="flex items-center gap-2 text-sm h-[38px]">
        <input
          type="checkbox"
          name={field.name}
          defaultChecked={Boolean(value)}
          className="w-4 h-4 accent-[var(--brand)]"
        />
        Yes
      </label>
    );
  }

  const type =
    field.type === "date"
      ? "date"
      : field.type === "number" || field.type === "money"
        ? "number"
        : field.type === "email"
          ? "email"
          : field.type === "phone"
            ? "tel"
            : "text";

  return (
    <input
      id={field.name}
      name={field.name}
      type={type}
      step={field.type === "money" ? "0.01" : field.type === "number" ? "any" : undefined}
      className="input"
      defaultValue={value ?? ""}
      placeholder={field.placeholder}
    />
  );
}
