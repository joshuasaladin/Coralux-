import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteListingButton from "@/components/DeleteListingButton";
import FilesPanel from "@/components/FilesPanel";
import ListingChecklist from "@/components/ListingChecklist";
import NotesPanel from "@/components/NotesPanel";
import { Card, Chip, Detail, Lines, PageHeader } from "@/components/ui";
import { atLeast, requireUser } from "@/lib/auth";
import { formatDate, relativeDay, timeAgo } from "@/lib/format";
import { listActivity, listFilesFor, listNotes } from "@/lib/records";
import { getListing, listSteps, platformLabel, statusLabel, statusTone, stepProgress } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) notFound();

  const steps = listSteps(id);
  const { done, total } = stepProgress(id);
  const notes = listNotes("listings", id);
  const files = listFilesFor("listings", id);
  const events = listActivity("listings", id);

  const relative = listing.target_date ? relativeDay(listing.target_date) : null;
  const overdue = Boolean(relative?.includes("overdue")) && listing.status !== "active";

  return (
    <>
      <PageHeader
        eyebrow="Listing Onboarding"
        title={listing.name}
        back={{ href: "/listings", label: "Listing Onboarding" }}
        actions={
          <>
            <Link href={`/listings/${id}/edit`} className="btn btn-primary">
              Edit
            </Link>
            {atLeast(user.role, "manager") && <DeleteListingButton id={id} name={listing.name} />}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 -mt-2 mb-6">
        <Chip tone={statusTone(listing.status)}>{statusLabel(listing.status)}</Chip>
        <span className="text-sm" style={{ color: "var(--ink-3)" }}>
          {platformLabel(listing.platforms)}
        </span>
        {relative && (
          <span className="text-sm" style={{ color: overdue ? "var(--bad-fg)" : "var(--ink-3)" }}>
            · target {listing.status === "active" ? formatDate(listing.target_date) : relative}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Figure label="Steps done" value={`${done}/${total}`} tone={done === total && total > 0 ? "good" : "neutral"} />
        <Figure
          label="Progress"
          value={total > 0 ? `${Math.round((done / total) * 100)}%` : "—"}
          tone={listing.status === "active" ? "good" : "neutral"}
        />
        <Figure label="Assigned to" value={listing.assignee || "—"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <ListingChecklist listingId={id} steps={steps} />

          <Card title="Details">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Detail label="Address">{listing.address || "—"}</Detail>
              <Detail label="Owner">{listing.owner_name || "—"}</Detail>
              <Detail label="Going live on">{platformLabel(listing.platforms)}</Detail>
              <Detail label="Target launch date">
                {listing.target_date ? formatDate(listing.target_date) : "—"}
              </Detail>
            </div>
          </Card>

          {listing.notes && (
            <Card title="Notes">
              <Lines text={listing.notes} />
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <NotesPanel entity="listings" entityId={id} notes={notes} />
          <FilesPanel entity="listings" entityId={id} files={files} />

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

function Figure({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good";
}) {
  return (
    <div className="panel p-3.5">
      <div className="eyebrow mb-1">{label}</div>
      <div
        className="text-lg font-semibold tabular-nums truncate"
        style={{ color: tone === "good" ? "var(--good-fg)" : "var(--ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

