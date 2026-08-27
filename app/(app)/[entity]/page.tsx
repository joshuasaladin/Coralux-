import Link from "next/link";
import { notFound } from "next/navigation";
import DataTable from "@/components/DataTable";
import Icon from "@/components/Icon";
import ListToolbar from "@/components/ListToolbar";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getEntity, isEnabled } from "@/lib/entities";
import { money } from "@/lib/format";
import { canOpen, listRecords, refMapsFor, visibleFields } from "@/lib/records";

export const dynamic = "force-dynamic";

type Params = { entity: string };
type Search = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const entity = getEntity((await params).entity);
  return { title: entity ? `${entity.label} — Coralux HQ` : "Coralux HQ" };
}

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { entity: entityKey } = await params;
  const entity = getEntity(entityKey);
  if (!entity) notFound();

  const user = await requireUser();
  if (!canOpen(entity, user.role)) {
    const off = !isEnabled(entity.key);
    return (
      <div className="panel p-8 text-center">
        <h1 className="section-title mb-2">
          {off ? `${entity.label} is not switched on yet` : "Not available to your account"}
        </h1>
        <p className="text-sm max-w-md mx-auto" style={{ color: "var(--ink-3)" }}>
          {off
            ? `This section is built and ready — ${entity.blurb.charAt(0).toLowerCase()}${entity.blurb.slice(1)} Add "${entity.key}" to ENABLED_SECTIONS in lib/entities.ts to bring it live.`
            : `${entity.label} is restricted. Ask an administrator if you need access.`}
        </p>
      </div>
    );
  }

  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : undefined;

  const filters: Record<string, string> = {};
  for (const field of entity.fields) {
    const value = query[field.name];
    if (typeof value === "string" && value) filters[field.name] = value;
  }

  const allRows = listRecords(entity, { search, filters });
  const refMaps = refMapsFor(entity);
  const columns = visibleFields(entity, user.role).filter((f) => f.inList);

  // tabs (e.g. one-off vs recurring tasks)
  const tabs = entity.tabs ?? [];
  const activeTabKey =
    typeof query.tab === "string" && tabs.some((t) => t.key === query.tab)
      ? query.tab
      : (tabs[0]?.key ?? null);
  const activeTab = tabs.find((t) => t.key === activeTabKey);
  const scoped = activeTab ? allRows.filter(activeTab.match) : allRows;

  // finished records move into their own section below the table
  const archive = entity.archive;
  const rows = archive ? scoped.filter((r) => !archive.match(r)) : scoped;
  const archivedRows = archive ? scoped.filter((r) => archive.match(r)) : [];

  const tabHref = (key: string) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    for (const [k, v] of Object.entries(filters)) params.set(k, v);
    params.set("tab", key);
    return `/${entity.key}?${params.toString()}`;
  };

  const tabCount = (key: string) => {
    const tab = tabs.find((t) => t.key === key);
    if (!tab) return 0;
    const inTab = allRows.filter(tab.match);
    return archive ? inTab.filter((r) => !archive.match(r)).length : inTab.length;
  };

  const totals = summarise(entity.key, rows);

  return (
    <>
      <PageHeader
        eyebrow={entity.label}
        title={entity.label}
        blurb={entity.blurb}
        actions={
          <Link href={`/${entity.key}/new`} className="btn btn-primary">
            <Icon name="plus" />
            New {entity.singular.toLowerCase()}
          </Link>
        }
      />

      {tabs.length > 0 && (
        <div className="flex items-center mb-4" style={{ borderBottom: "1px solid var(--line)" }}>
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tabHref(tab.key)}
              className="tab"
              data-active={tab.key === activeTabKey}
            >
              {tab.label}
              <span className="chip chip-muted ml-2">{tabCount(tab.key)}</span>
            </Link>
          ))}
        </div>
      )}

      <ListToolbar entity={entity} search={search} filters={filters} />

      {totals.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm">
          {totals.map((t) => (
            <div key={t.label}>
              <span className="eyebrow mr-2">{t.label}</span>
              <span className="font-semibold tabular-nums">{t.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="panel" style={{ overflow: "hidden" }}>
        <DataTable
          entity={entity}
          rows={rows}
          columns={columns}
          refMaps={refMaps}
          emptyTitle={
            search || Object.keys(filters).length
              ? "Nothing matches those filters"
              : `No ${entity.label.toLowerCase()} yet`
          }
          emptyHint={
            search || Object.keys(filters).length
              ? "Clear the search or filters to see everything."
              : `Create the first ${entity.singular.toLowerCase()} to get started.`
          }
        />
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--ink-3)" }}>
        {rows.length} open{" "}
        {rows.length === 1 ? entity.singular.toLowerCase() : entity.label.toLowerCase()}
        {archive && archivedRows.length > 0 && ` · ${archivedRows.length} ${archive.label.toLowerCase()}`}
      </p>

      {archive && archivedRows.length > 0 && (
        <details className="panel mt-5" style={{ overflow: "hidden" }}>
          <summary
            className="px-4 py-3 cursor-pointer flex items-center gap-2 text-sm font-semibold select-none"
            style={{ listStyle: "none" }}
          >
            <span style={{ color: "var(--good-fg)", display: "inline-flex" }}>
              <Icon name="check" className="w-4 h-4" />
            </span>
            {archive.label}
            <span className="chip chip-muted">{archivedRows.length}</span>
            <span className="ml-auto text-xs font-normal" style={{ color: "var(--ink-3)" }}>
              click to expand
            </span>
          </summary>
          <div style={{ borderTop: "1px solid var(--line)" }}>
            <DataTable
              entity={entity}
              rows={archivedRows}
              columns={columns}
              refMaps={refMaps}
              readOnly
            />
          </div>
        </details>
      )}
    </>
  );
}

/** Small at-a-glance numbers above money-shaped lists. */
function summarise(key: string, rows: Record<string, any>[]) {
  const sum = (predicate: (r: Record<string, any>) => boolean, field = "amount") =>
    rows.filter(predicate).reduce((acc, r) => acc + Number(r[field] ?? 0), 0);

  switch (key) {
    case "invoices":
      return [
        { label: "Total", value: money(sum(() => true)) },
        { label: "Unpaid", value: money(sum((r) => r.status === "unpaid" || r.status === "partial")) },
        { label: "Paid", value: money(sum((r) => r.status === "paid")) },
      ];
    case "payments":
      return [{ label: "Total paid", value: money(sum(() => true)) }];
    case "payouts":
      return [
        { label: "Scheduled", value: money(sum((r) => r.status === "scheduled")) },
        { label: "Cleared", value: money(sum((r) => r.status === "cleared")) },
      ];
    case "recurring": {
      const monthly = rows
        .filter((r) => r.status === "active")
        .reduce((acc, r) => {
          const per: Record<string, number> = {
            weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, semiannual: 1 / 6, yearly: 1 / 12,
          };
          return acc + Number(r.amount ?? 0) * (per[r.frequency] ?? 1);
        }, 0);
      return [{ label: "Roughly per month", value: money(monthly) }];
    }
    case "assets":
      return [{ label: "Book value", value: money(sum(() => true, "value")) }];
    default:
      return [];
  }
}
