import { notFound } from "next/navigation";
import AccessControl from "@/components/AccessControl";
import { NewUserForm, UserRowControls } from "@/components/AdminUsers";
import { Card, Chip, PageHeader } from "@/components/ui";
import { atLeast, listUsers, requireUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { ENTITIES, ENTITY_KEYS } from "@/lib/entities";
import { formatDate } from "@/lib/format";
import { accessOverview, PERMISSION_SECTIONS } from "@/lib/permissions";
import { refOptions } from "@/lib/records";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireUser();
  if (!atLeast(user.role, "admin")) notFound();

  const users = listUsers();
  const employees = refOptions("employees");
  const access = accessOverview(users);
  const people = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    custom: access[u.id]!.custom,
    keys: access[u.id]!.keys,
    roleDefaultKeys: access[u.id]!.roleDefaultKeys,
    self: u.id === user.id,
  }));

  const counts = ENTITY_KEYS.map((key) => {
    const entity = ENTITIES[key];
    const row = one<{ c: number }>(`SELECT COUNT(*) AS c FROM ${entity.table}`);
    return { label: entity.label, count: row?.c ?? 0 };
  });
  const fileCount = one<{ c: number; bytes: number }>(
    `SELECT COUNT(*) AS c, COALESCE(SUM(size_bytes), 0) AS bytes FROM files`,
  );
  const categories = all<{ kind: string; name: string }>(
    `SELECT kind, name FROM categories ORDER BY kind, sort`,
  );

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Users, permissions & settings"
        blurb="Who can sign in, what each role can see, and what the database currently holds."
      />

      <div className="space-y-5">
        <Card title="Who can sign in" dense>
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="primary">
                      {u.name}
                      <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                        {u.email}
                      </span>
                    </td>
                    <td className="capitalize">{u.role}</td>
                    <td>
                      <Chip tone={u.status === "active" ? "good" : "muted"}>{u.status}</Chip>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <UserRowControls
                          user={{ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status }}
                          isSelf={u.id === user.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Add a user">
          <NewUserForm employees={employees} />
        </Card>

        <Card title="What each role can see">
          <div className="grid sm:grid-cols-2 gap-4">
            {ROLES.map((r) => (
              <div key={r.value} className="rounded-lg p-3" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                <div className="text-sm font-semibold mb-1">{r.label}</div>
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {r.blurb}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--ink-3)" }}>
            Salary, ID and permit fields on an employee record, and any file marked confidential,
            are only ever shown to admins and owners — including in search results.
          </p>
        </Card>

        <Card
          title="Access control"
          dense
          action={
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
              open a person to pick their sections
            </span>
          }
        >
          <AccessControl people={people} sections={PERMISSION_SECTIONS} />
        </Card>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card title="What the database holds">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {counts.map((c) => (
                <li key={c.label} className="flex justify-between">
                  <span style={{ color: "var(--ink-2)" }}>{c.label}</span>
                  <span className="tabular-nums font-medium">{c.count}</span>
                </li>
              ))}
              <li className="flex justify-between">
                <span style={{ color: "var(--ink-2)" }}>Files</span>
                <span className="tabular-nums font-medium">{fileCount?.c ?? 0}</span>
              </li>
            </ul>
          </Card>

          <Card title="Categories">
            <div className="space-y-3">
              {["spend", "file"].map((kind) => (
                <div key={kind}>
                  <div className="label">{kind === "spend" ? "Spend categories" : "File categories"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {categories
                      .filter((c) => c.kind === kind)
                      .map((c) => (
                        <span key={c.name} className="chip chip-muted">
                          {c.name}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                Spend categories used on invoices and expenses are defined in{" "}
                <code>lib/entities.ts</code> — edit them there and every form updates at once.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
