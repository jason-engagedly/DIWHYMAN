// Paint math: square footage, coats, primer and how much to buy.
// Plain rules and arithmetic only (no AI), so the same inputs always give the same plan.

// Typical sizes and coverage figures used by paint retailers.
export const DEFAULTS = {
  doorSqFt: 21, // standard 3' x 7' door
  windowSqFt: 15, // average 3' x 5' window
  paintCoverageSqFtPerGallon: 350, // most interior paints say 350-400
  primerCoverageSqFtPerGallon: 300, // primer soaks in more, so it covers less
  wasteFactor: 1.05, // 5% for paint soaked into rollers and brushes
};

// Surface problems the photo analysis (or the user) can flag.
export const CONDITIONS = {
  bare_drywall: "New or unpainted drywall",
  patches: "Patched or repaired spots",
  stains: "Stains, water marks or smoke damage",
  glossy_finish: "Glossy or semi-gloss existing paint",
  cracks_or_peeling: "Cracks or peeling paint",
  wallpaper: "Wallpaper on the wall",
};

/**
 * Turn a hex color like "#3a5f8b" into perceived lightness from 0 (black) to 1 (white).
 * Uses relative luminance, the same measure used for contrast checks.
 */
export function lightness(hex) {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Not a valid color: "${hex}". Use a 6-digit hex like #A1B2C3.`);
  }
  const channel = (i) => {
    const v = parseInt(clean.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  // Square root spreads the scale out so mid-tones land near 0.5, closer to how eyes see it.
  return Math.sqrt(luminance);
}

/** True for strong reds, oranges and yellows, which are known to need extra coats. */
function isLowHidingColor(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (saturation < 0.75 || max === min) return false;
  // Hue in degrees: red is 0, yellow 60, green 120, blue 240, magenta 300.
  let hue;
  if (max === r) hue = (60 * ((g - b) / (max - min)) + 360) % 360;
  else if (max === g) hue = 60 * ((b - r) / (max - min)) + 120;
  else hue = 60 * ((r - g) / (max - min)) + 240;
  // Reds through yellows (including crimson, just past 0 on the magenta side).
  return hue >= 340 || hue <= 65;
}

/**
 * Work out the paintable area.
 * @param {object} room
 * @param {number[]} [room.wallWidthsFt] Width of each wall being painted.
 * @param {number} [room.wallWidthFt]    Or: total width of all walls, already added together.
 * @param {number} room.wallHeightFt  Floor-to-ceiling height.
 * @param {number} [room.doors]       Number of doors on those walls.
 * @param {number} [room.windows]     Number of windows on those walls.
 * @param {boolean} [room.includeCeiling] Also paint the ceiling.
 * @param {number} [room.ceilingSqFt] Ceiling area, needed if includeCeiling is true.
 */
export function paintableArea(room) {
  const widths = Array.isArray(room.wallWidthsFt)
    ? room.wallWidthsFt.map(Number).filter((w) => w > 0)
    : [];
  const width = widths.length ? widths.reduce((a, b) => a + b, 0) : Number(room.wallWidthFt);
  const height = Number(room.wallHeightFt);
  if (!(width > 0) || !(height > 0)) {
    throw new Error("Wall width and wall height must both be greater than 0.");
  }
  const doors = Math.max(0, Math.round(Number(room.doors) || 0));
  const windows = Math.max(0, Math.round(Number(room.windows) || 0));

  const grossWallSqFt = width * height;
  const openingsSqFt = doors * DEFAULTS.doorSqFt + windows * DEFAULTS.windowSqFt;
  // Never let openings take the wall below zero (e.g. a typo of 40 windows).
  const wallSqFt = Math.max(0, grossWallSqFt - openingsSqFt);
  const ceilingSqFt = room.includeCeiling ? Math.max(0, Number(room.ceilingSqFt) || 0) : 0;

  return {
    totalWallWidthFt: round1(width),
    wallHeightFt: round1(height),
    grossWallSqFt: round1(grossWallSqFt),
    openingsSqFt: round1(Math.min(openingsSqFt, grossWallSqFt)),
    wallSqFt: round1(wallSqFt),
    ceilingSqFt: round1(ceilingSqFt),
    totalSqFt: round1(wallSqFt + ceilingSqFt),
  };
}

/**
 * Decide on primer and number of coats from the color change and the wall's condition.
 * Returns the recommendation plus a plain-English reason for each part of it.
 */
export function coatPlan({ currentColorHex, targetColorHex, conditions = [] }) {
  const flags = new Set(conditions);
  const reasons = [];
  const prepSteps = [];
  let primer = "none"; // "none" | "spot" | "full"
  let primerType = null;
  let coats = 2;

  const current = lightness(currentColorHex);
  const target = lightness(targetColorHex);
  const change = target - current; // positive = going lighter

  // Surface condition comes first: some problems need primer whatever the color.
  if (flags.has("wallpaper")) {
    prepSteps.push("Remove the wallpaper and wash off the leftover glue before anything else.");
    primer = "full";
    primerType = "Oil-based or shellac primer (seals glue residue)";
    reasons.push("Walls that had wallpaper need sealing so leftover glue doesn't bleed through.");
  }
  if (flags.has("bare_drywall")) {
    primer = "full";
    primerType ??= "PVA drywall primer";
    reasons.push("Bare drywall soaks up paint unevenly, so it needs a full coat of primer.");
  }
  if (flags.has("stains")) {
    primer = "full";
    primerType = "Stain-blocking primer (shellac or oil-based)";
    reasons.push("Stains bleed through regular paint. A stain-blocking primer seals them in.");
  }
  if (flags.has("glossy_finish")) {
    prepSteps.push("Lightly sand the glossy paint (220-grit) and wipe off the dust.");
    primer = "full";
    primerType ??= "Bonding primer";
    reasons.push("New paint doesn't grip glossy paint well. Sanding plus a bonding primer stops peeling.");
  }
  if (flags.has("cracks_or_peeling")) {
    prepSteps.push("Scrape off loose paint, fill cracks with spackle, let it dry and sand smooth.");
    if (primer === "none") primer = "spot";
    reasons.push("Scraped and filled areas need priming so they don't show through.");
  }
  if (flags.has("patches")) {
    if (primer === "none") primer = "spot";
    reasons.push("Patched spots absorb paint differently and show as dull patches unless primed.");
  }

  // Then the color change.
  if (change > 0.35) {
    primer = "full";
    primerType ??= "Standard white primer";
    reasons.push("You're going from a dark color to a much lighter one. Primer stops the old color showing through.");
  } else if (change < -0.35) {
    if (primer !== "full") primer = "full";
    primerType ??= "Gray-tinted primer (ask the store to tint it)";
    reasons.push("You're going much darker. A tinted primer helps the deep color look rich in fewer coats.");
  } else if (Math.abs(change) < 0.08 && flags.size === 0) {
    coats = 1;
    reasons.push("The new color is very close to the old one and the walls are in good shape, so one coat may be enough. Buy for two to be safe.");
  } else {
    reasons.push("The color change is moderate, so two coats of paint will give even coverage.");
  }

  if (isLowHidingColor(targetColorHex)) {
    coats = Math.max(coats, 3);
    reasons.push("Bright reds, oranges and yellows are thin and streaky. Plan on three coats.");
  }

  return {
    primer,
    primerType: primer === "none" ? null : primerType ?? "Standard white primer",
    coats,
    prepSteps,
    reasons,
    lightnessChange: round2(change),
  };
}

/**
 * Paint is sold by the gallon, so round up to whole gallons and say how much will be left.
 * @param {number} gallonsToBuyFor  What the job uses, including roller/brush loss.
 * @param {number} gallonsApplied   What actually goes on the wall (used for the leftover note).
 */
export function wholeGallons(gallonsToBuyFor, gallonsApplied = gallonsToBuyFor) {
  if (!(gallonsToBuyFor > 0)) {
    return { gallons: 0, leftoverGallons: 0, label: "Nothing to buy", note: null, bucketTip: false };
  }
  const gallons = Math.max(1, Math.ceil(gallonsToBuyFor - 1e-9));
  const leftover = Math.max(0, gallons - gallonsApplied);
  return {
    gallons,
    leftoverGallons: round1(leftover),
    label: `${gallons} gallon${gallons > 1 ? "s" : ""}`,
    note: leftoverNote(leftover),
    // At 5+ gallons, a single 5-gallon bucket is usually cheaper than separate cans.
    bucketTip: gallons >= 5,
  };
}

function leftoverNote(leftover) {
  if (leftover < 0.15) return "You'll use almost all of it.";
  if (leftover < 0.4) return "About a quart left over for touch-ups.";
  if (leftover < 0.65) return "About half a gallon left over for touch-ups.";
  if (leftover < 0.9) return "About 3 quarts left over for touch-ups.";
  return `About ${round1(leftover)} gallons left over.`;
}

/**
 * The full paint plan: area, primer, coats and how much to buy.
 * @param {object} input  The room fields from paintableArea() plus
 *                        currentColorHex, targetColorHex and conditions.
 */
export function buildPaintPlan(input) {
  const area = paintableArea(input);
  const plan = coatPlan(input);

  // When one coat might do, still buy for two so you're not short.
  const coatsToBuyFor = Math.max(plan.coats, 2);
  const paintApplied = (area.totalSqFt * coatsToBuyFor) / DEFAULTS.paintCoverageSqFtPerGallon;
  const paintGallons = paintApplied * DEFAULTS.wasteFactor;

  let primerSqFt = 0;
  if (plan.primer === "full") primerSqFt = area.totalSqFt;
  if (plan.primer === "spot") primerSqFt = area.totalSqFt * 0.15; // rough share of wall that's patched
  const primerApplied = primerSqFt / DEFAULTS.primerCoverageSqFtPerGallon;
  const primerGallons = primerApplied * DEFAULTS.wasteFactor;

  return {
    area,
    ...plan,
    paint: {
      gallons: round2(paintGallons),
      buy: wholeGallons(paintGallons, paintApplied),
      coatsBoughtFor: coatsToBuyFor,
    },
    primerAmount:
      plan.primer === "none"
        ? null
        : {
            gallons: round2(primerGallons),
            sqFt: round1(primerSqFt),
            buy: wholeGallons(primerGallons, primerApplied),
          },
    assumptions: [
      `Paint covers about ${DEFAULTS.paintCoverageSqFtPerGallon} sq ft per gallon per coat; primer about ${DEFAULTS.primerCoverageSqFtPerGallon}.`,
      `Each door subtracts ${DEFAULTS.doorSqFt} sq ft and each window ${DEFAULTS.windowSqFt} sq ft.`,
      `Includes ${Math.round((DEFAULTS.wasteFactor - 1) * 100)}% for paint lost in rollers and brushes, then rounds up to whole gallons.`,
      "Trim, baseboards and doors are not included. They usually need a separate semi-gloss paint.",
    ],
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
