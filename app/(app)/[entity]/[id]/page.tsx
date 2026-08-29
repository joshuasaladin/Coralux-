import Link from "next/link";
import { notFound } from "next/navigation";
import DataTable from "@/components/DataTable";
import DeleteRecordButton from "@/components/DeleteRecordButton";
import FilesPanel from "@/components/FilesPanel";
import Icon from "@/components/Icon";
import NotesPanel from "@/components/NotesPanel";
import { Card, Chip, Detail, Lines, PageHeader } from "@/components/ui";
import { FieldValue } from "@/components/values";
import { atLeast, requireUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { ENTITIES, getEntity, isEnabled, optionLabel, optionTone } from "@/lib/entities";
import { formatDate, money, timeAgo } from "@/lib/format";
import {
  canOpen,
  getRecord,
  listActivity,
  listFilesFor,
  listNotes,
  recordTitle,
  refMapsFor,
  relatedRecords,
  visibleFields,
} from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity: entityKey, id } = await params;
  const entity = getEntity(entityKey);
  if (!entity) notFound();

  const user = await requireUser();
  if (!canOpen(entity, user)) notFound();

  const record = getRecord(entity, id);
  if (!record) notFound();

  const fields = visibleFields(entity, user.role);
  const refMaps = refMapsFor(entity);
  const title = recordTitle(entity, record);

  const statusField = fields.find((f) => f.name === "status" || f.name === "type");

  const subtitleField = entity.subtitleField
    ? fields.find((f) => f.name === entity.subtitleField)
    : undefined;
  const subtitle =
    subtitleField && record[subtitleField.name]
      ? subtitleField.options
        ? optionLabel(subtitleField, record[subtitleField.name])
        : String(record[subtitleField.name])
      : null;
  const notes = listNotes(entity.key, id);
  const files = listFilesFor(entity.key, id);
  const events = listActivity(entity.key, id);

  // group the detail fields the same way the form does
  const groups = new Map<string, typeof fields>();
  for (const field of fields) {
    if (field.name === entity.titleField) continue;
    if (field.type === "richtext") continue;
    if (statusField && field.name === statusField.name) continue; // already in the header
    const key = field.group ?? "Details";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(field);
  }
  const longFields = fields.filter((f) => f.type === "richtext");

  return (
    <>
      <PageHeader
        eyebrow={entity.singular}
        title={title}
        back={{ href: `/${entity.key}`, label: entity.label }}
        actions={
          <>
            {entity.key === "invoices" && record.status !== "paid" && isEnabled("payments") && (
              <Link
                href={`/payments/new?invoice_id=${record.id}&vendor_id=${record.vendor_id ?? ""}&amount=${outstandingOf(record.id, record.amount)}`}
                className="btn"
              >
                <Icon name="card" className="w-3.5 h-3.5" />
                Record payment
              </Link>
            )}
            <Link href={`/${entity.key}/${id}/edit`} className="btn btn-primary">
              Edit
            </Link>
            {atLeast(user.role, "manager") && (
              <DeleteRecordButton entityKey={entity.key} recordId={id} label={entity.singular} />
            )}
          </>
        }
      />

      {statusField && (
        <div className="flex flex-wrap items-center gap-2 -mt-2 mb-6">
          <Chip tone={optionTone(statusField, record[statusField.name])}>
            {optionLabel(statusField, record[statusField.name])}
          </Chip>
          {subtitle && (
            <span className="text-sm" style={{ color: "var(--ink-3)" }}>
              {subtitle}
            </span>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Extras entityKey={entity.key} record={record} role={user.role} />

          {Array.from(groups.entries()).map(([group, groupFields]) => (
            <Card key={group} title={group}>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                {groupFields.map((field) => (
                  <div key={field.name} className={field.full ? "sm:col-span-2" : ""}>
                    <div className="label">{field.label}</div>
                    <div className="text-sm">
                      {field.type === "textarea" ? (
                        <Lines text={record[field.name]} />
                      ) : (
                        <FieldValue field={field} row={record} refMaps={refMaps} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {longFields.map((field) => (
            <Card key={field.name} title={field.label}>
              <Lines text={record[field.name]} />
            </Card>
          ))}

          {(entity.related ?? []).map((rel) => {
            const child = ENTITIES[rel.entity];
            if (!canOpen(child, user)) return null;
            const rows = relatedRecords(rel, id);
            const childColumns = visibleFields(child, user.role).filter((f) => f.inList && f.name !== rel.fk);
            return (
              <Card
                key={rel.label}
                title={`${rel.label} (${rows.length})`}
                dense
                action={
                  <Link
                    href={`/${rel.entity}/new?${rel.fk}=${id}`}
                    className="btn btn-sm"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    Add
                  </Link>
                }
              >
                <DataTable
                  entity={child}
                  rows={rows}
                  columns={childColumns}
                  refMaps={refMapsFor(child)}
                  emptyTitle={`No ${rel.label.toLowerCase()} linked yet`}
                  emptyHint="Use Add to create one against this record."
                />
              </Card>
            );
          })}
        </div>

        <div className="space-y-5">
          <NotesPanel entity={entity.key} entityId={id} notes={notes} />
          <FilesPanel entity={entity.key} entityId={id} files={files} />

          <Card title="History">
            {events.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                Nothing recorded yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {events.map((event) => (
                  <li key={event.id} className="text-sm">
                    <span style={{ color: "var(--ink-2)" }}>{event.summary}</span>
                    <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                      {event.actor_name ?? "System"} · {timeAgo(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------- extras

function outstandingOf(invoiceId: string, amount: number): number {
  const paid = one<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = ?`,
    [invoiceId],
  );
  return Math.max(0, Number(amount ?? 0) - Number(paid?.total ?? 0));
}

/** Entity-specific summary strips that a generic field grid cannot express. */
function Extras({
  entityKey,
  record,
  role,
}: {
  entityKey: string;
  record: Record<string, any>;
  role: string;
}) {
  if (entityKey === "invoices") {
    const paid = Number(
      one<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = ?`,
        [record.id],
      )?.total ?? 0,
    );
    const outstanding = Math.max(0, Number(record.amount ?? 0) - paid);
    return (
      <div className="grid grid-cols-3 gap-3">
        <Figure label="Invoiced" value={money(record.amount, record.currency)} />
        <Figure label="Paid" value={money(paid, record.currency)} tone="good" />
        <Figure
          label="Outstanding"
          value={money(outstanding, record.currency)}
          tone={outstanding > 0 ? "bad" : "good"}
        />
      </div>
    );
  }

  if (entityKey === "vendors") {
    if (!isEnabled("invoices")) {
      const properties = all<{ name: string; id: string }>(
        `SELECT p.id, p.name FROM properties p
           JOIN vendor_properties vp ON vp.property_id = p.id
          WHERE vp.vendor_id = ? ORDER BY p.name`,
        [record.id],
      );
      const openTasks = one<{ c: number }>(
        `SELECT COUNT(*) AS c FROM tasks WHERE vendor_id = ? AND status != 'done'`,
        [record.id],
      )?.c;
      return (
        <div className="grid grid-cols-2 gap-3">
          <Figure label="Open tasks" value={String(openTasks ?? 0)} />
          <Figure label="Properties serviced" value={String(properties.length)} />
        </div>
      );
    }
    const spend = one<{ total: number; c: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS c FROM invoices
        WHERE vendor_id = ? AND status != 'void' AND issue_date >= ?`,
      [record.id, `${new Date().getFullYear()}-01-01`],
    );
    const open = one<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM invoices
        WHERE vendor_id = ? AND status IN ('unpaid', 'partial')`,
      [record.id],
    );
    const properties = all<{ name: string; id: string }>(
      `SELECT p.id, p.name FROM properties p
         JOIN vendor_properties vp ON vp.property_id = p.id
        WHERE vp.vendor_id = ? ORDER BY p.name`,
      [record.id],
    );
    return (
      <>
        <div className="grid grid-cols-3 gap-3">
          <Figure label={`Spend ${new Date().getFullYear()}`} value={money(spend?.total)} />
          <Figure label="Open balance" value={money(open?.total)} tone={Number(open?.total) > 0 ? "warn" : "good"} />
          <Figure label="Properties serviced" value={String(properties.length)} />
        </div>
        {properties.length > 0 && (
          <Card title="Properties serviced">
            <div className="flex flex-wrap gap-2">
              {properties.map((p) => (
                <Link key={p.id} href={`/properties/${p.id}`} className="chip chip-info">
                  {p.name}
                </Link>
              ))}
            </div>
          </Card>
        )}
      </>
    );
  }

  if (entityKey === "employees" && isEnabled("tasks")) {
    const openTasks = one<{ c: number }>(
      `SELECT COUNT(*) AS c FROM tasks WHERE assignee_id = ? AND status != 'done'`,
      [record.id],
    )?.c;
    const allowance = Number(record.vacation_allowance ?? 0);
    const used = Number(record.vacation_used ?? 0);
    return (
      <div className="grid grid-cols-3 gap-3">
        <Figure label="Open tasks" value={String(openTasks ?? 0)} />
        {atLeast(role as never, "admin") ? (
          <>
            <Figure label="Vacation days left" value={String(Math.max(0, allowance - used))} />
            <Figure
              label="Started"
              value={record.start_date ? formatDate(record.start_date) : "—"}
            />
          </>
        ) : (
          <Figure
            label="Started"
            value={record.start_date ? formatDate(record.start_date) : "—"}
          />
        )}
      </div>
    );
  }

  if (entityKey === "properties" && isEnabled("vendors")) {
    const vendors = all<{ id: string; name: string; category: string }>(
      `SELECT v.id, v.name, v.category FROM vendors v
         JOIN vendor_properties vp ON vp.vendor_id = v.id
        WHERE vp.property_id = ? ORDER BY v.name`,
      [record.id],
    );
    if (!vendors.length) return null;
    return (
      <Card title="Vendors servicing this property">
        <div className="flex flex-wrap gap-2">
          {vendors.map((v) => (
            <Link key={v.id} href={`/vendors/${v.id}`} className="chip chip-info">
              {v.name}
            </Link>
          ))}
        </div>
      </Card>
    );
  }

  return null;
}

function Figure({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const color =
    tone === "neutral" ? "var(--ink)" : `var(--${tone}-fg)`;
  return (
    <div className="panel p-3.5">
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-lg font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
