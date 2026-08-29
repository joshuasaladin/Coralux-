import { notFound } from "next/navigation";
import RecordForm from "@/components/RecordForm";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getEntity } from "@/lib/entities";
import { canOpen, getRecord, recordTitle, refOptions, visibleFields } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function EditRecordPage({
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
  const options: Record<string, { value: string; label: string }[]> = {};
  for (const field of fields) {
    if (field.type === "ref" && field.ref && !options[field.ref]) {
      options[field.ref] = refOptions(field.ref);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={entity.singular}
        title={`Edit ${recordTitle(entity, record)}`}
        back={{ href: `/${entity.key}/${id}`, label: "Back to record" }}
      />
      <RecordForm
        entityKey={entity.key}
        singular={entity.singular}
        fields={fields}
        record={record}
        refOptions={options}
        cancelHref={`/${entity.key}/${id}`}
      />
    </div>
  );
}
