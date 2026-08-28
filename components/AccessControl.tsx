"use client";

import { useTransition } from "react";
import { updateRoleOverrideAction } from "@/lib/actions";
import { ROLES, type Role } from "@/lib/roles";
import type { PermissionSection } from "@/lib/permissions";

/** Which minimum role each section requires — auto-saves on change, no
 * Apply button, same rule as everywhere else in the app. */
export default function AccessControl({
  sections,
  overrides,
}: {
  sections: PermissionSection[];
  overrides: Record<string, Role>;
}) {
  const [pending, startTransition] = useTransition();

  const groups = new Map<string, PermissionSection[]>();
  for (const s of sections) {
    if (!groups.has(s.group)) groups.set(s.group, []);
    groups.get(s.group)!.push(s);
  }

  const handleChange = (key: string, role: Role) => {
    startTransition(() => {
      updateRoleOverrideAction(key, role);
    });
  };

  return (
    <div className="space-y-4" style={{ opacity: pending ? 0.7 : 1 }}>
      {[...groups.entries()].map(([group, items]) => (
        <div key={group}>
          <div className="label mb-1.5">{group}</div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {items.map((s) => {
              const current = overrides[s.key] ?? s.defaultRole;
              const isDefault = !overrides[s.key];
              return (
                <div key={s.key} className="flex items-center justify-between gap-2 py-1">
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                    {s.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!isDefault && <span className="chip chip-info">custom</span>}
                    <select
                      className="select w-auto btn-sm"
                      value={current}
                      aria-label={s.label}
                      onChange={(e) => handleChange(s.key, e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        This is the minimum role required to open each section. Dashboard, Calendar and Admin
        itself always stay open to any signed-in user, so nobody can lock everyone out.
      </p>
    </div>
  );
}
