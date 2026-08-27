import fs from "node:fs";
import path from "node:path";

/**
 * Use the real logo artwork if it is there, otherwise fall back to the
 * drawn wordmark. To use your own file, drop it into the public/ folder as
 * logo.svg (or logo.png / logo.jpg) and it appears everywhere — sidebar,
 * login screen — with no code change.
 */
const CANDIDATES = ["logo.svg", "logo.png", "logo.jpg", "logo.jpeg", "logo.webp"];

let cached: string | null | undefined;

export function customLogo(): string | null {
  if (cached !== undefined) return cached;
  const dir = path.join(process.cwd(), "public");
  cached =
    CANDIDATES.map((name) => (fs.existsSync(path.join(dir, name)) ? `/${name}` : null)).find(
      Boolean,
    ) ?? null;
  return cached;
}
