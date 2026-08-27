"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { atLeast, type Role } from "@/lib/roles";
import { isEnabled, type EntityKey } from "@/lib/entities";

const OPTIONS: { entity: EntityKey; label: string; icon: string; minRole?: Role }[] = [
  { entity: "tasks", label: "Task", icon: "check" },
  { entity: "events", label: "Calendar event", icon: "calendar" },
  { entity: "ideas", label: "Idea", icon: "bulb" },
  { entity: "vendors", label: "Vendor", icon: "wrench" },
  { entity: "invoices", label: "Invoice", icon: "receipt", minRole: "manager" },
  { entity: "payments", label: "Payment", icon: "card", minRole: "manager" },
  { entity: "payouts", label: "Payout", icon: "bank", minRole: "manager" },
  { entity: "requests", label: "Request", icon: "inbox" },
  { entity: "contacts", label: "Contact", icon: "phone" },
];

export default function QuickAdd({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const visible = OPTIONS.filter(
    (o) => isEnabled(o.entity) && (!o.minRole || atLeast(role, o.minRole)),
  );

  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-primary" onClick={() => setOpen((v) => !v)}>
        <Icon name="plus" />
        <span className="hidden sm:inline">Add</span>
      </button>

      {open && (
        <div
          className="panel absolute right-0 mt-2 w-56 p-1.5 z-50 rise"
          role="menu"
        >
          {visible.map((o) => (
            <Link
              key={o.entity}
              href={`/${o.entity}/new`}
              className="nav-link"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              <Icon name={o.icon} className="w-[17px] h-[17px]" />
              {o.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
