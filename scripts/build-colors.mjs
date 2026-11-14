// Builds the paint color catalog in public/colors/ from the open-source "colornerd" dataset
// (https://github.com/jpederson/colornerd, MIT license).
//
// Usage:
//   node scripts/build-colors.mjs              downloads the latest data
//   node scripts/build-colors.mjs ./raw-dir    uses JSON files you already downloaded
//
// Each color is stored as [code, name, hex, family, hue, lightness] to keep the files small.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SOURCE = "https://raw.githubusercontent.com/jpederson/colornerd/master/json";

const BRANDS = [
  {
    id: "sherwin-williams",
    name: "Sherwin-Williams",
    // The dataset stores SW codes as plain numbers (7008 → "SW 7008").
    code: (label) => `SW ${String(label).padStart(4, "0")}`,
    dedupeBy: "code",
    note: null,
  },
  {
    id: "benjamin-moore",
    name: "Benjamin Moore",
    code: (label) => String(label),
    dedupeBy: "code", // names are sometimes shortened, so two colors can share one
    note: "Some Benjamin Moore names are shortened and part of the Off-White Collection is missing. Search by code if a name doesn't come up.",
  },
  {
    id: "behr",
    name: "Behr",
    code: (label) => String(label),
    dedupeBy: "name", // the same color is listed under old and current codes
    note: null,
  },
];

export const FAMILIES = [
  "Whites",
  "Neutrals",
  "Grays",
  "Browns",
  "Reds & Pinks",
  "Oranges",
  "Yellows",
  "Greens",
  "Blues",
  "Purples",
];

// ---- Color science: hex → CIE L*C*h (lightness, colorfulness, hue), which matches how eyes see color.
function hexToLch(hex) {
  const n = hex.replace("#", "");
  const lin = (i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [lin(0), lin(2), lin(4)];
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const L = 116 * f(y) - 16;
  const A = 500 * (f(x) - f(y));
  const B = 200 * (f(y) - f(z));
  const C = Math.hypot(A, B);
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { L, C, h };
}

// Sort a color into the kind of family a paint store fan deck uses.
export function familyOf(hex) {
  const { L, C, h } = hexToLch(hex);
  const warm = h >= 30 && h < 110;
  if (L >= 90 && C < 12) return "Whites";
  if (C < 4) return "Grays";
  if (C < 16) {
    if (warm) return L < 40 ? "Browns" : "Neutrals"; // beiges, greiges, taupes
    // Muted colors that still read clearly as blue or green, like navy or sage.
    if (C >= 8 && h >= 200 && h < 290) return "Blues";
    if (C >= 8 && h >= 110 && h < 200) return "Greens";
    return "Grays";
  }
  if (h >= 345 || h < 40) return L < 40 && C < 40 ? "Browns" : "Reds & Pinks";
  if (h < 70) return L < 55 ? "Browns" : "Oranges";
  if (h < 105) return L < 50 ? "Browns" : "Yellows";
  if (h < 200) return "Greens";
  if (h < 290) return "Blues";
  return "Purples";
}

async function load(rawDir, id) {
  if (rawDir) return JSON.parse(await readFile(path.join(rawDir, `${id}.json`), "utf8"));
  const res = await fetch(`${SOURCE}/${id}.json`);
  if (!res.ok) throw new Error(`Download failed for ${id}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const rawDir = process.argv[2];
  const outDir = path.resolve("public/colors");
  await mkdir(outDir, { recursive: true });
  const index = [];

  for (const brand of BRANDS) {
    const raw = await load(rawDir, brand.id);
    const byKey = new Map();
    for (const item of raw) {
      const hex = String(item.hex || "").toLowerCase();
      const name = String(item.name || "").trim();
      if (!/^#[0-9a-f]{6}$/.test(hex) || !name) continue;
      const code = brand.code(item.label);
      // Drop repeated entries. For Behr, keep one per name, preferring codes with letters
      // (the current numbering system).
      const key = brand.dedupeBy === "name" ? name.toLowerCase() : code;
      const existing = byKey.get(key);
      const hasLetters = /[a-z]/i.test(String(item.label));
      if (!existing || (hasLetters && !existing.hasLetters)) {
        byKey.set(key, { code, name, hex, hasLetters });
      }
    }

    const colors = [...byKey.values()].map(({ code, name, hex }) => {
      const { L, h } = hexToLch(hex);
      return [code, name, hex, familyOf(hex), Math.round(h), Math.round(L)];
    });
    colors.sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true }));

    const file = { brand: brand.name, id: brand.id, note: brand.note, families: FAMILIES, colors };
    await writeFile(path.join(outDir, `${brand.id}.json`), JSON.stringify(file));
    index.push({ id: brand.id, name: brand.name, count: colors.length, note: brand.note });
    console.log(`${brand.name}: ${colors.length} colors`);
  }

  await writeFile(
    path.join(outDir, "index.json"),
    JSON.stringify(
      {
        brands: index,
        source: "colornerd by James Pederson (MIT license), https://github.com/jpederson/colornerd",
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
