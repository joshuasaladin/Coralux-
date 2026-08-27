/**
 * The Coralux lockup, drawn in CSS + SVG so it stays crisp at any size and
 * recolours itself in dark mode.
 *
 * If you would rather use the original artwork file: drop it into
 * public/logo.svg (or .png) and replace the returned markup with
 *   <img src="/logo.svg" alt="Coralux" style={{ height: size * 1.9 }} />
 * Nothing else in the app needs to change.
 */

export function CoralMark({
  size = 30,
  tight = false,
}: {
  size?: number;
  /** crop to the artwork bounds, so it sits in a wordmark like a letter */
  tight?: boolean;
}) {
  return (
    <svg
      width={tight ? size * 0.86 : size}
      height={size}
      viewBox={tight ? "6 4.5 36 42" : "0 0 48 48"}
      role="img"
      aria-label="Coralux"
      style={{ display: "block", flexShrink: 0 }}
    >
      <g
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* trunk */}
        <path d="M24 45V25" />

        {/* lowest, widest pair */}
        <path d="M24 36c-3.5-1-7-3-10.5-6.5" />
        <path d="M24 36c3.5-1 7-3 10.5-6.5" />
        <path d="M13.5 29.5c-2.5.2-4.5-.6-6.5-2.2" />
        <path d="M34.5 29.5c2.5.2 4.5-.6 6.5-2.2" />

        {/* middle pair */}
        <path d="M24 30c-3-2.5-5.5-6-7-11" />
        <path d="M24 30c3-2.5 5.5-6 7-11" />
        <path d="M17 19c-2-1.2-3-3-3.5-5.5" />
        <path d="M31 19c2-1.2 3-3 3.5-5.5" />

        {/* inner pair */}
        <path d="M24 25c-1.8-3-2.8-7-2.6-11.5" />
        <path d="M24 25c1.8-3 2.8-7 2.6-11.5" />
        <path d="M21.4 13.5c-1-1.6-1.4-3.3-1.3-5.2" />
        <path d="M26.6 13.5c1-1.6 1.4-3.3 1.3-5.2" />

        {/* crown */}
        <path d="M24 25V6.5" />
        <path d="M24 12c-1.4-1.2-2.2-2.8-2.4-4.8" />
        <path d="M24 12c1.4-1.2 2.2-2.8 2.4-4.8" />
      </g>
    </svg>
  );
}

/**
 * Full wordmark: C · coral · RALUX, with the tagline underneath.
 * `size` drives the cap height of the wordmark; everything scales from it.
 */
export default function Logo({
  size = 26,
  tagline = true,
}: {
  size?: number;
  tagline?: boolean;
}) {
  const letter: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: size,
    fontWeight: 500,
    lineHeight: 1,
    color: "var(--wordmark)",
    letterSpacing: "0.02em",
  };

  return (
    <div className="select-none" aria-label="Coralux — Luxury Property Management">
      <div style={{ display: "flex", alignItems: "center", gap: size * 0.04 }}>
        <span style={letter}>C</span>
        <CoralMark size={size * 1.16} tight />
        <span style={{ ...letter, marginLeft: size * 0.02 }}>RALUX</span>
      </div>
      {tagline && (
        <div
          style={{
            fontSize: Math.max(6.5, size * 0.235),
            letterSpacing: "0.24em",
            color: "var(--ink-3)",
            textTransform: "uppercase",
            marginTop: size * 0.18,
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          Luxury Property Management
        </div>
      )}
    </div>
  );
}
