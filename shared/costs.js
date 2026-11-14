// Cost estimates: do-it-yourself materials vs. hiring a professional painter.
// These are ballpark U.S. figures, meant as a starting point. Users can adjust the
// prices in the app, and should get real quotes before hiring anyone.
// Plain JavaScript with no imports, so it runs in both the browser and the server.

export const COST_DEFAULTS = {
  // Typical full price per gallon of good interior paint. Big brands often run 30-40% off sales.
  paintPerGallon: {
    "sherwin-williams": 80,
    "benjamin-moore": 80,
    behr: 45,
    other: 50,
  },
  primerPerGallon: 35,
  supplies: {
    basic: 45, // roller, covers, tray, angled brush, painter's tape, drop cloth
    prep: 20, // spackle, putty knife, sanding sponge (only if the walls need repair)
    wallpaperRemoval: 30, // scorer, remover solution, scraper
  },
  pro: {
    // Labor per square foot of paintable surface, for two coats, as a low-high range.
    wallsPerSqFt: [1.5, 3.5],
    ceilingPerSqFt: [2.0, 4.0],
    primerPerSqFt: [0.5, 1.0], // an extra coat of primer
    extraCoatFactor: 1.3, // three coats instead of two
    // Extra prep work per square foot of wall, by wall condition.
    prepPerSqFt: {
      patches: [0.25, 0.75],
      cracks_or_peeling: [0.5, 1.25],
      glossy_finish: [0.25, 0.5],
      stains: [0.1, 0.3],
      wallpaper: [1.0, 2.0],
      bare_drywall: [0, 0],
    },
    minimumJob: [250, 400], // most painters won't do a job for less than this
  },
  // Painter rates vary a lot by region.
  regionFactor: { lower: 0.8, average: 1, higher: 1.3 },
};

/**
 * @param {object} plan  The result of buildPaintPlan().
 * @param {object} [options]
 * @param {string} [options.brandId]         "sherwin-williams", "benjamin-moore", "behr" or "other".
 * @param {number} [options.paintPerGallon]  Overrides the brand's typical price.
 * @param {number} [options.primerPerGallon]
 * @param {"lower"|"average"|"higher"} [options.region]
 * @param {string[]} [options.conditions]    Wall conditions, same keys as the paint plan.
 */
export function estimateCosts(plan, options = {}) {
  const d = COST_DEFAULTS;
  const brandId = d.paintPerGallon[options.brandId] ? options.brandId : "other";
  const paintPrice = positive(options.paintPerGallon) ?? d.paintPerGallon[brandId];
  const primerPrice = positive(options.primerPerGallon) ?? d.primerPerGallon;
  const region = d.regionFactor[options.region] ? options.region : "average";
  const conditions = new Set(options.conditions || []);

  // ---- Materials (what you'd spend doing it yourself)
  const lines = [];
  const paintGallons = plan.paint.buy.gallons;
  lines.push({
    label: `Paint: ${paintGallons} gal × ${money(paintPrice)}`,
    amount: paintGallons * paintPrice,
  });
  if (plan.primerAmount) {
    const g = plan.primerAmount.buy.gallons;
    lines.push({ label: `Primer: ${g} gal × ${money(primerPrice)}`, amount: g * primerPrice });
  }
  lines.push({ label: "Rollers, brush, tray, tape and drop cloth", amount: d.supplies.basic });
  if (conditions.has("patches") || conditions.has("cracks_or_peeling") || conditions.has("glossy_finish")) {
    lines.push({ label: "Spackle, putty knife and sandpaper", amount: d.supplies.prep });
  }
  if (conditions.has("wallpaper")) {
    lines.push({ label: "Wallpaper removal supplies", amount: d.supplies.wallpaperRemoval });
  }
  const materials = sum(lines.map((l) => l.amount));

  // ---- Professional labor, as a low-high range
  const { wallSqFt, ceilingSqFt } = plan.area;
  const coatFactor = plan.coats >= 3 ? d.pro.extraCoatFactor : 1;
  const laborParts = [
    { label: "Painting walls", range: scale(d.pro.wallsPerSqFt, wallSqFt * coatFactor) },
  ];
  if (ceilingSqFt > 0) {
    laborParts.push({ label: "Painting ceiling", range: scale(d.pro.ceilingPerSqFt, ceilingSqFt * coatFactor) });
  }
  if (plan.primerAmount) {
    laborParts.push({ label: "Priming", range: scale(d.pro.primerPerSqFt, plan.primerAmount.sqFt) });
  }
  const prep = [0, 0];
  for (const c of conditions) {
    const rate = d.pro.prepPerSqFt[c];
    if (rate) {
      prep[0] += rate[0] * wallSqFt;
      prep[1] += rate[1] * wallSqFt;
    }
  }
  if (prep[1] > 0) laborParts.push({ label: "Prep and repairs", range: prep });

  const factor = d.regionFactor[region];
  for (const part of laborParts) part.range = part.range.map((v) => v * factor);
  let labor = [sum(laborParts.map((p) => p.range[0])), sum(laborParts.map((p) => p.range[1]))];
  const minimumApplies = labor[0] + materials < d.pro.minimumJob[0];
  labor = [
    Math.max(labor[0], d.pro.minimumJob[0] - materials),
    Math.max(labor[1], d.pro.minimumJob[1] - materials),
  ];

  const pro = [labor[0] + materials, labor[1] + materials];

  return {
    brandId,
    region,
    paintPerGallon: paintPrice,
    primerPerGallon: primerPrice,
    diy: {
      lines: lines.map((l) => ({ ...l, amount: roundMoney(l.amount) })),
      total: roundMoney(materials),
    },
    pro: {
      laborParts: laborParts.map((p) => ({ label: p.label, range: p.range.map(roundMoney) })),
      labor: labor.map(roundMoney),
      materials: roundMoney(materials),
      total: pro.map(roundTo10),
      minimumApplies,
    },
    savings: [roundTo10(pro[0] - materials), roundTo10(pro[1] - materials)],
    notes: [
      "Paint prices are typical full retail. Watch for store sales, which often take 30–40% off.",
      `Pro prices are ballpark labor rates for a ${region === "average" ? "typical" : region + "-cost"} area, plus the same materials. Get 2–3 local quotes.`,
      "Trim, doors and moving furniture usually cost extra with a pro.",
    ],
  };
}

/**
 * Dollars vs. time: what doing it yourself saves in money and costs in hours.
 * @param {object} costs  Result of estimateCosts().
 * @param {object} hours  Result of estimateHours() from shared/hours.js.
 */
export function compareDiyVsPro(costs, hours) {
  const saved = costs.savings; // [low, high] dollars a pro would cost on top of DIY materials
  const yourHours = hours.workHours; // [low, high] hands-on hours you'd spend instead
  const midSaved = (saved[0] + saved[1]) / 2;
  const midHours = (yourHours[0] + yourHours[1]) / 2;
  return {
    dollarsSaved: saved,
    yourHours,
    // Roughly what each hour of your own work is "worth" in money you don't pay a pro.
    dollarsPerHour: midHours > 0 ? Math.round(midSaved / midHours / 5) * 5 : 0,
  };
}

function positive(n) {
  const v = Number(n);
  return v > 0 ? v : null;
}
function scale([lo, hi], qty) {
  return [lo * qty, hi * qty];
}
function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}
function roundMoney(n) {
  return Math.round(n * 100) / 100;
}
function roundTo10(n) {
  return Math.round(n / 10) * 10;
}
export function money(n) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
