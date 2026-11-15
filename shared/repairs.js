// Spot repairs before painting: holes, cracks and gaps.
// Each repair type knows how to fix it (caulk, spackle, patch...), what it needs,
// how long it takes, and when a pro should look at it first.
// Plain JavaScript with no imports, so it runs in both the browser and the server.

// Materials, with typical prices in dollars.
// perItem: buy one for each repair of that type. perItems: one covers that many repairs.
export const REPAIR_MATERIALS = {
  spackle: { label: "Lightweight spackle", price: 8 },
  putty_knives: { label: "Putty knives (1½ and 4 in.)", price: 10 },
  drywall_knife: { label: "6 in. drywall knife", price: 10 },
  joint_compound: { label: "Joint compound (small tub)", price: 12 },
  patch_kit: { label: "Self-adhesive wall patch (6 in.)", price: 6, perItem: 1 },
  mesh_tape: { label: "Mesh drywall tape", price: 6 },
  caulk: { label: "Paintable acrylic latex caulk", price: 6, perItems: 4 },
  caulk_gun: { label: "Caulk gun", price: 8 },
  drywall_panel: { label: "Drywall patch panel (2 × 2 ft)", price: 12, perItem: 1 },
  drywall_screws: { label: "Drywall screws", price: 6 },
};

// short: name for dropdowns. label: full description.
// fix: what kind of repair it is, shown as a short label to the user.
// hoursEach: hands-on time per repair as [fast, slow]. wait: drying time before sanding/painting.
// proEach: what a pro typically charges per repair (on top of painting), as [low, high].
export const REPAIR_TYPES = {
  nail_holes: {
    short: "Nail or screw holes",
    label: "Nail or screw holes",
    fix: "Spackle",
    difficulty: 1,
    method: "Press lightweight spackle into each hole with a putty knife, scrape it flush, let it dry, then sand smooth.",
    task: (n) => `Fill ${n} nail or screw hole${n > 1 ? "s" : ""}`,
    hoursEach: [0.05, 0.1],
    wait: [0.5, 1],
    materials: ["spackle", "putty_knives"],
    proEach: [3, 8],
    spotPrime: true,
  },
  small_holes: {
    short: "Small holes (up to ½ in.)",
    label: "Small holes or dents (up to ½ in.)",
    fix: "Spackle",
    difficulty: 1,
    method: "Fill with spackle in one or two thin passes, letting each dry, then sand smooth. Thin layers dry faster and don't shrink.",
    task: (n) => `Fill ${n} small hole${n > 1 ? "s" : ""} or dent${n > 1 ? "s" : ""}`,
    hoursEach: [0.1, 0.25],
    wait: [1, 2],
    materials: ["spackle", "putty_knives"],
    proEach: [10, 25],
    spotPrime: true,
  },
  medium_holes: {
    short: "Medium holes (½–6 in.)",
    label: "Medium holes (½–6 in.), like a doorknob dent",
    fix: "Patch",
    difficulty: 2,
    method: "Stick a self-adhesive mesh patch over the hole, then spread 2–3 thin coats of joint compound, each wider than the last to feather the edges. Let each coat dry and sand smooth.",
    task: (n) => `Patch ${n} medium hole${n > 1 ? "s" : ""}`,
    hoursEach: [0.75, 1.5],
    wait: [3, 6],
    materials: ["patch_kit", "joint_compound", "drywall_knife"],
    proEach: [75, 150],
    spotPrime: true,
  },
  large_holes: {
    short: "Large holes (over 6 in.)",
    label: "Large holes (over 6 in.)",
    fix: "New drywall",
    difficulty: 4,
    method: "Cut the damage into a clean square, screw a new piece of drywall onto wood backing strips, tape the seams, then apply 3 coats of joint compound, sanding between coats.",
    task: (n) => `Replace drywall at ${n} large hole${n > 1 ? "s" : ""}`,
    hoursEach: [2, 4],
    wait: [12, 24],
    materials: ["drywall_panel", "drywall_screws", "mesh_tape", "joint_compound", "drywall_knife"],
    proEach: [150, 300],
    spotPrime: true,
    advice: "This is an advanced repair. If you haven't done drywall work before, it's worth getting a pro quote, especially for holes over 1 ft.",
  },
  wall_cracks: {
    short: "Cracks in the wall",
    label: "Cracks in the flat wall",
    fix: "Tape & compound",
    difficulty: 2,
    method: "Cover the crack with mesh drywall tape, then spread 2–3 thin coats of joint compound, feathering the edges. Spackle alone usually cracks again.",
    task: (n) => `Tape and fill ${n} wall crack${n > 1 ? "s" : ""}`,
    hoursEach: [0.5, 1],
    wait: [3, 6],
    materials: ["mesh_tape", "joint_compound", "drywall_knife"],
    proEach: [60, 120],
    spotPrime: true,
  },
  corner_cracks: {
    short: "Cracks in corners",
    label: "Cracks in inside corners (wall-to-wall or wall-to-ceiling)",
    fix: "Caulk",
    difficulty: 1,
    method: "Run a thin bead of paintable acrylic latex caulk into the crack and smooth it with a damp finger. Caulk flexes as the house moves with the seasons, so the crack is less likely to come back.",
    task: (n) => `Caulk ${n} corner crack${n > 1 ? "s" : ""}`,
    hoursEach: [0.15, 0.3],
    wait: [1, 4],
    materials: ["caulk", "caulk_gun"],
    proEach: [15, 35],
    spotPrime: false,
  },
  trim_gaps: {
    short: "Gaps along trim",
    label: "Gaps along trim, baseboards or door/window casing",
    fix: "Caulk",
    difficulty: 1,
    method: "Cut the caulk tube tip small, run a steady bead of paintable acrylic latex caulk along the gap, and smooth it with a damp finger or rag. Use paintable caulk, not 100% silicone, which paint won't stick to.",
    task: (n) => `Caulk ${n} trim run${n > 1 ? "s" : ""}`,
    unit: "run (one door, window or wall length)",
    hoursEach: [0.15, 0.3],
    wait: [1, 4],
    materials: ["caulk", "caulk_gun"],
    proEach: [15, 35],
    spotPrime: false,
  },
  nail_pops: {
    short: "Popped nails",
    label: "Popped nails or screws (small round bumps)",
    fix: "Reset & spackle",
    difficulty: 1,
    method: "Drive a drywall screw 1–2 in. above or below the pop to pull the drywall tight, tap the popped fastener just below the surface, then spackle over both and sand.",
    task: (n) => `Reset ${n} popped nail${n > 1 ? "s" : ""}`,
    hoursEach: [0.15, 0.3],
    wait: [1, 2],
    materials: ["drywall_screws", "spackle", "putty_knives"],
    proEach: [15, 30],
    spotPrime: true,
  },
  water_damage: {
    short: "Water damage",
    label: "Water stains, or soft or bulging drywall",
    fix: "Find the leak first",
    difficulty: 3,
    method: "Find and fix the source of the water before any repair. A stain on firm drywall just needs stain-blocking primer. Soft, crumbling or bulging drywall has to be cut out and replaced.",
    task: (n) => `Check ${n} water-damaged area${n > 1 ? "s" : ""}`,
    hoursEach: [0.25, 0.5],
    wait: [0, 0],
    materials: [],
    proEach: [100, 300],
    spotPrime: true,
    proRecommended: true,
    advice: "Have a plumber or contractor find the leak first. Painting over an active leak hides the problem, and wet drywall can grow mold.",
  },
  structural_cracks: {
    short: "Wide or diagonal cracks",
    label: "Wide or diagonal cracks (over ¼ in., from door or window corners, or growing)",
    fix: "Have a pro look",
    difficulty: 5,
    method: "Don't patch these yet. Cracks like this can be a sign the house is settling or moving, and a patch will just crack again.",
    task: (n) => `Get ${n} wide crack${n > 1 ? "s" : ""} checked`,
    hoursEach: [0, 0],
    wait: [0, 0],
    materials: [],
    proEach: [0, 0],
    spotPrime: false,
    proRecommended: true,
    advice: "Have a contractor or structural engineer look before you patch or paint.",
  },
};

