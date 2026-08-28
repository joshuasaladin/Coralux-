import AutoSubmitForm from "./AutoSubmitForm";
import Icon from "./Icon";
import type { Entity } from "@/lib/entities";

/** Filters live in the URL, so views stay shareable — and auto-apply, so
 * nothing needs an Apply button. */
export default function ListToolbar({
  entity,
  search,
  filters,
}: {
  entity: Entity;
  search?: string;
  filters: Record<string, string>;
}) {
  const filterable = entity.fields.filter(
    (f) => f.type === "select" && f.inList && (f.options?.length ?? 0) > 1,
  );

  return (
    <AutoSubmitForm className="flex flex-wrap items-end gap-2 mb-4">
      <div className="relative flex-1 min-w-[220px]">
        <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          name="q"
          type="text"
          defaultValue={search ?? ""}
          className="input input-icon"
          placeholder={`Search ${entity.label.toLowerCase()}…`}
        />
      </div>

      {filterable.slice(0, 3).map((f) => (
        <select key={f.name} name={f.name} defaultValue={filters[f.name] ?? ""} className="select w-auto min-w-[140px]">
          <option value="">All {f.label.toLowerCase()}</option>
          {f.options!.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </AutoSubmitForm>
  );
}
