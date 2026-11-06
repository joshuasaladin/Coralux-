import { notFound } from "next/navigation";
import PropertyForm from "@/components/PropertyForm";
import { PageHeader } from "@/components/ui";
import { atLeast } from "@/lib/auth";
import { getProperty } from "@/lib/properties";
import { requireSection } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSection("properties", "staff");
  if (!atLeast(user.role, "manager")) notFound();

  const { id } = await params;
  const property = getProperty(id);
  if (!property) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Properties"
        title={`Edit ${property.name}`}
        back={{ href: `/properties/${id}`, label: "Back to property" }}
      />
      <PropertyForm property={property} cancelHref={`/properties/${id}`} />
    </div>
  );
}
