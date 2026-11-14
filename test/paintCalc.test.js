import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPaintPlan, coatPlan, lightness, paintableArea, toCans } from "../lib/paintCalc.js";

test("subtracts doors and windows from the wall area", () => {
  // 12x12 room = 48 ft of wall, 8 ft high = 384 sq ft, minus 1 door (21) and 2 windows (30).
  const area = paintableArea({ wallWidthFt: 48, wallHeightFt: 8, doors: 1, windows: 2 });
  assert.equal(area.grossWallSqFt, 384);
  assert.equal(area.wallSqFt, 333);
});

test("openings can't make the wall area negative", () => {
  const area = paintableArea({ wallWidthFt: 10, wallHeightFt: 8, windows: 40 });
  assert.equal(area.wallSqFt, 0);
});

test("rejects missing measurements", () => {
  assert.throws(() => paintableArea({ wallWidthFt: 0, wallHeightFt: 8 }));
});

test("lightness runs from black to white", () => {
  assert.equal(lightness("#000000"), 0);
  assert.equal(lightness("#ffffff"), 1);
  assert.throws(() => lightness("blue"));
});

test("dark to light needs primer and two coats", () => {
  const plan = coatPlan({ currentColorHex: "#22344d", targetColorHex: "#f4f3ee" });
  assert.equal(plan.primer, "full");
  assert.equal(plan.coats, 2);
});

test("light to very dark suggests a tinted primer", () => {
  const plan = coatPlan({ currentColorHex: "#f4f3ee", targetColorHex: "#22344d" });
  assert.equal(plan.primer, "full");
  assert.match(plan.primerType, /tinted/i);
});

test("similar color on good walls can be one coat", () => {
  const plan = coatPlan({ currentColorHex: "#e8e2d4", targetColorHex: "#ebe5d8" });
  assert.equal(plan.primer, "none");
  assert.equal(plan.coats, 1);
});

test("moderate change on good walls is two coats, no primer", () => {
  const plan = coatPlan({ currentColorHex: "#e8e2d4", targetColorHex: "#a7bfd1" });
  assert.equal(plan.primer, "none");
  assert.equal(plan.coats, 2);
});

test("stains always get a stain-blocking primer", () => {
  const plan = coatPlan({ currentColorHex: "#e8e2d4", targetColorHex: "#ebe5d8", conditions: ["stains"] });
  assert.equal(plan.primer, "full");
  assert.match(plan.primerType, /stain/i);
});

test("patches get spot primer", () => {
  const plan = coatPlan({ currentColorHex: "#e8e2d4", targetColorHex: "#c9bfb1", conditions: ["patches"] });
  assert.equal(plan.primer, "spot");
});

test("bright reds and yellows need three coats", () => {
  for (const hex of ["#c8102e", "#e63b14", "#f2c500"]) {
    assert.equal(coatPlan({ currentColorHex: "#e8e2d4", targetColorHex: hex }).coats, 3, hex);
  }
  // Muted or cool colors don't.
  for (const hex of ["#c0623f", "#22344d", "#7a9e7e"]) {
    assert.ok(coatPlan({ currentColorHex: "#e8e2d4", targetColorHex: hex }).coats < 3, hex);
  }
});

test("rounds paint up to cans you can buy", () => {
  assert.equal(toCans(0.2).label, "1 quart");
  assert.equal(toCans(1.4).label, "1 gallon + 2 quarts");
  assert.equal(toCans(1.6).label, "2 gallons"); // 1 gal + 3 qt rounds up
  assert.equal(toCans(2.7).label, "3 gallons"); // 3 quarts rounds up to a gallon
  assert.equal(toCans(3.6).label, "1 × 5-gallon bucket"); // 3 gal + 3 qt rounds to 4 gal, so a bucket
  assert.equal(toCans(4.2).label, "1 × 5-gallon bucket");
  assert.equal(toCans(6.1).label, "1 × 5-gallon bucket + 1 gallon + 1 quart");
});

test("full plan for a typical bedroom", () => {
  const plan = buildPaintPlan({
    wallWidthFt: 48,
    wallHeightFt: 8,
    doors: 1,
    windows: 2,
    currentColorHex: "#e8e2d4",
    targetColorHex: "#7a9e7e",
    conditions: [],
  });
  // 333 sq ft x 2 coats x 1.1 waste / 350 = 2.09 gallons
  assert.equal(plan.paint.gallons, 2.09);
  assert.equal(plan.paint.buy.label, "2 gallons + 1 quart");
  assert.equal(plan.primerAmount, null);
});
