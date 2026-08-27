import Link from "next/link";
import { FieldValue, type RefMaps } from "./values";
import { EmptyState } from "./ui";
import { optionLabel, type Entity, type Field } from "@/lib/entities";
import { recordTitle } from "@/lib/records";

export default function DataTable({
  entity,
  rows,
  columns,
  refMaps,
  emptyTitle,
  emptyHint,
  hrefBase,
}: {
  entity: Entity;
  rows: Record<string, any>[];
  columns: Field[];
  refMaps: RefMaps;
  emptyTitle?: string;
  emptyHint?: string;
  hrefBase?: string;
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
                  <FieldValue
                    field={c}
                    row={row}
                    refMaps={refMaps}
                    emphasiseDueDate={c.name === "due_date" || c.name === "next_due" || c.name === "end_date"}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
