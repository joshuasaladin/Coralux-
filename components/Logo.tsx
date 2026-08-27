/**
 * Placeholder coral mark in the Coralux palette. When you have the real logo,
 * drop it in as public/logo.svg and replace the <svg> below with
 * <img src="/logo.svg" width={size} height={size} alt="Coralux" />.
 */
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Coralux" role="img">
      <g
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* trunk */}
        <path d="M24 43V22" />
        {/* first pair of branches */}
        <path d="M24 30c-1.5-3.5-5-4.5-8.5-5.5" />
        <path d="M24 30c1.5-3.5 5-4.5 8.5-5.5" />
        <path d="M15.5 24.5c-.5-2.5-2.5-3.5-3-6" />
        <path d="M32.5 24.5c.5-2.5 2.5-3.5 3-6" />
        {/* second pair */}
        <path d="M24 22c-2-3-3-6.5-2.5-10" />
        <path d="M24 22c2-3 3-6.5 2.5-10" />
        <path d="M21.5 12c-.5-2-2-3-2.5-5" />
        <path d="M26.5 12c.5-2 2-3 2.5-5" />
        {/* crown */}
        <path d="M24 22V9" />
        <path d="M24 13c-1.5-1.5-2-3-2-5" />
        <path d="M24 13c1.5-1.5 2-3 2-5" />
      </g>
    </svg>
  );
}
