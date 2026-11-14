// Time estimate for a paint job, split into gated phases: Prep → Coatings → Cleanup.
// Each phase lists its tasks with a low–high range of hands-on hours for one
// do-it-yourself painter, any drying time spent waiting, and a "ready when"
// checkpoint to meet before moving on to the next phase.
// Plain JavaScript with no imports, so it runs in both the browser and the server.

// Rough working speeds for a careful first-timer, as [fast, slow].
export const HOUR_RATES = {
  wallSqFtPerHourPerCoat: [200, 130], // cutting in edges + rolling
  ceilingSqFtPerHourPerCoat: [120, 80], // overhead work is slower
  primerSqFtPerHour: [200, 130],
  cleanWallsSqFtPerHour: [400, 250],
  tapeFtPerHour: [150, 80],
  removeTapeFtPerHour: [400, 200],
  sandGlossSqFtPerHour: [250, 150],
  stripWallpaperSqFtPerHour: [60, 30],
  // Drying waits, in hours.
  recoatWait: [2, 4], // latex paint between coats
  primerWait: [1, 3],
  spackleWait: [1, 2],
  // A 2-person pro crew finishes the hands-on work in about this share of DIY time.
  proCrewFactor: [0.25, 0.35],
};

/**
 * @param {object} plan  Result of buildPaintPlan().
 * @param {object} room  The same input given to buildPaintPlan (doors, windows, conditions).
 */
export function estimateHours(plan, room = {}) {
  const r = HOUR_RATES;
  const conditions = new Set(room.conditions || []);
  const doors = Math.max(0, Math.round(Number(room.doors) || 0));
  const windows = Math.max(0, Math.round(Number(room.windows) || 0));
  const { wallSqFt, ceilingSqFt, totalWallWidthFt } = plan.area;

  // Tape along the baseboard and the ceiling line, plus around each door (~17 ft) and window (~16 ft).
  const tapeFt = totalWallWidthFt * 2 + doors * 17 + windows * 16;

  // ---------------- Prep
  const prep = [];
  prep.push(task("Move furniture and cover the floor", [0.5, 1]));
  prep.push(task("Wipe down the walls", perRate(wallSqFt, r.cleanWallsSqFtPerHour)));
  if (conditions.has("wallpaper")) {
    prep.push(task("Strip wallpaper and wash off the glue", perRate(wallSqFt, r.stripWallpaperSqFtPerHour)));
  }
  if (conditions.has("cracks_or_peeling")) prep.push(task("Scrape loose paint and fill cracks", [1, 3]));
  if (conditions.has("patches")) prep.push(task("Fill holes and sand patches smooth", [0.5, 1.5]));
  if (conditions.has("glossy_finish")) {
    prep.push(task("Scuff-sand glossy paint and wipe off dust", perRate(wallSqFt, r.sandGlossSqFtPerHour)));
  }
  if (conditions.has("stains")) prep.push(task("Wash stained areas", [0.25, 0.5]));
  prep.push(task("Tape edges, outlets and trim", perRate(tapeFt, r.tapeFtPerHour)));

  const prepWaits = [];
  if (conditions.has("patches") || conditions.has("cracks_or_peeling")) {
    prepWaits.push(task("Spackle dries before sanding", r.spackleWait));
  }

  // ---------------- Coatings
  const coatings = [];
  const coatingWaits = [];
  if (plan.primer === "full") {
    coatings.push(task("Prime walls" + (ceilingSqFt ? " and ceiling" : ""), perRate(plan.area.totalSqFt, r.primerSqFtPerHour)));
    coatingWaits.push(task("Primer dries", r.primerWait));
  } else if (plan.primer === "spot") {
    coatings.push(task("Spot-prime patched areas", [0.25, 0.75]));
    coatingWaits.push(task("Primer dries", r.primerWait));
  }
  for (let coat = 1; coat <= plan.coats; coat++) {
    const label = plan.coats === 1 ? "Paint" : `Coat ${coat}`;
    if (ceilingSqFt > 0) {
      coatings.push(task(`${label}: ceiling`, perRate(ceilingSqFt, r.ceilingSqFtPerHourPerCoat)));
    }
    coatings.push(task(`${label}: cut in edges and roll walls`, perRate(wallSqFt, r.wallSqFtPerHourPerCoat)));
    if (coat < plan.coats) coatingWaits.push(task(`Coat ${coat} dries before recoating`, r.recoatWait));
  }

  // ---------------- Cleanup
  const cleanup = [];
  cleanup.push(task("Pull tape while the last coat is slightly tacky", perRate(tapeFt, r.removeTapeFtPerHour)));
  cleanup.push(task("Touch up missed spots", [0.25, 0.5]));
  const oilPrimer = plan.primerType && /oil|shellac/i.test(plan.primerType);
  cleanup.push(task(oilPrimer ? "Clean brushes (mineral spirits/alcohol for primer tools)" : "Wash rollers, brushes and tray", oilPrimer ? [0.5, 1] : [0.25, 0.75]));
  cleanup.push(task("Remove drop cloths and put the room back", [0.5, 1]));

  const phases = [
    {
      id: "prep",
      name: "Prep",
      tasks: prep,
      waits: prepWaits,
      gate: "Walls are clean and dry, repairs are smooth, and every edge is taped.",
    },
    {
      id: "coatings",
      name: "Coatings",
      tasks: coatings,
      waits: coatingWaits,
      gate: "Color looks even from every angle, with no thin spots or roller marks, and the last coat is dry to the touch.",
    },
    {
      id: "cleanup",
      name: "Cleanup",
      tasks: cleanup,
      waits: [],
      gate: "Tape is off, tools are clean, and the room is back in use. Keep leftover paint for touch-ups.",
    },
  ].map((p) => ({
    ...p,
    hours: sumRanges(p.tasks.map((t) => t.hours)),
    waitHours: sumRanges(p.waits.map((t) => t.hours)),
  }));

  const workHours = sumRanges(phases.map((p) => p.hours));
  const waitHours = sumRanges(phases.map((p) => p.waitHours));
  const elapsed = [workHours[0] + waitHours[0], workHours[1] + waitHours[1]];

  return {
    phases,
    workHours,
    waitHours,
    elapsedHours: elapsed.map(quarter),
    // Half of the drying time overlaps with other things (cleaning tools, breaks, meals).
    schedule: scheduleLabel((workHours[0] + workHours[1]) / 2 + (waitHours[0] + waitHours[1]) / 4),
    proCrewHours: [quarter(workHours[0] * r.proCrewFactor[0]), quarter(workHours[1] * r.proCrewFactor[1])].map(
      (h) => Math.max(h, 1),
    ),
    notes: [
      "Times depend on experience. If you've painted before, expect the lower end. If it's your first time, plan for the higher end. A helper cuts the work time roughly in half.",
      "Drying times are for latex paint at room temperature. Humid or cold rooms take longer.",
    ],
  };
}

