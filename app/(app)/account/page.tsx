import Link from "next/link";
import { PasswordForm, SignOutButton } from "@/components/AccountForms";
import { Card, Chip, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();

  const employee = user.employee_id
    ? one<Record<string, any>>(`SELECT * FROM employees WHERE id = ?`, [user.employee_id])
    : undefined;

  const myTasks = user.employee_id
    ? all<Record<string, any>>(
        `SELECT * FROM tasks WHERE assignee_id = ? AND status != 'done' ORDER BY due_date IS NULL, due_date ASC LIMIT 10`,
        [user.employee_id],
      )
    : [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Account"
        title={user.name}
        blurb={user.email}
        actions={<SignOutButton />}
      />

      <div className="space-y-5">
        <Card title="Your access">
          <div className="flex items-center gap-3">
            <Chip tone="info">{user.role}</Chip>
            {employee && (
              <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                Linked to{" "}
                <Link href={`/employees/${employee.id}`} className="link">
                  {employee.name}
                </Link>
                {employee.position ? ` — ${employee.position}` : ""}
                {employee.start_date ? ` · since ${formatDate(employee.start_date)}` : ""}
              </span>
            )}
          </div>
        </Card>

        {myTasks.length > 0 && (
          <Card title={`Your open tasks (${myTasks.length})`} dense>
            <ul>
              {myTasks.map((task, i) => (
                <li key={task.id} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                  <Link href={`/tasks/${task.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--panel-2)]">
                    <span className="text-sm truncate">{task.title}</span>
                    <span className="text-xs shrink-0" style={{ color: "var(--ink-3)" }}>
                      {task.due_date ? formatDate(task.due_date) : "no due date"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Change your password">
          <PasswordForm />
        </Card>
      </div>
    </div>
  );
}
