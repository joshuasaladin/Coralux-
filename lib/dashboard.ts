import { all, one } from "./db";
import type { Role } from "./auth";
import { atLeast } from "./auth";
import { isEnabled } from "./entities";
import type { Row } from "./records";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export type Attention = {
  kind: string;
  tone: "bad" | "warn" | "info";
  title: string;
  detail: string;
  href: string;
  when?: string;
};

export function dashboardSummary(role: Role) {
  const seesMoney = atLeast(role, "manager") && isEnabled("invoices");

  const openTasks = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM tasks WHERE status != 'done'`,
  )!.c;
  const overdueTasks = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM tasks WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?`,
    [today()],
  )!.c;

  const outstanding = one<{ total: number; c: number }>(
    `SELECT COALESCE(SUM(i.amount - COALESCE(p.paid, 0)), 0) AS total, COUNT(*) AS c
       FROM invoices i
       LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) p
              ON p.invoice_id = i.id
      WHERE i.status IN ('unpaid', 'partial')`,
  )!;

  const dueThisWeek = one<{ total: number; c: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS c FROM invoices
      WHERE status IN ('unpaid', 'partial') AND due_date IS NOT NULL AND due_date <= ?`,
    [plusDays(7)],
  )!;

  const upcomingEvents = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM events WHERE start_date BETWEEN ? AND ?`,
    [today(), plusDays(14)],
  )!.c;

  const pendingTimeOff = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM time_off WHERE status = 'requested'`,
  )!.c;

  const openRequests = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM requests WHERE status = 'submitted'`,
  )!.c;

  const scheduledPayouts = one<{ total: number; c: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS c FROM payouts WHERE status = 'scheduled'`,
  )!;

  const activeVendors = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM vendors WHERE status = 'active'`,
  )!.c;

  const newIdeas = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM ideas WHERE status IN ('new', 'exploring')`,
  )!.c;

  return {
    seesMoney,
    openTasks,
    overdueTasks,
    outstandingTotal: outstanding.total,
    outstandingCount: outstanding.c,
    dueThisWeekTotal: dueThisWeek.total,
    dueThisWeekCount: dueThisWeek.c,
    upcomingEvents,
    pendingTimeOff,
    openRequests,
    employeeItems: pendingTimeOff + openRequests,
    scheduledPayoutTotal: scheduledPayouts.total,
    scheduledPayoutCount: scheduledPayouts.c,
    activeVendors,
    newIdeas,
  };
}

/** The "what needs attention today" list. */
export function attentionItems(role: Role, limit = 12): Attention[] {
  const items: Attention[] = [];
  const seesMoney = atLeast(role, "manager") && isEnabled("invoices");

  if (isEnabled("tasks")) for (const t of all<Row>(
    `SELECT t.*, e.name AS assignee FROM tasks t
       LEFT JOIN employees e ON e.id = t.assignee_id
      WHERE t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date <= ?
      ORDER BY t.due_date ASC LIMIT 8`,
    [today()],
  )) {
    items.push({
      kind: "Task",
      tone: t.due_date < today() ? "bad" : "warn",
      title: t.title,
      detail: t.assignee ? `Assigned to ${t.assignee}` : "Unassigned",
      href: `/tasks/${t.id}`,
      when: t.due_date,
    });
  }

  if (seesMoney) {
    for (const i of all<Row>(
      `SELECT i.*, v.name AS vendor FROM invoices i
         LEFT JOIN vendors v ON v.id = i.vendor_id
        WHERE i.status IN ('unpaid', 'partial') AND i.due_date IS NOT NULL AND i.due_date <= ?
        ORDER BY i.due_date ASC LIMIT 8`,
      [plusDays(7)],
    )) {
      items.push({
        kind: "Invoice",
        tone: i.due_date < today() ? "bad" : "warn",
        title: `#${i.invoice_number} — ${i.vendor ?? "Unknown vendor"}`,
        detail: `${i.currency} ${Number(i.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        href: `/invoices/${i.id}`,
        when: i.due_date,
      });
    }

    for (const c of all<Row>(
      `SELECT * FROM contracts
        WHERE status IN ('active', 'expiring') AND end_date IS NOT NULL AND end_date <= ?
        ORDER BY end_date ASC LIMIT 5`,
      [plusDays(60)],
    )) {
      items.push({
        kind: "Contract",
        tone: "warn",
        title: c.name,
        detail: c.auto_renew ? "Renews automatically — cancel before the notice date" : "Expires — renew or replace",
        href: `/contracts/${c.id}`,
        when: c.end_date,
      });
    }
  }

  if (isEnabled("employees")) for (const p of all<Row>(
    `SELECT * FROM employees
      WHERE work_permit_expiry IS NOT NULL AND work_permit_expiry <= ? AND status != 'former'
      ORDER BY work_permit_expiry ASC LIMIT 4`,
    [plusDays(120)],
  )) {
    items.push({
      kind: "Employee",
      tone: "warn",
      title: `${p.name} — work permit expires`,
      detail: "Start the renewal paperwork",
      href: `/employees/${p.id}`,
      when: p.work_permit_expiry,
    });
  }

  if (isEnabled("requests")) for (const r of all<Row>(
    `SELECT r.*, e.name AS requester FROM requests r
       LEFT JOIN employees e ON e.id = r.requester_id
      WHERE r.status = 'submitted' ORDER BY r.created_at ASC LIMIT 5`,
  )) {
    items.push({
      kind: "Request",
      tone: "info",
      title: r.title,
      detail: r.requester ? `From ${r.requester} — needs a decision` : "Needs a decision",
      href: `/requests/${r.id}`,
    });
  }

  if (isEnabled("timeoff")) for (const t of all<Row>(
    `SELECT t.*, e.name AS employee FROM time_off t
       LEFT JOIN employees e ON e.id = t.employee_id
      WHERE t.status = 'requested' ORDER BY t.start_date ASC LIMIT 5`,
  )) {
    items.push({
      kind: "Time off",
      tone: "info",
      title: `${t.employee ?? "Employee"} — ${t.days ?? "?"} days ${t.type}`,
      detail: "Awaiting approval",
      href: `/timeoff/${t.id}`,
      when: t.start_date,
    });
  }

  const rank = { bad: 0, warn: 1, info: 2 };
  return items
    .sort((a, b) => {
      if (rank[a.tone] !== rank[b.tone]) return rank[a.tone] - rank[b.tone];
      return String(a.when ?? "9999").localeCompare(String(b.when ?? "9999"));
    })
    .slice(0, limit);
}

export function upcomingAgenda(days = 21) {
  const events = all<Row>(
    `SELECT e.*, p.name AS property FROM events e
       LEFT JOIN properties p ON p.id = e.property_id
      WHERE e.start_date BETWEEN ? AND ? ORDER BY e.start_date ASC`,
    [today(), plusDays(days)],
  ).map((e) => ({
    date: e.start_date as string,
    time: e.start_time as string | null,
    title: e.title as string,
    kind: e.type as string,
    href: `/events/${e.id}`,
    detail: (e.location ?? e.property ?? "") as string,
  }));

  const tasks = (isEnabled("tasks") ? all<Row>(
    `SELECT t.*, em.name AS assignee FROM tasks t
       LEFT JOIN employees em ON em.id = t.assignee_id
      WHERE t.status != 'done' AND t.due_date BETWEEN ? AND ? ORDER BY t.due_date ASC`,
    [today(), plusDays(days)],
  ) : []).map((t) => ({
    date: t.due_date as string,
    time: null,
    title: t.title as string,
    kind: "task",
    href: `/tasks/${t.id}`,
    detail: (t.assignee ?? "Unassigned") as string,
  }));

  return [...events, ...tasks].sort((a, b) => a.date.localeCompare(b.date));
}

export function recentActivity(limit = 12) {
  return all<Row>(
    `SELECT a.*, u.name AS actor_name FROM activity a
       LEFT JOIN users u ON u.id = a.actor_id
      ORDER BY a.created_at DESC LIMIT ?`,
    [limit],
  );
}

export function recentFiles(limit = 6) {
  return all<Row>(
    `SELECT f.*, u.name AS uploader FROM files f
       LEFT JOIN users u ON u.id = f.uploaded_by
      ORDER BY f.created_at DESC LIMIT ?`,
    [limit],
  );
}

/** Spend by category for the reports page. */
export function spendByCategory(year: number) {
  return all<{ category: string; total: number; invoices: number }>(
    `SELECT COALESCE(category, 'other') AS category,
            SUM(amount) AS total,
            COUNT(*) AS invoices
       FROM invoices
      WHERE status != 'void' AND issue_date LIKE ?
      GROUP BY COALESCE(category, 'other')
      ORDER BY total DESC`,
    [`${year}%`],
  );
}

export function spendByVendor(year: number, limit = 10) {
  return all<{ vendor_id: string; vendor: string; total: number; invoices: number }>(
    `SELECT i.vendor_id, COALESCE(v.name, 'Unassigned') AS vendor,
            SUM(i.amount) AS total, COUNT(*) AS invoices
       FROM invoices i LEFT JOIN vendors v ON v.id = i.vendor_id
      WHERE i.status != 'void' AND i.issue_date LIKE ?
      GROUP BY i.vendor_id ORDER BY total DESC LIMIT ?`,
    [`${year}%`, limit],
  );
}

export function spendByMonth(year: number) {
  const rows = all<{ month: string; total: number }>(
    `SELECT substr(issue_date, 1, 7) AS month, SUM(amount) AS total
       FROM invoices
      WHERE status != 'void' AND issue_date LIKE ?
      GROUP BY month ORDER BY month`,
    [`${year}%`],
  );
  const map = new Map(rows.map((r) => [r.month, r.total]));
  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { month, label: new Date(`${month}-01`).toLocaleDateString("en-GB", { month: "short" }), total: map.get(month) ?? 0 };
  });
}

export function availableYears(): number[] {
  const rows = all<{ y: string }>(
    `SELECT DISTINCT substr(issue_date, 1, 4) AS y FROM invoices WHERE issue_date IS NOT NULL ORDER BY y DESC`,
  );
  const years = rows.map((r) => Number(r.y)).filter((n) => Number.isFinite(n));
  const current = new Date().getFullYear();
  if (!years.includes(current)) years.unshift(current);
  return years;
}
