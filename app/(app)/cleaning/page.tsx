import Link from "next/link";
import CleaningWeekGrid from "@/components/CleaningWeekGrid";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { listShiftsForWeeks, weeksForMonth } from "@/lib/cleaning";
import { requireSection } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CleaningSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSection("cleaning", "staff");
  const query = await searchParams;

  const today = new Date();
  const monthParam = typeof query.month === "string" ? query.month : null;
  const cursor = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), 1);
  if (Number.isNaN(cursor.getTime())) cursor.setTime(Date.now());

  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;
  const weeks = weeksForMonth(year, month);
  const shifts = listShiftsForWeeks(weeks.map((w) => w.start));
  const shiftsByWeek = new Map<string, typeof shifts>();
  for (const week of weeks) shiftsByWeek.set(week.start, []);
  for (const shift of shifts) shiftsByWeek.get(shift.week_start)?.push(shift);

  const todayIso = today.toISOString().slice(0, 10);

  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <PageHeader
        eyebrow="Cleaners"
        title={cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        blurb="The monthly cleaning schedule — click any cell to add a listing and notes for that slot."
        actions={
          <>
            <Link href={`/cleaning?month=${monthKey(prev)}`} className="btn btn-sm">
              <Icon name="back" className="w-3.5 h-3.5" />
            </Link>
            <Link href="/cleaning" className="btn btn-sm">
              This month
            </Link>
            <Link href={`/cleaning?month=${monthKey(next)}`} className="btn btn-sm">
              <Icon name="chevron" className="w-3.5 h-3.5" />
            </Link>
          </>
        }
      />

      <div className="space-y-4">
        {weeks.map((week) => {
          const isPast = week.end < todayIso;
          return (
            <details key={week.start} className="panel" style={{ overflow: "hidden" }} open={!isPast}>
              <summary
                className="px-4 py-3 cursor-pointer flex items-center gap-2 select-none"
                style={{ listStyle: "none", borderBottom: "1px solid var(--line)" }}
              >
                <Icon name="chevron" className="w-3.5 h-3.5 shrink-0 details-chevron" />
                <span className="text-sm font-semibold">Week of {week.label}</span>
                {isPast && <span className="chip chip-muted">past</span>}
                {!isPast && week.start <= todayIso && <span className="chip chip-info">current</span>}
              </summary>
              <CleaningWeekGrid week={week} initialShifts={shiftsByWeek.get(week.start) ?? []} todayIso={todayIso} />
            </details>
          );
        })}
      </div>
    </>
  );
}
