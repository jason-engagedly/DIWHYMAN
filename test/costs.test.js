import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPaintPlan } from "../shared/paintCalc.js";
import { estimateCosts } from "../shared/costs.js";

const bedroom = {
  wallWidthsFt: [12, 12, 12, 12],
  wallHeightFt: 8,
  doors: 1,
  windows: 2,
  currentColorHex: "#e8e2d4",
  targetColorHex: "#7a9e7e",
  conditions: [],
};

test("DIY materials: paint plus basic supplies", () => {
  const costs = estimateCosts(buildPaintPlan(bedroom), { brandId: "sherwin-williams" });
  // 2 gallons x $80 + $45 supplies
  assert.equal(costs.diy.total, 205);
});

test("custom paint price overrides the brand default", () => {
  const costs = estimateCosts(buildPaintPlan(bedroom), { brandId: "behr", paintPerGallon: 30 });
  assert.equal(costs.diy.total, 2 * 30 + 45);
});

test("pro estimate is a range above the DIY cost", () => {
  const costs = estimateCosts(buildPaintPlan(bedroom), { brandId: "behr" });
  // 333 sq ft x $1.50-$3.50 labor, plus materials
  assert.deepEqual(costs.pro.labor, [499.5, 1165.5]);
  assert.ok(costs.pro.total[0] < costs.pro.total[1]);
  assert.ok(costs.pro.total[0] > costs.diy.total);
});

test("primer and repairs add to both estimates", () => {
  const plain = estimateCosts(buildPaintPlan(bedroom));
  const rough = estimateCosts(buildPaintPlan({ ...bedroom, conditions: ["stains", "patches"] }), {
    conditions: ["stains", "patches"],
  });
  assert.ok(rough.diy.total > plain.diy.total);
  assert.ok(rough.pro.labor[0] > plain.pro.labor[0]);
});

test("small jobs hit the painter's minimum charge", () => {
  const tiny = buildPaintPlan({ ...bedroom, wallWidthsFt: [6], doors: 0, windows: 0 });
  const costs = estimateCosts(tiny);
  assert.equal(costs.pro.minimumApplies, true);
  assert.equal(costs.pro.total[0], 250);
});

test("region changes labor but not materials", () => {
  const plan = buildPaintPlan(bedroom);
  const low = estimateCosts(plan, { region: "lower" });
  const high = estimateCosts(plan, { region: "higher" });
  assert.equal(low.diy.total, high.diy.total);
  assert.ok(high.pro.labor[1] > low.pro.labor[1]);
});

test("compares dollars saved with hours spent", async () => {
  const { estimateHours } = await import("../shared/hours.js");
  const { compareDiyVsPro } = await import("../shared/costs.js");
  const plan = buildPaintPlan(bedroom);
  const costs = estimateCosts(plan, { brandId: "behr" });
  const hours = estimateHours(plan, bedroom);
  const c = compareDiyVsPro(costs, hours);
  assert.deepEqual(c.dollarsSaved, costs.savings);
  assert.deepEqual(c.yourHours, hours.workHours);
  assert.ok(c.dollarsPerHour > 0);
  assert.equal(c.dollarsPerHour % 5, 0);
  assert.match(hours.proSchedule, /^Done in/);
});
