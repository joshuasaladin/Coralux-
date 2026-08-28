// Regenerates every icon asset from public/coral-mark.png — the single
// source of truth for the brand mark. Run this after replacing that file.
//
//   node scripts/generate-icons.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "public", "coral-mark.png");

if (!fs.existsSync(source)) {
  console.error(`Missing ${source} — drop the coral artwork there first.`);
  process.exit(1);
}

const LIGHT_BG = "#f6f4f2ff";

async function tile(size, marginFrac, background) {
  const inner = Math.round(size * (1 - marginFrac * 2));
  const mark = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, left: offset, top: offset }])
    .png()
    .toBuffer();
}

const targets = [
  // Browser tab favicon — transparent, matches whatever chrome surrounds it.
  {
    file: path.join(root, "app", "icon.png"),
    build: () =>
      sharp(source)
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
  },
  // iOS home screen — opaque light card; iOS renders alpha poorly there.
  { file: path.join(root, "app", "apple-icon.png"), build: () => tile(180, 0.14, LIGHT_BG) },
  // PWA manifest icons — same opaque treatment.
  { file: path.join(root, "public", "icon-192.png"), build: () => tile(192, 0.14, LIGHT_BG) },
  { file: path.join(root, "public", "icon-512.png"), build: () => tile(512, 0.14, LIGHT_BG) },
];

for (const { file, build } of targets) {
  fs.writeFileSync(file, await build());
  console.log(`wrote ${path.relative(root, file)}`);
}
