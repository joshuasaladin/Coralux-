import Link from "next/link";
import Icon from "@/components/Icon";
import { Card, PageHeader } from "@/components/ui";
import { atLeast, requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { isEnabled } from "@/lib/entities";
import { formatTime } from "@/lib/time-options";

export const dynamic = "force-dynamic";

type Item = { date: string; title: string; kind: string; href: string; tone: string; time?: string | null };

const TONES: Record<string, string> = {
  task: "info",
  invoice: "warn",
  payout: "good",
  meeting: "info",
  deadline: "bad",
  employee: "neutral",
  maintenance: "neutral",
  other: "muted",
  timeoff: "muted",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = await searchParams;

  const today = new Date();
  const monthParam = typeof query.month === "string" ? query.month : null;
  const cursor = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), 1);
  if (Number.isNaN(cursor.getTime())) cursor.setTime(Date.now());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first grid

  const items: Item[] = [];

  for (const e of all<Record<string, any>>(
    `SELECT * FROM events WHERE start_date LIKE ? ORDER BY start_date`,
    [`${monthKey}%`],
  )) {
    items.push({
      date: e.start_date,
      title: e.title,
      kind: e.type,
      href: `/events/${e.id}`,
      tone: TONES[e.type] ?? "info",
      time: e.start_time,
    });
  }

  if (isEnabled("tasks")) for (const t of all<Record<string, any>>(
    `SELECT * FROM tasks WHERE status != 'done' AND due_date LIKE ? ORDER BY due_date`,
    [`${monthKey}%`],
  )) {
    items.push({ date: t.due_date, title: t.title, kind: "task", href: `/tasks/${t.id}`, tone: "info" });
  }

  if (isEnabled("timeoff")) for (const t of all<Record<string, any>>(
    `SELECT tf.*, e.name AS employee FROM time_off tf
       LEFT JOIN employees e ON e.id = tf.employee_id
      WHERE tf.status = 'approved' AND tf.start_date LIKE ?`,
    [`${monthKey}%`],
  )) {
    items.push({
      date: t.start_date,
      title: `${t.employee ?? "Employee"} — ${t.type}`,
      kind: "timeoff",
      href: `/timeoff/${t.id}`,
      tone: "muted",
    });
  }

  if (atLeast(user.role, "manager") && isEnabled("invoices")) {
    for (const i of all<Record<string, any>>(
      `SELECT i.*, v.name AS vendor FROM invoices i LEFT JOIN vendors v ON v.id = i.vendor_id
        WHERE i.status IN ('unpaid', 'partial') AND i.due_date LIKE ?`,
      [`${monthKey}%`],
    )) {
      items.push({
        date: i.due_date,
        title: `${i.vendor ?? "Invoice"} #${i.invoice_number} due`,
        kind: "invoice",
        href: `/invoices/${i.id}`,
        tone: "warn",
      });
    }
    for (const p of all<Record<string, any>>(
      `SELECT * FROM payouts WHERE payout_date LIKE ?`,
      [`${monthKey}%`],
    )) {
      items.push({
        date: p.payout_date,
        title: `Payout — ${p.payee_name}`,
        kind: "payout",
        href: `/payouts/${p.id}`,
        tone: "good",
      });
    }
  }

  const byDay = new Map<number, Item[]>();
  for (const item of items) {
    const d = Number(item.date.slice(8, 10));
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(item);
  }

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title={cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        blurb="Meetings, deadlines, payment dates, employee events and recurring tasks in one view."
        actions={
          <>
            <Link href={`/calendar?month=${key(prev)}`} className="btn btn-sm">
              <Icon name="back" className="w-3.5 h-3.5" />
            </Link>
            <Link href="/calendar" className="btn btn-sm">Today</Link>
            <Link href={`/calendar?month=${key(next)}`} className="btn btn-sm">
              <Icon name="chevron" className="w-3.5 h-3.5" />
            </Link>
            <Link href="/events/new" className="btn btn-primary btn-sm">
              <Icon name="plus" className="w-3.5 h-3.5" />
              Event
            </Link>
          </>
        }
      />

      <div className="panel p-2 sm:p-3 mb-5">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="eyebrow text-center py-1">
              {d}
            </div>
          ))}

          {Array.from({ length: leading }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[92px] rounded-lg" style={{ background: "var(--panel-2)", opacity: .4 }} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const dayItems = byDay.get(d) ?? [];
            const isToday = isThisMonth && today.getDate() === d;
            return (
              <div
                key={d}
                className="min-h-[92px] rounded-lg p-1.5 flex flex-col gap-1"
                style={{
                  background: isToday ? "color-mix(in srgb, var(--brand) 9%, var(--panel))" : "var(--panel-2)",
                  border: isToday ? "1px solid var(--brand)" : "1px solid var(--line)",
                }}
              >
                <div
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: isToday ? "var(--brand-ink)" : "var(--ink-3)" }}
                >
                  {d}
                </div>
                {dayItems.slice(0, 3).map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    className={`chip chip-${item.tone} block truncate text-left`}
                    style={{ fontSize: ".68rem", padding: ".1rem .35rem" }}
                    title={item.title}
                  >
                    {item.time ? `${formatTime(item.time)} ` : ""}
                    {item.title}
                  </Link>
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[.65rem]" style={{ color: "var(--ink-3)" }}>
                    +{dayItems.length - 3} more
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Card title={`Everything in ${cursor.toLocaleDateString("en-GB", { month: "long" })} (${items.length})`} dense>
        {items.length === 0 ? (
          <p className="empty">Nothing scheduled this month.</p>
        ) : (
          <ul>
            {items
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((item, i) => (
                <li key={i} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                  <Link href={item.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--panel-2)]">
                    <span className="text-xs tabular-nums w-16 shrink-0" style={{ color: "var(--ink-3)" }}>
                      {new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-sm flex-1 truncate">{item.title}</span>
                    <span className={`chip chip-${item.tone}`}>{item.kind}</span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </>
  );
}
