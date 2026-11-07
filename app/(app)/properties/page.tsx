import Link from "next/link";
import Icon from "@/components/Icon";
import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { atLeast } from "@/lib/auth";
import { listProperties } from "@/lib/properties";
import { requireSection } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const user = await requireSection("properties", "staff");
  const properties = listProperties();
  const canEdit = atLeast(user.role, "manager");

  return (
    <>
      <PageHeader
        eyebrow="Properties"
        title="Properties"
        blurb="Every property under management — how to get in, what the Wi-Fi is, and everything else worth knowing on site."
        actions={
          canEdit ? (
            <Link href="/properties/new" className="btn btn-primary">
              <Icon name="plus" />
              New property
            </Link>
          ) : undefined
        }
      />

      {properties.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No properties yet"
            hint={canEdit ? "Add the first one to start keeping its details in one place." : "Nothing has been added yet."}
            action={
              canEdit ? (
                <Link href="/properties/new" className="btn btn-primary">
                  <Icon name="plus" />
                  New property
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="panel p-4 block hover:-translate-y-px transition-transform"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>
                  {property.name}
                </span>
                {property.status === "inactive" && <Chip tone="muted">Inactive</Chip>}
              </div>
              {property.address && (
                <p className="text-xs mb-2.5" style={{ color: "var(--ink-3)" }}>
                  {property.address}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {property.door_code && <Chip tone="info">Door {property.door_code}</Chip>}
                {property.lockbox_code && <Chip tone="muted">Lockbox {property.lockbox_code}</Chip>}
                {property.wifi_name && <Chip tone="muted">Wi-Fi</Chip>}
                {property.guesty_listing_id && <Chip tone="muted">Guesty</Chip>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
