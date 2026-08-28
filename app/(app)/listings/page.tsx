import Link from "next/link";
import Icon from "@/components/Icon";
import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, relativeDay } from "@/lib/format";
import { listListings, platformLabel, statusLabel, statusTone } from "@/lib/listings";
import { requireSection } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  await requireSection("listings", "staff");
  const listings = listListings();

  const inProgress = listings.filter((l) => l.status === "in_progress");
  const active = listings.filter((l) => l.status === "active");
  const paused = listings.filter((l) => l.status === "paused");

  return (
    <>
      <PageHeader
        eyebrow="Listing Onboarding"
        title="Listing Onboarding"
        blurb="Every new property, from first details collected to live on Airbnb and Guesty — with the checklist to prove it."
        actions={
          <Link href="/listings/new" className="btn btn-primary">
            <Icon name="plus" />
            New listing
          </Link>
        }
      />

      {listings.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No listings yet"
            hint="Add a property to get its onboarding checklist started."
            action={
              <Link href="/listings/new" className="btn btn-primary">
                <Icon name="plus" />
                New listing
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {inProgress.length > 0 && <ListingGroup title="Onboarding" listings={inProgress} />}
          {active.length > 0 && <ListingGroup title="Active" listings={active} />}
          {paused.length > 0 && <ListingGroup title="Paused" listings={paused} />}
        </div>
      )}
    </>
  );
}

function ListingGroup({ title, listings }: { title: string; listings: Record<string, any>[] }) {
  return (
    <section>
      <h2 className="eyebrow mb-2">
        {title} <span className="chip chip-muted ml-1">{listings.length}</span>
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}

function ListingCard({ listing }: { listing: Record<string, any> }) {
  const done = Number(listing.step_done ?? 0);
  const total = Number(listing.step_total ?? 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const relative = listing.target_date ? relativeDay(listing.target_date) : null;
  const overdue = relative?.includes("overdue") && listing.status !== "active";

  return (
    <Link href={`/listings/${listing.id}`} className="panel p-4 block hover:-translate-y-px transition-transform">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>
          {listing.name}
        </span>
        <Chip tone={statusTone(listing.status)}>{statusLabel(listing.status)}</Chip>
      </div>

      {(listing.address || listing.owner_name) && (
        <p className="text-xs mb-3 truncate" style={{ color: "var(--ink-3)" }}>
          {[listing.address, listing.owner_name].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--line)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(listing.status === "active" ? 100 : pct, 2)}%`,
            background: listing.status === "active" ? "var(--good-fg)" : "var(--brand)",
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--ink-3)" }}>
        <span>
          {done}/{total} steps · {platformLabel(listing.platforms)}
        </span>
        {relative && (
          <span style={{ color: overdue ? "var(--bad-fg)" : "var(--ink-3)" }}>
            {listing.status === "active" ? formatDate(listing.target_date) : relative}
          </span>
        )}
      </div>
    </Link>
  );
}
