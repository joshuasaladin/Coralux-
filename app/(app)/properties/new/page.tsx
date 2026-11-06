import { notFound } from "next/navigation";
import PropertyForm from "@/components/PropertyForm";
import { PageHeader } from "@/components/ui";
import { atLeast } from "@/lib/auth";
import { requireSection } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const user = await requireSection("properties", "staff");
  // staff can read a property but not add one
  if (!atLeast(user.role, "manager")) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Properties"
        title="New property"
        back={{ href: "/properties", label: "Properties" }}
      />
      <PropertyForm cancelHref="/properties" />
    </div>
  );
}
