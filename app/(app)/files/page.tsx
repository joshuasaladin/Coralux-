import Link from "next/link";
import FileUploadCard from "@/components/FileUploadCard";
import Icon from "@/components/Icon";
import { Card, Chip, EmptyState, PageHeader } from "@/components/ui";
import { deleteFileAction } from "@/lib/actions";
import { atLeast, requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { ENTITIES, type EntityKey } from "@/lib/entities";
import { fileSize, timeAgo } from "@/lib/format";
import { fileLinks, listAllFiles } from "@/lib/files";

export const dynamic = "force-dynamic";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : undefined;
  const category = typeof query.category === "string" ? query.category : undefined;

  const files = listAllFiles({ search, category }).filter(
    (f) => !f.sensitive || atLeast(user.role, "admin"),
  );

  const categories = all<{ name: string }>(
    `SELECT DISTINCT category AS name FROM files WHERE category IS NOT NULL AND category != '' ORDER BY category`,
  ).map((c) => c.name);

  return (
    <>
      <PageHeader
        eyebrow="Files"
        title="Documents"
        blurb="Contracts, forms, templates, licences and company documents — searchable, and linked to the records they belong to."
      />

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-4">
          <form method="get" className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
              <input name="q" defaultValue={search ?? ""} className="input input-icon" placeholder="Search files…" />
            </div>
            <select name="category" defaultValue={category ?? ""} className="select w-auto min-w-[160px]">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button className="btn">Apply</button>
          </form>

          <Card title={`${files.length} ${files.length === 1 ? "file" : "files"}`} dense>
            {files.length === 0 ? (
              <EmptyState title="No files yet" hint="Upload one on the right, or attach it directly to an invoice, vendor or employee." />
            ) : (
              <ul>
                {files.map((file, i) => {
                  const links = fileLinks(file.id);
                  return (
                    <li key={file.id} className="px-4 py-3" style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                      <div className="flex items-start gap-3">
                        <Icon name="file" className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <a
                            href={`/api/files/${file.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="link text-sm font-medium"
                            style={{ color: "var(--ink)" }}
                          >
                            {file.name}
                          </a>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
                            {file.category && <Chip tone="muted">{file.category}</Chip>}
                            {Boolean(file.sensitive) && <Chip tone="bad">Confidential</Chip>}
                            <span>{fileSize(file.size_bytes)}</span>
                            <span>·</span>
                            <span>{file.uploader ?? "Unknown"} · {timeAgo(file.created_at)}</span>
                          </div>
                          {links.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {links.map((link) => {
                                const child = ENTITIES[link.entity as EntityKey];
                                return (
                                  <Link
                                    key={`${link.entity}-${link.entity_id}`}
                                    href={`/${link.entity}/${link.entity_id}`}
                                    className="chip chip-info"
                                  >
                                    {child ? child.singular : link.entity}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {atLeast(user.role, "manager") && (
                          <form action={deleteFileAction}>
                            <input type="hidden" name="file_id" value={file.id} />
                            <button className="btn btn-ghost btn-sm" title="Delete file">
                              <Icon name="trash" className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <FileUploadCard categories={categories} />
      </div>
    </>
  );
}
