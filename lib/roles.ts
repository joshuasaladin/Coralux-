/** Client-safe role helpers — no node-only imports here. */
export type Role = "owner" | "admin" | "manager" | "staff";

export const ROLES: { value: Role; label: string; blurb: string }[] = [
  { value: "staff", label: "Staff", blurb: "Tasks, vendors, contacts, properties, SOPs and files." },
  { value: "manager", label: "Manager", blurb: "Everything staff sees, plus invoices, payments, payouts and time off." },
  { value: "admin", label: "Admin", blurb: "Everything, including salaries, ID numbers and user management." },
  { value: "owner", label: "Owner", blurb: "Full access. Cannot be locked out by another admin." },
];

const RANK: Record<Role, number> = { staff: 1, manager: 2, admin: 3, owner: 4 };

export function atLeast(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}
