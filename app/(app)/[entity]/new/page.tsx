import { notFound } from "next/navigation";
import RecordForm from "@/components/RecordForm";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getEntity } from "@/lib/entities";
import { canOpen, refOptions, visibleFields } from "@/lib/records";

export const dynamic = "force-dynamic";

const ATTACHABLE = new Set(["invoices", "payments", "payouts", "contracts", "requests"]);

export default async function NewRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entity: entityKey } = await params;
  const entity = getEntity(entityKey);
  if (!entity) notFound();

  const user = await requireUser();
  if (!canOpen(entity, user.role)) notFound();

  const fields = visibleFields(entity, user.role);

  // Prefill from the query string, so "add an invoice for this vendor" works.
  const query = await searchParams;
  const prefill: Record<string, any> = {};
  for (const field of fields) {
    const value = query[field.name];
    if (typeof value === "string" && value) prefill[field.name] = value;
  }
  for (const field of fields) {
    if (prefill[field.name] === undefined && field.required && field.type === "select") {
      prefill[field.name] = field.options?.[0]?.value;
    }
  }
  if (fields.some((f) => f.name === "currency") && !prefill.currency) prefill.currency = "AWG";

  const options: Record<string, { value: string; label: string }[]> = {};
  for (const field of fields) {
    if (field.type === "ref" && field.ref && !options[field.ref]) {
      options[field.ref] = refOptions(field.ref);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={entity.label}
        title={`New ${entity.singular.toLowerCase()}`}
        back={{ href: `/${entity.key}`, label: entity.label }}
      />
      <RecordForm
        entityKey={entity.key}
        singular={entity.singular}
        fields={fields}
        record={prefill}
        refOptions={options}
        cancelHref={`/${entity.key}`}
        allowAttachment={ATTACHABLE.has(entity.key)}
      />
    </div>
  );
}
