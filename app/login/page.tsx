import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import { currentUser } from "@/lib/auth";
import { customLogo } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const logoSrc = customLogo();

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-9">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Coralux" style={{ maxWidth: 300, maxHeight: 86, objectFit: "contain", objectPosition: "left" }} />
            ) : (
              <Logo size={34} />
            )}
          </div>

          <h1 className="section-title mb-1">Sign in</h1>
          <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
            Everything the company runs on, in one place.
          </p>

          <LoginForm />

          <p className="text-xs mt-8" style={{ color: "var(--ink-3)" }}>
            Accounts are created by an administrator under Admin → Users.
          </p>
        </div>
      </div>

      <div
        className="hidden lg:flex items-center justify-center px-12"
        style={{
          background:
            "linear-gradient(150deg, var(--coral-800, #30434b) 0%, var(--coral-600, #416069) 55%, var(--taupe-700, #5c5250) 100%)",
        }}
      >
        <div className="max-w-md text-white/90">
          <p
            className="mb-6"
            style={{ fontFamily: "var(--font-display)", fontSize: "2rem", lineHeight: 1.25 }}
          >
            One place for every invoice, vendor, task and document — connected, not scattered.
          </p>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li>Open a vendor and see their invoices, contracts and notes together.</li>
            <li>Ask what is unpaid, what is due this week, what a category cost this year.</li>
            <li>Keep salaries, ID documents and contracts behind stricter permissions.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
