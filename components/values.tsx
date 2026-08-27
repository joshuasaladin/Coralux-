import Link from "next/link";
import { Chip } from "./ui";
import { optionLabel, optionTone, type EntityKey, type Field } from "@/lib/entities";
import { formatDate, money, relativeDay } from "@/lib/format";
import { formatTime } from "@/lib/time-options";

export type RefMaps = Partial<Record<EntityKey, Map<string, string>>>;

/** Render one field's value for a table cell or a detail row. */
export function FieldValue({
  field,
  row,
  refMaps,
  emphasiseDueDate,
}: {
  field: Field;
  row: Record<string, any>;
  refMaps: RefMaps;
  emphasiseDueDate?: boolean;
}) {
  const value = row[field.name];
  const dim = { color: "var(--ink-3)" };

  if (value === null || value === undefined || value === "") {
    if (field.type === "bool") return <span style={dim}>No</span>;
    return <span style={dim}>—</span>;
  }

  switch (field.type) {
    case "select":
      return <Chip tone={optionTone(field, value)}>{optionLabel(field, value)}</Chip>;

    case "ref": {
      const label = field.ref ? refMaps[field.ref]?.get(String(value)) : undefined;
      if (!label) return <span style={dim}>—</span>;
      return (
        <Link href={`/${field.ref}/${value}`} className="link">
          {label}
        </Link>
      );
    }

    case "money":
      return <span className="tabular-nums">{money(value, row.currency ?? row.pay_currency ?? "AWG")}</span>;

    case "number":
      return <span className="tabular-nums">{Number(value).toLocaleString("en-US")}</span>;

    case "date": {
      const settled = row.status === "done" || row.status === "paid" || Boolean(row.completed_at);
      if (!emphasiseDueDate || settled) {
        return <span className="whitespace-nowrap">{formatDate(value)}</span>;
      }
      const relative = relativeDay(value);
      if (relative === formatDate(value)) {
        return <span className="whitespace-nowrap">{formatDate(value)}</span>;
      }
      const overdue = relative.includes("overdue");
      return (
        <span className="whitespace-nowrap">
          {formatDate(value)}
          <span
            className="block text-xs"
            style={{ color: overdue ? "var(--bad-fg)" : "var(--ink-3)" }}
          >
            {relative}
          </span>
        </span>
      );
    }

    case "time":
      return <span className="whitespace-nowrap tabular-nums">{formatTime(value)}</span>;

    case "bool":
      return value ? <Chip tone="good">Yes</Chip> : <span style={dim}>No</span>;

    case "email":
      return (
        <a href={`mailto:${value}`} className="link">
          {String(value)}
        </a>
      );

    case "phone":
      return (
        <a href={`tel:${String(value).replace(/\s+/g, "")}`} className="link">
          {String(value)}
        </a>
      );

    case "textarea":
    case "richtext":
      return (
        <span className="line-clamp-2" style={{ color: "var(--ink-2)" }}>
          {String(value)}
        </span>
      );

    default:
      return <span>{String(value)}</span>;
  }
}
