import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPaintPlan } from "../shared/paintCalc.js";
import { estimateHours, formatHours } from "../shared/hours.js";

const bedroom = {
  wallWidthsFt: [12, 12, 12, 12],
  wallHeightFt: 8,
  doors: 1,
  windows: 2,
  currentColorHex: "#e8e2d4",
  targetColorHex: "#7a9e7e",
  conditions: [],
};

function hoursFor(room) {
  return estimateHours(buildPaintPlan(room), room);
}

test("splits the job into Prep, Coatings and Cleanup, each with a gate", () => {
  const h = hoursFor(bedroom);
  assert.deepEqual(h.phases.map((p) => p.name), ["Prep", "Coatings", "Cleanup"]);
  for (const p of h.phases) {
    assert.ok(p.tasks.length > 0, p.name);
    assert.ok(p.gate.length > 0, p.name);
    assert.ok(p.hours[0] <= p.hours[1], p.name);
  }
});

test("a simple bedroom repaint fits in a long day", () => {
  const h = hoursFor(bedroom);
  // 333 sq ft per coat at 130-200 sq ft/hr is 1¾-2½ hrs; two coats is 3½-5 hrs.
  const coatings = h.phases.find((p) => p.id === "coatings");
  assert.deepEqual(coatings.hours, [3.5, 5]);
  assert.equal(coatings.tasks.length, 2);
  assert.deepEqual(coatings.waitHours, [2, 4]); // one wait between the two coats
  assert.equal(h.schedule, "One long day, or a relaxed weekend");
});

test("primer adds a coating task and a drying wait", () => {
  const dark = { ...bedroom, currentColorHex: "#22344d", targetColorHex: "#f4f3ee" };
  const coatings = hoursFor(dark).phases.find((p) => p.id === "coatings");
  assert.match(coatings.tasks[0].name, /Prime/);
  assert.equal(coatings.waits.length, 2); // primer dries + coat 1 dries
});

test("repairs add prep tasks and a spackle wait", () => {
  const plain = hoursFor(bedroom).phases[0];
  const rough = hoursFor({ ...bedroom, conditions: ["patches", "cracks_or_peeling"] }).phases[0];
  assert.ok(rough.hours[1] > plain.hours[1]);
  assert.equal(rough.waits.length, 1);
});

test("wallpaper removal makes it a multi-day job", () => {
  const h = hoursFor({ ...bedroom, conditions: ["wallpaper"] });
  assert.ok(h.phases[0].tasks.some((t) => /wallpaper/i.test(t.name)));
  assert.match(h.schedule, /days/);
});

test("ceiling adds a ceiling pass to every coat", () => {
  const h = hoursFor({ ...bedroom, includeCeiling: true, ceilingSqFt: 144 });
  const coatings = h.phases.find((p) => p.id === "coatings");
  assert.equal(coatings.tasks.filter((t) => /ceiling/.test(t.name)).length, 2);
});

test("a pro crew is much faster than DIY", () => {
  const h = hoursFor(bedroom);
  assert.ok(h.proCrewHours[1] < h.workHours[0]);
});

test("formats hours with fractions", () => {
  assert.equal(formatHours([1, 2.25]), "1–2¼ hrs");
  assert.equal(formatHours([0.25, 0.5]), "¼–½ hr");
  assert.equal(formatHours([2, 2]), "2 hrs");
  assert.equal(formatHours(1.5), "1½ hrs");
});
