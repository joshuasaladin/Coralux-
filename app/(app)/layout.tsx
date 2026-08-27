import Shell from "@/components/Shell";
import { atLeast, requireUser } from "@/lib/auth";
import { NAV } from "@/lib/entities";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  const nav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((i) => !i.minRole || atLeast(user.role, i.minRole)),
  })).filter((group) => group.items.length > 0);

  return (
    <Shell nav={nav} user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </Shell>
  );
}