/**
 * Turns a list of repairs into tasks, drying time, materials and pro pricing.
 * @param {{type: string, count: number}[]} items
 */
export function planRepairs(items = []) {
  const repairs = [];
  const counts = new Map();
  for (const item of items) {
    const type = REPAIR_TYPES[item?.type];
    const count = Math.max(0, Math.round(Number(item?.count) || 0));
    if (!type || count === 0) continue;
    counts.set(item.type, (counts.get(item.type) || 0) + count);
  }

  const tasks = [];
  const materialQty = new Map();
  let waitLo = 0;
  let waitHi = 0;
  const proLabor = [0, 0];
  const warnings = [];

  for (const [id, count] of counts) {
    const t = REPAIR_TYPES[id];
    const hours = [
      Math.max(t.hoursEach[1] > 0 ? 0.25 : 0, count * t.hoursEach[0]),
      Math.max(t.hoursEach[1] > 0 ? 0.5 : 0, count * t.hoursEach[1]),
    ];
    if (hours[1] > 0) tasks.push({ name: t.task(count), hours: hours.map(quarter) });
    // All repairs dry at the same time, so the longest drying time is the wait.
    waitLo = Math.max(waitLo, t.wait[0]);
    waitHi = Math.max(waitHi, t.wait[1]);
    proLabor[0] += t.proEach[0] * count;
    proLabor[1] += t.proEach[1] * count;
    for (const m of t.materials) {
      // Count how many repairs use each material; quantities are worked out below.
      materialQty.set(m, (materialQty.get(m) || 0) + count);
    }
    if (t.proRecommended || t.advice) {
      warnings.push({ type: id, label: t.label, text: t.advice, proRecommended: Boolean(t.proRecommended) });
    }
    repairs.push({
      type: id,
      label: t.label,
      count,
      fix: t.fix,
      method: t.method,
      difficulty: t.difficulty,
      unit: t.unit || null,
      proRecommended: Boolean(t.proRecommended),
      advice: t.advice || null,
    });
  }

  // One tub of spackle or one caulk gun covers every repair; patches and caulk tubes scale with the count.
  const materials = [...materialQty.entries()].map(([id, uses]) => {
    const spec = REPAIR_MATERIALS[id];
    const qty = spec.perItem ? uses * spec.perItem : spec.perItems ? Math.ceil(uses / spec.perItems) : 1;
    return { id, label: spec.label, qty, amount: qty * spec.price };
  });

  return {
    repairs,
    tasks,
    waits: waitHi > 0 ? [{ name: "Repairs dry before sanding", hours: [waitLo, waitHi] }] : [],
    materials,
    materialsTotal: materials.reduce((a, m) => a + m.amount, 0),
    proLabor,
    warnings,
    // Spackle and joint compound soak up paint differently, so patched spots need priming.
    needsSpotPrime: repairs.some((r) => REPAIR_TYPES[r.type].spotPrime),
    hardest: repairs.reduce((max, r) => Math.max(max, r.difficulty), 0),
    hasRepairs: repairs.length > 0,
  };
}

function quarter(h) {
  return Math.round(h * 4) / 4;
}
