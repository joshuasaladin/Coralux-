import Shell from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { NAV } from "@/lib/entities";
import { customLogo } from "@/lib/branding";
import { canAccessSection } from "@/lib/permissions";
import { pendingUndo } from "@/lib/actions";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  const nav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const key = item.entity ?? item.href.replace(/^\//, "");
      return canAccessSection(user, key, item.minRole ?? "staff");
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <Shell
      nav={nav}
      pendingUndo={await pendingUndo()}
      user={{ name: user.name, email: user.email, role: user.role }}
      logoSrc={customLogo()}
    >
      {children}
    </Shell>
  );
}
