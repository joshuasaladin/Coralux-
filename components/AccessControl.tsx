"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Icon from "./Icon";
import { setDoorCodeAction, updateUserAccessAction } from "@/lib/actions";
import type { Role } from "@/lib/roles";
import type { PermissionSection } from "@/lib/permissions";

export type AccessPerson = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Whether an admin has picked their sections by hand. */
  custom: boolean;
  /** What they can open right now, custom or not. */
  keys: string[];
  /** What their role alone would give them, for the reset button. */
  roleDefaultKeys: string[];
  /** The signed-in admin's own row — deliberately not editable. */
  self: boolean;
  /** The code this person uses to open the properties. */
  doorCode: string | null;
};

/**
 * Who can see what, one person at a time. Open somebody up and tick the
 * sections they should have — a cleaner gets the cleaning schedule and the
 * inventory and nothing else. Leave a person alone and they keep whatever
 * their role gives them. Saves as you tick; nothing to press afterwards.
 */
export default function AccessControl({
  people,
  sections,
}: {
  people: AccessPerson[];
  sections: PermissionSection[];
}) {
  const groups = new Map<string, PermissionSection[]>();
  for (const s of sections) {
    if (!groups.has(s.group)) groups.set(s.group, []);
    groups.get(s.group)!.push(s);
  }

  return (
    <div>
      {people.map((person, i) => (
        <PersonRow
          key={person.id}
          person={person}
          groups={groups}
          allKeys={sections.map((s) => s.key)}
          style={{ borderTop: i ? "1px solid var(--line)" : undefined }}
        />
      ))}
      <p className="text-xs px-4 py-3" style={{ color: "var(--ink-3)" }}>
        Untick Dashboard and a person lands straight on the first section they do have — a
        cleaner opens the app on the cleaning schedule. Admin always needs an admin account, so
        nobody can be locked out of the settings that would undo a mistake, and owners always
        have everything.
      </p>
    </div>
  );
}

function PersonRow({
  person,
  groups,
  allKeys,
  style,
}: {
  person: AccessPerson;
  groups: Map<string, PermissionSection[]>;
  allKeys: string[];
  style?: React.CSSProperties;
}) {
  const [keys, setKeys] = useState<string[]>(person.keys);
  const [custom, setCustom] = useState(person.custom);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Owners are not editable, and neither is your own account — the server
  // refuses both, so the UI should not pretend otherwise.
  const locked = person.role === "owner" || person.self;

  const save = (next: string[] | null) => {
    startTransition(async () => {
      const result = await updateUserAccessAction(person.id, next);
      if (result.error) return;
      if (next === null) {
        setCustom(false);
        setKeys(person.roleDefaultKeys);
      } else {
        setCustom(true);
        setKeys(next);
      }
    });
  };

  const toggle = (key: string) => {
    save(keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]);
  };

  return (
    <div style={style}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--panel-2)] transition-colors"
      >
        <span
          className="shrink-0 inline-flex transition-transform"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        >
          <Icon name="chevron" className="w-3.5 h-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
            {person.name}
            {person.self && (
              <span className="text-xs font-normal" style={{ color: "var(--ink-3)" }}>
                {" "}· you
              </span>
            )}
          </span>
          <span className="block text-xs truncate" style={{ color: "var(--ink-3)" }}>
            {person.email}
          </span>
        </span>
        <span className="chip chip-muted capitalize shrink-0">{person.role}</span>
        <span className="text-xs shrink-0 w-28 text-right" style={{ color: "var(--ink-3)" }}>
          {person.role === "owner"
            ? "everything"
            : custom
              ? `${keys.length} ${keys.length === 1 ? "section" : "sections"}`
              : "by role"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ opacity: pending ? 0.6 : 1 }}>
          {locked ? (
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              {person.role === "owner"
                ? "Owners always have access to everything, so there is nothing to set here."
                : "You cannot change your own access — ask another admin if it needs to change."}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={pending}
                  onClick={() => save(allKeys)}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={pending}
                  onClick={() => save([])}
                >
                  Clear all
                </button>
                {custom && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={pending}
                    onClick={() => save(null)}
                    title="Go back to whatever this person's role normally gets"
                  >
                    Reset to role defaults
                  </button>
                )}
                <span className="text-xs ml-auto" style={{ color: "var(--ink-3)" }}>
                  {custom ? "Custom access" : `Following the ${person.role} defaults`}
                </span>
              </div>

              <div className="mb-3">
                <label className="label" htmlFor={`door-${person.id}`}>
                  Door code
                </label>
                <DoorCode person={person} />
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                {[...groups.entries()].map(([group, items]) => (
                  <div key={group} className="mb-2">
                    <div className="label mb-1">{group}</div>
                    {items.map((s) => (
                      <label
                        key={s.key}
                        className="flex items-center gap-2 py-1 cursor-pointer text-sm"
                        style={{ color: "var(--ink-2)" }}
                      >
                        <input
                          type="checkbox"
                          checked={keys.includes(s.key)}
                          disabled={pending}
                          onChange={() => toggle(s.key)}
                          aria-label={`${person.name} — ${s.label}`}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** One person's door code. Saves shortly after you stop typing. */
function DoorCode({ person }: { person: AccessPerson }) {
  const [code, setCode] = useState(person.doorCode ?? "");
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="flex items-center gap-2">
      <input
        id={`door-${person.id}`}
        className="input"
        style={{ maxWidth: 200 }}
        placeholder="e.g. 4417"
        aria-label={`Door code for ${person.name}`}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setSaved(false);
          if (timer.current) clearTimeout(timer.current);
          const next = e.target.value;
          timer.current = setTimeout(() => {
            startTransition(async () => {
              await setDoorCodeAction(person.id, next);
              setSaved(true);
            });
          }, 600);
        }}
      />
      <span className="text-xs" style={{ color: "var(--ink-3)" }}>
        {saved ? "saved" : "opens every property"}
      </span>
    </div>
  );
}
