import Shell from "@/components/Shell";
import { atLeast, requireUser } from "@/lib/auth";
import { NAV } from "@/lib/entities";
import { customLogo } from "@/lib/branding";
import { effectiveMinRole } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  const nav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const key = item.entity ?? item.href.replace(/^\//, "");
      const min = effectiveMinRole(key, item.minRole ?? "staff");
      return atLeast(user.role, min);
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <Shell
      nav={nav}
      user={{ name: user.name, email: user.email, role: user.role }}
      logoSrc={customLogo()}
    >
      {children}
    </Shell>
  );
}
