import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <div className="eyebrow mb-2">404</div>
        <h1 className="section-title mb-2">That page does not exist</h1>
        <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
          The record may have been deleted, or you may not have access to it.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
