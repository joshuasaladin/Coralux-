import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { notFound } from "next/navigation";
import { atLeast, requireUser } from "@/lib/auth";
import {
  availableYears,
  spendByCategory,
  spendByMonth,
  spendByVendor,
} from "@/lib/dashboard";
import { compactMoney, money, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!atLeast(user.role, "manager")) notFound();

  const query = await searchParams;
  const years = availableYears();
  const year = Number(typeof query.year === "string" ? query.year : years[0]) || years[0];

  const categories = spendByCategory(year);
  const vendors = spendByVendor(year);
  const months = spendByMonth(year);

  const total = categories.reduce((acc, c) => acc + Number(c.total), 0);
  const peakMonth = Math.max(...months.map((m) => m.total), 1);
  const topCategory = categories[0];

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title={`Spend in ${year}`}
        blurb="What the company actually spent, by month, by category and by vendor. Built from the invoice records — nothing typed twice."
        actions={
          <form method="get">
            <select name="year" defaultValue={String(year)} className="select w-auto">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <noscript />
            <button className="btn ml-2">View</button>
          </form>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="panel p-4">
          <div className="eyebrow mb-1">Total invoiced</div>
          <div className="stat-value">{compactMoney(total)}</div>
          <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            across {categories.reduce((a, c) => a + c.invoices, 0)} invoices
          </div>
        </div>
        <div className="panel p-4">
          <div className="eyebrow mb-1">Largest category</div>
          <div className="stat-value">{topCategory ? compactMoney(topCategory.total) : "—"}</div>
          <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            {topCategory ? titleCase(topCategory.category) : "no invoices yet"}
          </div>
        </div>
        <div className="panel p-4">
          <div className="eyebrow mb-1">Vendors used</div>
          <div className="stat-value">{vendors.length}</div>
          <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            billed at least once this year
          </div>
        </div>
      </div>

      <Card title={`Invoiced by month — ${year}`} className="mb-5">
        <div className="flex items-end gap-1.5 sm:gap-2.5 h-52" role="img" aria-label={`Monthly invoiced spend for ${year}`}>
          {months.map((m) => {
            const height = Math.max(2, Math.round((m.total / peakMonth) * 100));
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                <div className="flex-1 w-full flex items-end">
                  <div
                    title={`${m.label} ${year}: ${money(m.total)}`}
                    className="w-full rounded-t-[4px]"
                    style={{
                      height: `${height}%`,
                      background: m.total > 0 ? "var(--brand)" : "var(--line)",
                    }}
                  />
                </div>
                <span className="text-[.68rem] truncate" style={{ color: "var(--ink-3)" }}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
        <table className="table mt-4">
          <thead>
            <tr>
              <th>Month</th>
              <th className="text-right">Invoiced</th>
            </tr>
          </thead>
          <tbody>
            {months
              .filter((m) => m.total > 0)
              .map((m) => (
                <tr key={m.month}>
                  <td className="primary">{m.label} {year}</td>
                  <td className="text-right tabular-nums">{money(m.total)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="By category">
          {categories.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              No invoices recorded for {year}.
            </p>
          ) : (
            <ul className="space-y-3">
              {categories.map((c) => (
                <li key={c.category}>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <Link href={`/invoices?category=${c.category}`} className="text-sm link" style={{ color: "var(--ink)" }}>
                      {titleCase(c.category)}
                    </Link>
                    <span className="text-sm tabular-nums font-medium">{money(c.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (Number(c.total) / (total || 1)) * 100)}%`,
                        background: "var(--brand)",
                      }}
                    />
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
                    {c.invoices} {c.invoices === 1 ? "invoice" : "invoices"} ·{" "}
                    {Math.round((Number(c.total) / (total || 1)) * 100)}% of spend
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="By vendor" dense>
          <table className="table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Invoices</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty">
                    Nothing invoiced in {year}.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.vendor_id ?? v.vendor}>
                    <td className="primary">
                      {v.vendor_id ? (
                        <Link href={`/vendors/${v.vendor_id}`} className="link" style={{ color: "var(--ink)" }}>
                          {v.vendor}
                        </Link>
                      ) : (
                        v.vendor
                      )}
                    </td>
                    <td className="tabular-nums">{v.invoices}</td>
                    <td className="text-right tabular-nums">{money(v.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
