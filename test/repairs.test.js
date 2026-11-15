import { test } from "node:test";
import assert from "node:assert/strict";
import { planRepairs, REPAIR_TYPES } from "../shared/repairs.js";
import { buildPaintPlan } from "../shared/paintCalc.js";
import { estimateHours } from "../shared/hours.js";
import { estimateCosts } from "../shared/costs.js";

test("no repairs gives an empty plan", () => {
  const r = planRepairs([]);
  assert.equal(r.hasRepairs, false);
  assert.deepEqual(r.tasks, []);
  assert.deepEqual(r.materials, []);
});

test("ignores unknown types and zero counts", () => {
  const r = planRepairs([{ type: "nope", count: 3 }, { type: "nail_holes", count: 0 }]);
  assert.equal(r.hasRepairs, false);
});

test("nail holes: spackle, a quick task and a short dry", () => {
  const r = planRepairs([{ type: "nail_holes", count: 6 }]);
  assert.equal(r.repairs[0].fix, "Spackle");
  assert.equal(r.tasks[0].name, "Fill 6 nail or screw holes");
  assert.deepEqual(r.waits[0].hours, [0.5, 1]);
  assert.deepEqual(r.materials.map((m) => m.id).sort(), ["putty_knives", "spackle"]);
  assert.equal(r.needsSpotPrime, true);
});

test("gaps and corner cracks get caulk, and share caulk tubes", () => {
  const r = planRepairs([
    { type: "trim_gaps", count: 3 },
    { type: "corner_cracks", count: 2 },
  ]);
  assert.ok(r.repairs.every((x) => x.fix === "Caulk"));
  const caulk = r.materials.find((m) => m.id === "caulk");
  assert.equal(caulk.qty, 2); // 5 runs, one tube per 4
  assert.equal(r.materials.filter((m) => m.id === "caulk_gun")[0].qty, 1);
  // Caulk doesn't need primer.
  assert.equal(r.needsSpotPrime, false);
});

test("medium holes need one patch each", () => {
  const r = planRepairs([{ type: "medium_holes", count: 2 }]);
  assert.equal(r.materials.find((m) => m.id === "patch_kit").qty, 2);
  assert.equal(r.repairs[0].fix, "Patch");
});

test("the longest drying repair sets the wait", () => {
  const r = planRepairs([
    { type: "nail_holes", count: 4 },
    { type: "medium_holes", count: 1 },
  ]);
  assert.equal(r.waits.length, 1);
  assert.deepEqual(r.waits[0].hours, REPAIR_TYPES.medium_holes.wait);
});

test("water damage and structural cracks recommend a pro", () => {
  const r = planRepairs([
    { type: "water_damage", count: 1 },
    { type: "structural_cracks", count: 1 },
  ]);
  assert.equal(r.warnings.length, 2);
  assert.ok(r.warnings.every((w) => w.proRecommended));
  assert.ok(r.repairs.every((x) => x.proRecommended));
});

test("large holes come with advice to consider a pro", () => {
  const r = planRepairs([{ type: "large_holes", count: 1 }]);
  assert.equal(r.warnings.length, 1);
  assert.equal(r.warnings[0].proRecommended, false);
  assert.equal(r.hardest, 4);
});

test("repairs flow into the time estimate and cost estimate", () => {
  const repairPlan = planRepairs([
    { type: "nail_holes", count: 6 },
    { type: "medium_holes", count: 1 },
    { type: "trim_gaps", count: 2 },
  ]);
  const room = {
    wallWidthsFt: [10, 10, 10, 10],
    wallHeightFt: 8,
    doors: 1,
    windows: 1,
    currentColorHex: "#e8e2d4",
    targetColorHex: "#cdd2ca",
    conditions: ["patches"],
    repairPlan,
  };
  const plan = buildPaintPlan(room);
  const prep = estimateHours(plan, room).phases[0];
  const names = prep.tasks.map((t) => t.name);
  assert.ok(names.includes("Fill 6 nail or screw holes"));
  assert.ok(names.includes("Patch 1 medium hole"));
  assert.ok(names.includes("Caulk 2 trim runs"));
  assert.ok(!names.includes("Fill holes and sand patches smooth"), "generic patch task is replaced");
  assert.deepEqual(prep.waits.map((w) => w.name), ["Repairs dry before sanding"]);

  const costs = estimateCosts(plan, { conditions: room.conditions, repairPlan });
  const labels = costs.diy.lines.map((l) => l.label).join(" | ");
  assert.match(labels, /Self-adhesive wall patch/);
  assert.match(labels, /caulk/i);
  assert.ok(!/Spackle, putty knife and sandpaper/.test(labels), "generic repair supplies are replaced");
  assert.ok(costs.pro.laborParts.some((p) => p.label === "Spot repairs"));
});
