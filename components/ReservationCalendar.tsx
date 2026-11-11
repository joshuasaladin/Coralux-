import {
  DAY_NAMES,
  listingColour,
  prettyDay,
} from "@/lib/reservations-shared";

export type CalendarRow = {
  id: string;
  listingId: string;
  listingName: string;
  colour: number;
  checkIn: string;
  checkOut: string;
  channel: string;
  /** Null unless the reader is allowed to see guest names. */
  guestName: string | null;
};

type Entry = { row: CalendarRow; kind: "in" | "out" };

/** A month cell only has room for so much before the row stretches. */
const MAX_PER_DAY = 4;

/**
 * The month or week grid.
 *
 * Each day shows the arrivals and departures that fall on it rather than a
 * bar spanning the stay: a turnaround is the thing anyone here acts on, and
 * two properties changing over on the same morning is exactly what needs to
 * stand out.
 *
 * Phones get their own shape, because the cleaners read this on a phone and
 * seven columns of text at 390px is unreadable: a month shows coloured dots
 * you can count at a glance, and a week becomes a plain list of days.
 */
export default function ReservationCalendar({
  days,
  rows,
  view,
  today,
  anchor,
}: {
  days: string[];
  rows: CalendarRow[];
  view: "month" | "week";
  today: string;
  anchor: string;
}) {
  const inMonth = (iso: string) => iso.slice(0, 7) === anchor.slice(0, 7);

  const byDay = new Map<string, Entry[]>();
  for (const day of days) byDay.set(day, []);
  for (const row of rows) {
    byDay.get(row.checkIn)?.push({ row, kind: "in" });
    byDay.get(row.checkOut)?.push({ row, kind: "out" });
  }
  for (const list of byDay.values()) {
    // departures first: the morning's work comes before the afternoon's
    list.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "out" ? -1 : 1));
  }

  return (
    <>
      {view === "week" && (
        <div className="sm:hidden">
          <WeekList days={days} byDay={byDay} today={today} />
        </div>
      )}

      <div className={`panel p-2 sm:p-3 ${view === "week" ? "hidden sm:block" : ""}`}>
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map((name) => (
            <div key={name} className="eyebrow px-1 pb-1 text-center">
              <span className="hidden sm:inline">{name}</span>
              <span className="sm:hidden">{name.slice(0, 1)}</span>
            </div>
          ))}

          {days.map((day) => {
            const entries = byDay.get(day) ?? [];
            const muted = view === "month" && !inMonth(day);
            const shown = view === "month" ? entries.slice(0, MAX_PER_DAY) : entries;
            const hiddenCount = entries.length - shown.length;
            return (
              <div
                key={day}
                className="rounded-lg p-1 sm:p-1.5"
                style={{
                  minHeight: view === "week" ? 190 : 72,
                  background: day === today ? "var(--good-bg)" : "var(--panel-2)",
                  border: `1px solid ${day === today ? "var(--good-fg)" : "var(--line)"}`,
                  opacity: muted ? 0.45 : 1,
                }}
              >
                <div
                  className="text-xs font-semibold mb-1 tabular-nums"
                  style={{ color: day === today ? "var(--good-fg)" : "var(--ink-3)" }}
                >
                  {Number(day.slice(8, 10))}
                </div>

                {/* phones: a mark per movement, countable at arm's length */}
                <div className="sm:hidden flex flex-wrap items-center gap-1">
                  {entries.map(({ row, kind }) => (
                    <Dot key={`${row.id}-${kind}`} row={row} kind={kind} />
                  ))}
                </div>

                <div className="hidden sm:block space-y-1">
                  {shown.map(({ row, kind }) => (
                    <EntryChip key={`${row.id}-${kind}`} row={row} kind={kind} />
                  ))}
                  {hiddenCount > 0 && (
                    <div className="text-[.65rem] px-1.5" style={{ color: "var(--ink-3)" }}>
                      +{hiddenCount} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs mt-3 px-1" style={{ color: "var(--ink-3)" }}>
          <strong style={{ color: "var(--ink-2)" }}>In</strong> is a check-in,{" "}
          <strong style={{ color: "var(--ink-2)" }}>Out</strong> a check-out. A property keeps the
          same colour everywhere.{" "}
          <span className="sm:hidden">
            On a phone a dot is a check-in and a dash a check-out — switch to Week for the
            names.
          </span>
        </p>
      </div>
    </>
  );
}

/** The week, on a phone: one block per day, wide enough to actually read. */
function WeekList({
  days,
  byDay,
  today,
}: {
  days: string[];
  byDay: Map<string, Entry[]>;
  today: string;
}) {
  return (
    <div className="space-y-2">
      {days.map((day) => {
        const entries = byDay.get(day) ?? [];
        return (
          <div
            key={day}
            className="panel p-3"
            style={{
              background: day === today ? "var(--good-bg)" : undefined,
              border: day === today ? "1px solid var(--good-fg)" : undefined,
            }}
          >
            <div
              className="text-xs font-semibold mb-2"
              style={{ color: day === today ? "var(--good-fg)" : "var(--ink-3)" }}
            >
              {prettyDay(day)}
              {day === today && " · today"}
            </div>
            {entries.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                Nothing on this day.
              </p>
            ) : (
              <div className="space-y-1">
                {entries.map(({ row, kind }) => (
                  <EntryChip key={`${row.id}-${kind}`} row={row} kind={kind} wide />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A dot for an arrival, a dash for a departure. Not filled versus hollow:
 * the property chips above already use that for occupied versus empty, and
 * one screen must not give the same mark two meanings.
 */
function Dot({ row, kind }: { row: CalendarRow; kind: "in" | "out" }) {
  const colour = listingColour(row.colour);
  return (
    <span
      data-entry="dot"
      data-kind={kind}
      className="inline-block rounded-full"
      style={{
        width: kind === "in" ? 8 : 11,
        height: kind === "in" ? 8 : 3,
        marginBlock: kind === "in" ? 0 : 2.5,
        background: colour.dot,
      }}
      title={`${kind === "in" ? "Check-in" : "Check-out"} — ${row.listingName}`}
    />
  );
}

function EntryChip({
  row,
  kind,
  wide,
}: {
  row: CalendarRow;
  kind: "in" | "out";
  wide?: boolean;
}) {
  const colour = listingColour(row.colour);
  const label = [row.listingName, row.guestName].filter(Boolean).join(" · ");

  return (
    <div
      data-entry="chip"
      className={`rounded px-1.5 py-1 leading-tight truncate ${wide ? "text-xs" : "text-[.7rem]"}`}
      style={{ background: colour.bg, color: colour.fg }}
      title={`${kind === "in" ? "Check-in" : "Check-out"} — ${label} · ${row.channel}`}
    >
      <span className="font-semibold">{kind === "in" ? "In" : "Out"}</span> {label}
    </div>
  );
}