function task(name, hours) {
  return { name, hours: hours.map(quarter) };
}

/** Amount ÷ [fast, slow] rate → [low, high] hours, with at least a quarter hour. */
function perRate(amount, [fast, slow]) {
  if (!(amount > 0)) return [0.25, 0.25];
  return [Math.max(0.25, amount / fast), Math.max(0.25, amount / slow)];
}

function sumRanges(ranges) {
  return [
    quarter(ranges.reduce((a, r) => a + r[0], 0)),
    quarter(ranges.reduce((a, r) => a + r[1], 0)),
  ];
}

function quarter(h) {
  return Math.round(h * 4) / 4;
}

/** Turns a typical start-to-finish time into calendar days. */
function scheduleLabel(typicalHours) {
  if (typicalHours <= 9) return "One day";
  if (typicalHours <= 13) return "One long day, or a relaxed weekend";
  if (typicalHours <= 20) return "A weekend";
  return `About ${Math.ceil(typicalHours / 8)} days`;
}

/**
 * Formats hours for display in whole hours, which reads more cleanly than fractions:
 * [1.25, 2.75] → "1–3 hrs", [0.25, 0.5] → "Under 1 hr", [2, 2.25] → "2 hrs".
 * The math underneath stays exact; only the display is rounded.
 */
export function formatHours(value) {
  const [lo, hi] = Array.isArray(value) ? value : [value, value];
  if (hi <= 0) return "0 hrs";
  if (hi < 0.75) return "Under 1 hr";
  const low = Math.max(1, Math.round(lo));
  const high = Math.max(low, Math.round(hi));
  if (low === high) return `${low} ${low === 1 ? "hr" : "hrs"}`;
  return `${low}–${high} hrs`;
}
