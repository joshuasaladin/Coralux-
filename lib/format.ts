export function money(amount: unknown, currency = "AWG"): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "—";
  return `${currency} ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function compactMoney(amount: unknown, currency = "AWG"): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) {
    return `${currency} ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return money(n, currency);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Whole days from today. Negative = in the past. */
export function daysFromToday(value: unknown): number | null {
  if (!value) return null;
  const target = new Date(String(value));
  if (Number.isNaN(target.getTime())) return null;
  const a = new Date(target.toISOString().slice(0, 10));
  const b = new Date(new Date().toISOString().slice(0, 10));
  return Math.round((a.getTime() - b.getTime()) / 864e5);
}

export function relativeDay(value: unknown): string {
  const days = daysFromToday(value);
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days <= 30) return `in ${days} days`;
  return formatDate(value);
}

export function timeAgo(value: unknown): string {
  if (!value) return "";
  const then = new Date(String(value)).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function fileSize(bytes: unknown): string {
  const n = Number(bytes ?? 0);
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function initials(name: unknown): string {
  return String(name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function titleCase(value: unknown): string {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
