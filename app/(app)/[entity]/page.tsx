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

  const rows = listRecords(entity, { search, filters });
  const refMaps = refMapsFor(entity);
  const columns = visibleFields(entity, user.role).filter((f) => f.inList);

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
        {rows.length} {rows.length === 1 ? entity.singular.toLowerCase() : entity.label.toLowerCase()}
      </p>
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
