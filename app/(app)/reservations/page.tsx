import Link from "next/link";
import { localToday } from "@/lib/clock";
import GuestySyncButton from "@/components/GuestySyncButton";
import ReservationCalendar from "@/components/ReservationCalendar";
import Icon from "@/components/Icon";
import { Card, Chip, EmptyState, PageHeader } from "@/components/ui";
import { atLeast } from "@/lib/auth";
import { lastSync, listGuestyListings, occupiedListingIds, reservationsBetween } from "@/lib/guesty";
import { requireSection } from "@/lib/permissions";
import { timeAgo } from "@/lib/format";
import {
  addDays,
  channelLabel,
  isOnCalendar,
  isoDate,
  listingColour,
  monthGrid,
  prettyDay,
  weekStart,
} from "@/lib/reservations-shared";

export const dynamic = "force-dynamic";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSection("reservations", "staff");
  const query = await searchParams;

  // Guest names are personal data. Cleaners need the turnaround, not the
  // guest — so the name is only ever read for a manager and above, and the
  // page below simply never receives it otherwise.
  const seesGuests = atLeast(user.role, "manager");

  const view = query.view === "week" ? "week" : "month";
  // Aruba's date, not the server's UTC one — see lib/clock.ts
  const today = localToday();
  const anchor = typeof query.on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.on) ? query.on : today;

  const listings = listGuestyListings();
  // a filled dot on the chip means somebody is in there right now: from 4 PM
  // on the day they arrive until 11 AM on the day they leave
  const occupied = occupiedListingIds();
  // ?hide=a,b keeps the filter in the URL, so a filtered view is shareable
  const hidden = new Set(
    typeof query.hide === "string" ? query.hide.split(",").filter(Boolean) : [],
  );

  const anchorDate = new Date(`${anchor}T00:00:00`);
  const days =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i))
      : monthGrid(anchorDate.getFullYear(), anchorDate.getMonth());

  const from = days[0]!;
  const to = days[days.length - 1]!;

  // Only what Guesty's own calendar shows: a cancellation, an inquiry or a
  // lapsed hold is not a stay. The rows stay in the database with their
  // status — that is what lets the next sync recognise them — they just have
  // no place on a calendar of who is arriving and leaving.
  const all = reservationsBetween(from, to)
    .filter((r) => !hidden.has(r.guesty_listing_id))
    .filter((r) => isOnCalendar(r.status));
  const rows = all.map((r) => ({
    id: r.id,
    listingId: r.guesty_listing_id,
    listingName: r.listing_name ?? "Unknown listing",
    colour: Number(r.colour ?? 0),
    checkIn: r.check_in,
    checkOut: r.check_out,
    channel: channelLabel(r.channel),
    guestName: seesGuests ? (r.guest_name as string | null) : null,
  }));

  // the next fortnight, whatever the calendar happens to be showing
  const horizonFrom = today;
  const horizonTo = addDays(today, 14);
  const upcoming = reservationsBetween(horizonFrom, horizonTo)
    .filter((r) => !hidden.has(r.guesty_listing_id))
    .filter((r) => isOnCalendar(r.status));

  const arrivals = upcoming
    .filter((r) => r.check_in >= horizonFrom && r.check_in <= horizonTo)
    .sort((a, b) => a.check_in.localeCompare(b.check_in));
  const departures = upcoming
    .filter((r) => r.check_out >= horizonFrom && r.check_out <= horizonTo)
    .sort((a, b) => a.check_out.localeCompare(b.check_out));

  const sync = lastSync();
  const step = view === "week" ? 7 : 0;
  const move = (dir: -1 | 1) => {
    if (view === "week") return addDays(anchor, dir * step);
    const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + dir, 1);
    return isoDate(d);
  };
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view, on: anchor, hide: [...hidden].join(",") || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/reservations?${p.toString()}`;
  };

  const title =
    view === "week"
      ? `Week of ${prettyDay(weekStart(anchor))}`
      : anchorDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        eyebrow="Reservations"
        title={title}
        blurb="Check-ins and check-outs from Guesty, one colour per property."
        actions={
          <>
            <Link href={href({ on: move(-1) })} className="btn btn-sm">
              <Icon name="back" className="w-3.5 h-3.5" />
            </Link>
            <Link href={href({ on: today })} className="btn btn-sm">
              Today
            </Link>
            <Link href={href({ on: move(1) })} className="btn btn-sm">
              <Icon name="chevron" className="w-3.5 h-3.5" />
            </Link>
            {atLeast(user.role, "manager") && <GuestySyncButton />}
          </>
        }
      />

      <div className="flex items-center mb-4" style={{ borderBottom: "1px solid var(--line)" }}>
        <Link href={href({ view: "month" })} className="tab" data-active={view === "month"}>
          Month
        </Link>
        <Link href={href({ view: "week" })} className="tab" data-active={view === "week"}>
          Week
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="Nothing from Guesty yet"
            hint={
              sync?.last_status === "error"
                ? `Last sync failed: ${sync.last_message}`
                : "The first sync runs shortly after the app starts, and every ten minutes after that. A manager can run it now with Sync from Guesty."
            }
          />
        </div>
      ) : (
        <>
          <PropertyFilter
            listings={listings}
            hidden={hidden}
            occupied={occupied}
            href={href}
          />

          <ReservationCalendar days={days} rows={rows} view={view} today={today} anchor={anchor} />

          <div className="grid lg:grid-cols-2 gap-5 mt-5">
            <Card title="Arriving in the next 14 days" dense>
              <Horizon
                rows={arrivals}
                dateKey="check_in"
                seesGuests={seesGuests}
                empty="No arrivals booked."
              />
            </Card>
            <Card title="Leaving in the next 14 days" dense>
              <Horizon
                rows={departures}
                dateKey="check_out"
                seesGuests={seesGuests}
                empty="No departures booked."
              />
            </Card>
          </div>
        </>
      )}

      {sync?.last_run_at && (
        <p className="text-xs mt-5" style={{ color: "var(--ink-3)" }}>
          Last sync {timeAgo(sync.last_run_at)} ·{" "}
          <span style={{ color: sync.last_status === "ok" ? "var(--ink-3)" : "var(--bad-fg)" }}>
            {sync.last_message}
          </span>
        </p>
      )}
    </>
  );
}

/**
 * Tick a property off and it drops out of the calendar and both lists.
 *
 * The dot does double duty: it carries the property's colour, and whether
 * it is filled says whether anyone is staying there today.
 */
function PropertyFilter({
  listings,
  hidden,
  occupied,
  href,
}: {
  listings: Record<string, any>[];
  hidden: Set<string>;
  occupied: Set<string>;
  href: (patch: Record<string, string | undefined>) => string;
}) {
  const toggle = (guestyId: string) => {
    const next = new Set(hidden);
    if (next.has(guestyId)) next.delete(guestyId);
    else next.add(guestyId);
    return href({ hide: [...next].join(",") || undefined });
  };

  const full = occupied.size;

  return (
    <div className="panel p-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {listings.map((listing) => {
          const off = hidden.has(listing.guesty_id);
          const busy = occupied.has(listing.guesty_id);
          const colour = listingColour(Number(listing.colour ?? 0));
          const edge = off ? "var(--line-2)" : colour.dot;
          return (
            <Link
              key={listing.guesty_id}
              href={toggle(listing.guesty_id)}
              className="chip"
              style={{
                background: off ? "transparent" : colour.bg,
                color: off ? "var(--ink-3)" : colour.fg,
                border: `1px solid ${off ? "var(--line-2)" : "transparent"}`,
                textDecoration: off ? "line-through" : "none",
              }}
              title={`${busy ? "Occupied now" : "Empty now"} · ${
                off ? "hidden, click to show" : "click to hide"
              }`}
            >
              <span
                data-occupied={busy ? "yes" : "no"}
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  background: busy ? edge : "transparent",
                  border: `1.5px solid ${edge}`,
                }}
              />
              {listing.nickname || listing.name}
            </Link>
          );
        })}
        {hidden.size > 0 && (
          <Link href={href({ hide: undefined })} className="btn btn-ghost btn-sm ml-auto">
            Show all
          </Link>
        )}
      </div>

      <p className="text-xs mt-2.5" style={{ color: "var(--ink-3)" }}>
        A <strong style={{ color: "var(--ink-2)" }}>filled</strong> dot means a guest is in
        right now, a <strong style={{ color: "var(--ink-2)" }}>hollow</strong> one that it is
        empty — {full} of {listings.length} occupied. A guest counts as in from 4 PM on arrival
        day until 11 AM on departure day. Click a property to hide it.
      </p>
    </div>
  );
}

function Horizon({
  rows,
  dateKey,
  seesGuests,
  empty,
}: {
  rows: Record<string, any>[];
  dateKey: "check_in" | "check_out";
  seesGuests: boolean;
  empty: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={empty} hint="Nothing in the next fortnight." />;
  }
  return (
    <ul>
      {rows.map((r, i) => {
        const colour = listingColour(Number(r.colour ?? 0));
        return (
          <li
            key={`${r.id}-${dateKey}`}
            className="flex items-center gap-3 px-4 py-2.5"
            style={{ borderTop: i ? "1px solid var(--line)" : undefined }}
          >
            <span
              className="text-xs font-semibold w-20 shrink-0 tabular-nums"
              style={{ color: "var(--ink-3)" }}
            >
              {prettyDay(r[dateKey])}
            </span>
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ background: colour.dot }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                {r.listing_name ?? "Unknown listing"}
              </span>
              {seesGuests && r.guest_name && (
                <span className="block text-xs truncate" style={{ color: "var(--ink-3)" }}>
                  {r.guest_name}
                </span>
              )}
            </span>
            <Chip tone="muted">{channelLabel(r.channel)}</Chip>
          </li>
        );
      })}
    </ul>
  );
}
