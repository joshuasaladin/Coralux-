import Link from "next/link";
import { FieldValue, type RefMaps } from "./values";
import InlineField from "./InlineField";
import { EmptyState } from "./ui";
import { optionLabel, type Entity, type Field } from "@/lib/entities";
import { recordTitle } from "@/lib/records";
import { formatDate, relativeDay } from "@/lib/format";

export default function DataTable({
  entity,
  rows,
  columns,
  refMaps,
  emptyTitle,
  emptyHint,
  hrefBase,
  readOnly,
}: {
  entity: Entity;
  rows: Record<string, any>[];
  columns: Field[];
  refMaps: RefMaps;
  emptyTitle?: string;
  emptyHint?: string;
  hrefBase?: string;
  /** render plain values even for editable fields (used by the archive table) */
  readOnly?: boolean;
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle ?? `No ${entity.label.toLowerCase()} yet`}
        hint={emptyHint ?? "Use the Add button to create the first one."}
      />
    );
  }

  const base = hrefBase ?? `/${entity.key}`;
  const [first, ...rest] = columns;
  const subtitleField = entity.subtitleField
    ? entity.fields.find((f) => f.name === entity.subtitleField)
    : undefined;
  const settled = (row: Record<string, any>) =>
    row.status === "done" || row.status === "paid" || Boolean(row.completed_at);

  /** "2 days overdue" / "in 4 days" — but never just a repeat of the date. */
  const dateHint = (row: Record<string, any>, name: string): string | null => {
    const value = row[name];
    if (!value || settled(row)) return null;
    const relative = relativeDay(value);
    return relative === formatDate(value) ? null : relative;
  };

  return (
    <div className="scroll-x">
      <table className="table">
        <thead>
          <tr>
            <th>{first?.label ?? entity.singular}</th>
            {rest.map((c) => (
              <th key={c.name}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="primary">
                <Link href={`${base}/${row.id}`} className="link" style={{ color: "var(--ink)" }}>
                  {first && first.type !== "text" && first.type !== "select" ? (
                    <FieldValue field={first} row={row} refMaps={refMaps} />
                  ) : (
                    recordTitle(entity, row)
                  )}
                </Link>
                {subtitleField && row[subtitleField.name] && first?.name === entity.titleField && (
                  <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
                    {subtitleField.options
                      ? optionLabel(subtitleField, row[subtitleField.name])
                      : String(row[subtitleField.name])}
                  </div>
                )}
              </td>
              {rest.map((c) => (
                <td key={c.name}>
                  {c.editable && !readOnly ? (
                    <InlineField
                      entityKey={entity.key}
                      recordId={row.id}
                      field={c}
                      value={row[c.name]}
                      hint={c.type === "date" ? dateHint(row, c.name) : null}
                    />
                  ) : (
                    <FieldValue
                      field={c}
                      row={row}
                      refMaps={refMaps}
                      emphasiseDueDate={c.name === "due_date" || c.name === "next_due" || c.name === "end_date"}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
