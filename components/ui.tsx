import Link from "next/link";
import Icon from "./Icon";
import type { Tone } from "@/lib/entities";

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  blurb,
  actions,
  back,
}: {
  eyebrow?: string;
  title: string;
  blurb?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="btn btn-ghost btn-sm -ml-2 mb-2">
          <Icon name="back" className="w-3.5 h-3.5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <h1
            className="font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontSize: "2rem", lineHeight: 1.15 }}
          >
            {title}
          </h1>
          {blurb && (
            <p className="text-sm mt-1.5 max-w-2xl" style={{ color: "var(--ink-3)" }}>
              {blurb}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
  dense,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={dense ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  href,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string;
  tone?: Tone;
  icon: string;
}) {
  return (
    <Link href={href} className="panel p-4 block hover:-translate-y-px transition-transform">
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className="eyebrow">{label}</span>
        <span
          className="grid place-items-center w-7 h-7 rounded-lg shrink-0"
          style={{ background: `var(--${tone === "neutral" ? "muted" : tone}-bg)`, color: `var(--${tone === "neutral" ? "muted" : tone}-fg)` }}
        >
          <Icon name={icon} className="w-4 h-4" />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
          {sub}
        </div>
      )}
    </Link>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="font-medium" style={{ color: "var(--ink-2)" }}>
        {title}
      </div>
      {hint && <div className="mt-1">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-sm" style={{ color: "var(--ink)" }}>
        {children}
      </div>
    </div>
  );
}

export function Lines({ text }: { text: unknown }) {
  const lines = String(text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return <span style={{ color: "var(--ink-3)" }}>—</span>;
  return (
    <div className="prose-lines text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}
