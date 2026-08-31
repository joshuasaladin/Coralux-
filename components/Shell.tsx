"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";
import UndoButton, { type PendingUndo } from "./UndoButton";
import Logo from "./Logo";
import QuickAdd from "./QuickAdd";
import type { Role } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: string; minRole?: Role };
type NavGroup = { group: string; items: NavItem[] };

export default function Shell({
  nav,
  user,
  pendingUndo,
  logoSrc,
  children,
}: {
  nav: NavGroup[];
  user: { name: string; email: string; role: Role };
  pendingUndo: PendingUndo | null;
  logoSrc?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-5 pb-4">
        <Link href="/" className="block hover:opacity-80 transition-opacity">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt="Coralux"
              style={{ maxWidth: "100%", maxHeight: 46, objectFit: "contain", objectPosition: "left", display: "block" }}
            />
          ) : (
            <Logo size={26} />
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {nav.map((group) => (
          <div key={group.group}>
            <div className="nav-group">{group.group}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                data-active={isActive(item.href)}
                onClick={() => setOpen(false)}
              >
                <Icon name={item.icon} className="w-[17px] h-[17px] shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--line)" }}>
        <Link href="/account" className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:opacity-80">
          <div
            className="grid place-items-center w-8 h-8 rounded-full text-xs font-semibold shrink-0"
            style={{ background: "var(--info-bg)", color: "var(--info-fg)" }}
          >
            {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs capitalize truncate" style={{ color: "var(--ink-3)" }}>
              {user.role}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* desktop sidebar */}
      <aside
        className="hidden lg:flex w-[248px] shrink-0 flex-col sticky top-0 h-screen"
        style={{ background: "var(--panel)", borderRight: "1px solid var(--line)" }}
      >
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(26,22,20,.45)" }}
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative w-[264px] h-full flex flex-col rise"
            style={{ background: "var(--panel)", borderRight: "1px solid var(--line)" }}
          >
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-7 h-14 backdrop-blur"
          style={{
            background: "color-mix(in srgb, var(--bg) 88%, transparent)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <button
            className="btn btn-ghost btn-sm lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="grid" />
          </button>

          <form action="/search" className="relative flex-1 max-w-md">
            <Icon
              name="search"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              name="q"
              className="input input-icon"
              placeholder="Search tasks, vendors, ideas…"
              autoComplete="off"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <UndoButton pending={pendingUndo} />
            <QuickAdd role={user.role} />
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-7 py-6 lg:py-8 max-w-[1400px] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
