import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import Icon from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { ENTITIES, ENTITY_KEYS } from "@/lib/entities";
import { canOpen, listRecords, recordTitle } from "@/lib/records";
import { listAllFiles } from "@/lib/files";
import { atLeast } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const q = (typeof query.q === "string" ? query.q : "").trim();

  const groups = q
    ? ENTITY_KEYS.map((key) => {
        const entity = ENTITIES[key];
        if (!canOpen(entity, user)) return null;
        const rows = listRecords(entity, { search: q, limit: 8 });
        return rows.length ? { entity, rows } : null;
      }).filter(Boolean)
    : [];

  const files = q
    ? listAllFiles({ search: q }).filter((f) => !f.sensitive || atLeast(user.role, "admin")).slice(0, 8)
    : [];

  const hits = groups.reduce((acc, g) => acc + (g?.rows.length ?? 0), 0) + files.length;

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title={q ? `Results for “${q}”` : "Search"}
        blurb={q ? `${hits} ${hits === 1 ? "match" : "matches"} across everything you can see.` : undefined}
      />

      <form method="get" className="relative max-w-xl mb-6">
        <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
        <input name="q" defaultValue={q} className="input input-icon" placeholder="Invoice number, vendor, person, task…" autoFocus />
      </form>

      {!q ? (
        <EmptyState title="Type something to search" hint="Invoices, vendors, contacts, tasks, employees, SOPs, files — all at once." />
      ) : hits === 0 ? (
        <EmptyState title="Nothing found" hint="Try a shorter search — part of a name or an invoice number." />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group!.entity.key} className="panel" style={{ overflow: "hidden" }}>
              <header className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
                <h2 className="text-sm font-semibold">{group!.entity.label}</h2>
                <Link href={`/${group!.entity.key}?q=${encodeURIComponent(q)}`} className="btn btn-ghost btn-sm">
                  See all
                </Link>
              </header>
              <ul>
                {group!.rows.map((row, i) => (
                  <li key={row.id} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                    <Link href={`/${group!.entity.key}/${row.id}`} className="block px-4 py-2.5 hover:bg-[var(--panel-2)]">
                      <span className="text-sm font-medium">{recordTitle(group!.entity, row)}</span>
                      {group!.entity.subtitleField && row[group!.entity.subtitleField!] && (
                        <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                          {String(row[group!.entity.subtitleField!]).replace(/_/g, " ")}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {files.length > 0 && (
            <section className="panel" style={{ overflow: "hidden" }}>
              <header className="px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                <h2 className="text-sm font-semibold">Files</h2>
              </header>
              <ul>
                {files.map((file, i) => (
                  <li key={file.id} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                    <a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer" className="block px-4 py-2.5 hover:bg-[var(--panel-2)] text-sm">
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
