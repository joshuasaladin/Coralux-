import Link from "next/link";
import { notFound } from "next/navigation";
import DeletePropertyButton from "@/components/DeleteProperty";
import FilesPanel from "@/components/FilesPanel";
import Icon from "@/components/Icon";
import NotesPanel from "@/components/NotesPanel";
import PropertyFacts from "@/components/PropertyFacts";
import { Card, Chip, Detail, Lines, PageHeader } from "@/components/ui";
import { atLeast } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { getProperty, listFacts, seesEverything } from "@/lib/properties";
import { listActivity, listFilesFor, listNotes } from "@/lib/records";
import { requireSection } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSection("properties", "staff");
  const { id } = await params;
  const property = getProperty(id);
  if (!property) notFound();

  // A cleaner gets what they need on site and nothing else: no owner, no
  // internal notes, no history, and only the details marked as shared.
  const full = seesEverything(user);
  const canEdit = atLeast(user.role, "manager");
  const facts = listFacts(id, !full);

  const mapHref = property.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Properties"
        title={property.name}
        back={{ href: "/properties", label: "Properties" }}
        actions={
          canEdit ? (
            <>
              <Link href={`/properties/${id}/edit`} className="btn btn-primary">
                Edit
              </Link>
              <DeletePropertyButton id={id} name={property.name} />
            </>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2 -mt-2 mb-6">
        {property.status === "inactive" && <Chip tone="muted">Inactive</Chip>}
        {mapHref ? (
          <a className="text-sm link" href={mapHref} target="_blank" rel="noreferrer">
            {property.address}
            <Icon name="chevron" className="w-3 h-3 inline-block ml-1" />
          </a>
        ) : (
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            No address on file
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Getting in">
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <CodeBox label="Door code" value={property.door_code} />
              <CodeBox label="Lockbox" value={property.lockbox_code} />
              {full && <CodeBox label="Alarm" value={property.alarm_code} />}
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Detail label="Wi-Fi network">{property.wifi_name || "—"}</Detail>
              <Detail label="Wi-Fi password">{property.wifi_password || "—"}</Detail>
              <Detail label="Parking">{property.parking || "—"}</Detail>
            </div>
            {property.access_notes && (
              <div className="mt-4">
                <div className="label">Access notes</div>
                <Lines text={property.access_notes} />
              </div>
            )}
          </Card>

          <PropertyFacts propertyId={id} facts={facts} canEdit={canEdit} />

          {full && (
            <Card title="Owner">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                <Detail label="Name">{property.owner_name || "—"}</Detail>
                <Detail label="Email">{property.owner_email || "—"}</Detail>
                <Detail label="Phone">{property.owner_phone || "—"}</Detail>
              </div>
              {property.notes && (
                <div className="mt-4">
                  <div className="label">Internal notes</div>
                  <Lines text={property.notes} />
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {/* documents against a property are the management agreement, the
              owner's paperwork and the like — not a cleaner's business */}
          {full && (
            <>
              <FilesPanel entity="properties" entityId={id} files={listFilesFor("properties", id)} />

              <NotesPanel entity="properties" entityId={id} notes={listNotes("properties", id)} />

              <Card title="History">
                <History events={listActivity("properties", id)} />
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** A code somebody is going to read off a phone at a front door. */
function CodeBox({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="panel p-3.5">
      <div className="eyebrow mb-1">{label}</div>
      <div
        className="tabular-nums"
        style={{
          fontSize: value ? "1.5rem" : "1rem",
          fontWeight: 600,
          letterSpacing: value ? ".06em" : undefined,
          color: value ? "var(--ink)" : "var(--ink-3)",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function History({ events }: { events: Record<string, any>[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Nothing recorded yet.
      </p>
    );
  }
  return (
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
  );
}
