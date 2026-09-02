import Link from "next/link";
import Icon from "@/components/Icon";
import { Card, Chip, EmptyState, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { redirect } from "next/navigation";
import { canSeeSection, landingPath, sectionKeyFromHref } from "@/lib/permissions";
import {
  attentionItems,
  dashboardSummary,
  lowStock,
  propertyDirectory,
  recentActivity,
  recentFiles,
  todaysCleaning,
  upcomingAgenda,
} from "@/lib/dashboard";
import { compactMoney, formatShortDate, relativeDay, timeAgo } from "@/lib/format";
import { formatTime } from "@/lib/time-options";
import { quoteOfTheDay } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  // Somebody given only the cleaning schedule has no dashboard to land on,
  // so send them to the first section they do have rather than a dead end.
  if (!canSeeSection(user, "overview")) {
    const elsewhere = landingPath(user);
    if (elsewhere && elsewhere !== "/") redirect(elsewhere);
    return <NothingYet name={user.name} />;
  }

  // The dashboard links into every section, so it has to respect the same
  // access rules the nav does — otherwise a section an admin has locked down
  // still shows its counts and record titles here.
  const canSee = (key: string) => canSeeSection(user, key);
  const canFollow = (href: string) => canSee(sectionKeyFromHref(href));

  const s = dashboardSummary(user.role);
  const attention = attentionItems(user.role).filter((i) => canFollow(i.href));
  const agenda = upcomingAgenda(21).filter((i) => canFollow(i.href)).slice(0, 10);
  const activity = recentActivity(8).filter((e) => canSee(String(e.entity)));
  const files = recentFiles(5);
  const ideas = canSee("ideas")
    ? all<Record<string, any>>(
        `SELECT * FROM ideas WHERE status IN ('new', 'exploring') ORDER BY created_at DESC LIMIT 4`,
      )
    : [];

  // A cleaner sees the schedule and the stock cupboard; nobody else needs
  // either on their front page, so both follow the same access rules as
  // everything else here.
  const cleaning = canSee("cleaning") ? todaysCleaning() : [];
  const low = canSee("inventory") ? lowStock() : [];
  const properties = canSee("cleaning") ? propertyDirectory() : [];

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
          {canSee("tasks")
            ? attention.length > 0
              ? `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your attention today.`
              : "Nothing is overdue. Good place to be."
            : cleaning.length > 0
              ? `${cleaning.length} ${cleaning.length === 1 ? "clean" : "cleans"} booked today.`
              : "Nothing booked today."}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {canSee("tasks") && (
          <StatCard
            label="To do"
            value={String(s.openTasks)}
            sub={s.overdueTasks > 0 ? `${s.overdueTasks} overdue` : "nothing overdue"}
            tone={s.overdueTasks > 0 ? "bad" : "good"}
            icon="check"
            href="/tasks?status=todo"
          />
        )}
        {canSee("calendar") && (
          <StatCard
            label="Upcoming"
            value={String(s.upcomingEvents)}
            sub="in the next 14 days"
            tone="info"
            icon="calendar"
            href="/calendar"
          />
        )}
        {canSee("vendors") && (
          <StatCard
            label="Vendors"
            value={String(s.activeVendors)}
            sub="active suppliers"
            tone="neutral"
            icon="wrench"
            href="/vendors"
          />
        )}
        {canSee("ideas") && (
          <StatCard
            label="Ideas"
            value={String(s.newIdeas)}
            sub="new or being explored"
            tone="neutral"
            icon="bulb"
            href="/ideas"
          />
        )}
        {s.seesMoney && canSee("invoices") && (
          <StatCard
            label="Payments due"
            value={compactMoney(s.outstandingTotal)}
            sub={`${s.outstandingCount} open ${s.outstandingCount === 1 ? "invoice" : "invoices"}`}
            tone={s.outstandingTotal > 0 ? "warn" : "good"}
            icon="card"
            href="/invoices?status=unpaid"
          />
        )}
        {s.seesMoney && canSee("payouts") && (
          <StatCard
            label="Payouts scheduled"
            value={compactMoney(s.scheduledPayoutTotal)}
            sub={`${s.scheduledPayoutCount} to release`}
            tone="info"
            icon="bank"
            href="/payouts?status=scheduled"
          />
        )}
      </div>

      {canSee("cleaning") && user.door_code && (
        <div className="panel p-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <div className="eyebrow mb-1">Your door code</div>
            <div className="tabular-nums" style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: ".08em" }}>
              {user.door_code}
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            The same code opens every property. Keep it to yourself — tell a manager straight away
            if anyone else learns it.
          </p>
        </div>
      )}

      {(canSee("cleaning") || canSee("inventory")) && (
        <div className="grid lg:grid-cols-2 gap-5 items-start mb-6">
          {canSee("cleaning") && (
            <Card
              title="Cleaning today"
              dense
              action={
                <Link href="/cleaning" className="btn btn-ghost btn-sm">
                  Full schedule
                  <Icon name="chevron" className="w-3 h-3" />
                </Link>
              }
            >
              {cleaning.length === 0 ? (
                <EmptyState title="Nothing booked today" hint="The schedule is clear." />
              ) : (
                <ul>
                  {cleaning.map((shift, i) => (
                    <li
                      key={shift.id}
                      className="flex items-baseline gap-3 px-4 py-2.5"
                      style={{ borderTop: i ? "1px solid var(--line)" : undefined }}
                    >
                      <span className="text-xs font-semibold tabular-nums w-16 shrink-0" style={{ color: "var(--ink-3)" }}>
                        {formatTime(shift.time_slot)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium" style={{ color: "var(--ink)" }}>
                          {shift.listing || "—"}
                        </span>
                        {shift.notes && (
                          <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                            {shift.notes}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {canSee("inventory") && (
            <Card
              title="Running low"
              dense
              action={
                <Link href="/inventory" className="btn btn-ghost btn-sm">
                  Inventory
                  <Icon name="chevron" className="w-3 h-3" />
                </Link>
              }
            >
              {low.length === 0 ? (
                <EmptyState title="Everything is stocked" hint="Nothing is low or out." />
              ) : (
                <ul>
                  {low.map((item, i) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderTop: i ? "1px solid var(--line)" : undefined }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                          {item.name}
                        </span>
                        {item.location && (
                          <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                            {item.location}
                          </span>
                        )}
                      </span>
                      <span className="text-sm tabular-nums" style={{ color: "var(--ink-3)" }}>
                        {item.quantity}
                        {item.unit ? ` ${item.unit}` : ""}
                      </span>
                      <Chip tone={item.status === "out" ? "bad" : "warn"}>
                        {item.status === "out" ? "Out" : "Low"}
                      </Chip>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}

      {canSee("cleaning") && properties.length > 0 && (
        <Card
          title="Properties"
          dense
          className="mb-6"
          action={
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
              tap an address for directions
            </span>
          }
        >
          <ul className="grid sm:grid-cols-2">
            {properties.map((property, i) => (
              <li
                key={property.id}
                className="px-4 py-2.5"
                style={{ borderTop: i > 1 || (i === 1 && properties.length > 1) ? "1px solid var(--line)" : undefined }}
              >
                <span className="block text-sm font-medium" style={{ color: "var(--ink)" }}>
                  {property.name}
                </span>
                {property.address ? (
                  <a
                    className="text-xs link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {property.address}
                  </a>
                ) : (
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                    no address on file
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* both of these draw on sections a cleaner has no part in, so they
              would only ever sit there empty for one */}
          {(canSee("tasks") || attention.length > 0) && (
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
          )}

          {(canSee("calendar") || canSee("events") || agenda.length > 0) && (
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
          )}
        </div>

        <div className="space-y-5">
          {(canSee("timeoff") || canSee("requests")) && (
            <Card title="Employee items" action={<span className="chip chip-info">{s.employeeItems}</span>}>
              <div className="space-y-2 text-sm">
                {canSee("timeoff") && (
                  <Row href="/timeoff?status=requested" label="Time-off requests" value={s.pendingTimeOff} />
                )}
                {canSee("requests") && (
                  <Row href="/requests?status=submitted" label="Purchase requests" value={s.openRequests} />
                )}
              </div>
            </Card>
          )}

          {canSee("ideas") && (
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
          )}

          {canSee("files") && (
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

/** For an account nobody has given anything to yet. Better than an empty
 * dashboard or a bounce between pages that all refuse to open. */
function NothingYet({ name }: { name: string }) {
  return (
    <div className="panel p-8 text-center">
      <h1 className="section-title mb-2">Nothing to show yet, {name.split(" ")[0]}</h1>
      <p className="text-sm max-w-md mx-auto" style={{ color: "var(--ink-3)" }}>
        Your account does not have access to any sections. Ask an administrator to open up the
        parts of Coralux HQ you need.
      </p>
    </div>
  );
}
