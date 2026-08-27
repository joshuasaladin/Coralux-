import Link from "next/link";
import Icon from "@/components/Icon";
import { Card, Chip, EmptyState, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { isEnabled, isPageEnabled } from "@/lib/entities";
import {
  attentionItems,
  dashboardSummary,
  recentActivity,
  recentFiles,
  upcomingAgenda,
} from "@/lib/dashboard";
import { compactMoney, formatShortDate, relativeDay, timeAgo } from "@/lib/format";
import { quoteOfTheDay } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const s = dashboardSummary(user.role);
  const attention = attentionItems(user.role);
  const agenda = upcomingAgenda(21).slice(0, 10);
  const activity = recentActivity(8);
  const files = recentFiles(5);
  const ideas = all<Record<string, any>>(
    `SELECT * FROM ideas WHERE status IN ('new', 'exploring') ORDER BY created_at DESC LIMIT 4`,
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const quote = quoteOfTheDay();

  return (
    <>
      <div className="mb-6">
        <div className="eyebrow mb-1">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        <h1
          className="font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontSize: "2.15rem", lineHeight: 1.1 }}
        >
          {greeting}, {user.name.split(" ")[0]}
        </h1>

        <figure
          className="mt-3 mb-3.5 pl-3.5"
          style={{ borderLeft: "2px solid color-mix(in srgb, var(--brand) 45%, transparent)" }}
        >
          <blockquote
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.0625rem",
              lineHeight: 1.45,
              color: "var(--ink-2)",
              fontStyle: "italic",
            }}
          >
            “{quote.text}”
          </blockquote>
          <figcaption className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            {quote.author}
          </figcaption>
        </figure>

        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {attention.length > 0
            ? `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your attention today.`
            : "Nothing is overdue. Good place to be."}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="To do"
          value={String(s.openTasks)}
          sub={s.overdueTasks > 0 ? `${s.overdueTasks} overdue` : "nothing overdue"}
          tone={s.overdueTasks > 0 ? "bad" : "good"}
          icon="check"
          href="/tasks?status=todo"
        />
        <StatCard
          label="Upcoming"
          value={String(s.upcomingEvents)}
          sub="in the next 14 days"
          tone="info"
          icon="calendar"
          href="/calendar"
        />
        <StatCard
          label="Vendors"
          value={String(s.activeVendors)}
          sub="active suppliers"
          tone="neutral"
          icon="wrench"
          href="/vendors"
        />
        <StatCard
          label="Ideas"
          value={String(s.newIdeas)}
          sub="new or being explored"
          tone="neutral"
          icon="bulb"
          href="/ideas"
        />
        {s.seesMoney && (
          <>
            <StatCard
              label="Payments due"
              value={compactMoney(s.outstandingTotal)}
              sub={`${s.outstandingCount} open ${s.outstandingCount === 1 ? "invoice" : "invoices"}`}
              tone={s.outstandingTotal > 0 ? "warn" : "good"}
              icon="card"
              href="/invoices?status=unpaid"
            />
            <StatCard
              label="Payouts scheduled"
              value={compactMoney(s.scheduledPayoutTotal)}
              sub={`${s.scheduledPayoutCount} to release`}
              tone="info"
              icon="bank"
              href="/payouts?status=scheduled"
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card
            title="Needs attention"
            dense
            action={
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                overdue first
              </span>
            }
          >
            {attention.length === 0 ? (
              <EmptyState title="All clear" hint="Nothing overdue or waiting on a decision." />
            ) : (
              <ul>
                {attention.map((item, i) => (
                  <li key={`${item.href}-${i}`} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--panel-2)] transition-colors"
                    >
                      <span
                        className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: `var(--${item.tone}-fg)` }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                          {item.title}
                        </span>
                        <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                          {item.kind} · {item.detail}
                        </span>
                      </span>
                      {item.when && (
                        <span
                          className="text-xs shrink-0 whitespace-nowrap"
                          style={{ color: item.tone === "bad" ? "var(--bad-fg)" : "var(--ink-3)" }}
                        >
                          {relativeDay(item.when)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Next three weeks"
            dense
            action={
              <Link href="/calendar" className="btn btn-ghost btn-sm">
                Open calendar
                <Icon name="chevron" className="w-3 h-3" />
              </Link>
            }
          >
            {agenda.length === 0 ? (
              <EmptyState title="Nothing scheduled" hint="Add an event or give a task a due date." />
            ) : (
              <ul>
                {agenda.map((item, i) => (
                  <li key={`${item.href}-${i}`} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                    <Link href={item.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--panel-2)] transition-colors">
                      <span
                        className="text-xs font-semibold tabular-nums w-14 shrink-0"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {formatShortDate(item.date)}
                      </span>
                      <span className="text-sm flex-1 truncate" style={{ color: "var(--ink)" }}>
                        {item.title}
                      </span>
                      <Chip tone={item.kind === "task" ? "neutral" : "info"}>{item.kind === "task" ? "Task" : item.kind}</Chip>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {(isEnabled("timeoff") || isEnabled("requests")) && (
            <Card title="Employee items" action={<span className="chip chip-info">{s.employeeItems}</span>}>
              <div className="space-y-2 text-sm">
                {isEnabled("timeoff") && (
                  <Row href="/timeoff?status=requested" label="Time-off requests" value={s.pendingTimeOff} />
                )}
                {isEnabled("requests") && (
                  <Row href="/requests?status=submitted" label="Purchase requests" value={s.openRequests} />
                )}
              </div>
            </Card>
          )}

          <Card
            title="Ideas"
            action={
              <Link href="/ideas" className="btn btn-ghost btn-sm">
                All
              </Link>
            }
          >
            {ideas.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                No open ideas.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {ideas.map((idea) => (
                  <li key={idea.id}>
                    <Link href={`/ideas/${idea.id}`} className="text-sm link" style={{ color: "var(--ink)" }}>
                      {idea.title}
                    </Link>
                    {idea.description && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--ink-3)" }}>
                        {idea.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isPageEnabled("/files") && (
          <Card
            title="Recent files"
            action={
              <Link href="/files" className="btn btn-ghost btn-sm">
                All
              </Link>
            }
          >
            {files.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                No files uploaded yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center gap-2">
                    <Icon name="file" className="w-4 h-4 shrink-0" />
                    <a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer" className="text-sm link truncate flex-1">
                      {file.name}
                    </a>
                    <span className="text-xs shrink-0" style={{ color: "var(--ink-3)" }}>
                      {timeAgo(file.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          )}

          <Card title="Recent activity">
            {activity.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                Nothing yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {activity.map((event) => (
                  <li key={event.id} className="text-sm">
                    <Link href={`/${event.entity}/${event.entity_id}`} className="link" style={{ color: "var(--ink-2)" }}>
                      {event.summary}
                    </Link>
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

function Row({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="flex items-center justify-between hover:opacity-75">
      <span style={{ color: "var(--ink-2)" }}>{label}</span>
      <span className={`chip ${value > 0 ? "chip-warn" : "chip-muted"}`}>{value}</span>
    </Link>
  );
}
