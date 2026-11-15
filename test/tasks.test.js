import { test } from "node:test";
import assert from "node:assert/strict";
import { TASKS, CATEGORIES, EXPERIENCE_LEVELS, tasksByCategory, difficultyLabel } from "../shared/tasks.js";
import { REPAIR_TYPES, planRepairs } from "../shared/repairs.js";
import { buildPaintPlan } from "../shared/paintCalc.js";
import { estimateHours, rangeForExperience } from "../shared/hours.js";

test("every task is complete and in a real category", () => {
  for (const [id, t] of Object.entries(TASKS)) {
    assert.ok(CATEGORIES[t.category], `${id} category`);
    assert.ok(t.difficulty >= 1 && t.difficulty <= 5, `${id} difficulty`);
    for (const f of ["skill", "physical", "mistakeCost", "tools"]) {
      assert.ok(t.factors[f] >= 1 && t.factors[f] <= 5, `${id} ${f}`);
    }
    assert.ok(["no", "sometimes", "usually"].includes(t.permit), `${id} permit`);
    assert.ok(t.question.endsWith("?"), `${id} question`);
    if (t.safety) assert.ok(t.safetyNote, `${id} needs a safety note`);
  }
});

test("dangerous work always recommends a pro", () => {
  for (const id of ["water_heater", "new_circuit", "roof_repair"]) {
    assert.equal(TASKS[id].safety, "always_pro", id);
    assert.equal(TASKS[id].difficulty, 5, id);
  }
});

test("painting and drywall patching are the live tasks", () => {
  const live = Object.entries(TASKS).filter(([, t]) => t.status === "live").map(([id]) => id);
  assert.deepEqual(live.sort(), ["drywall_patching", "interior_painting"]);
});

test("every repair type points at a real task (or none, for pro-first repairs)", () => {
  for (const [id, r] of Object.entries(REPAIR_TYPES)) {
    if (r.skill === null) assert.ok(r.proRecommended, id);
    else assert.ok(TASKS[r.skill], `${id} skill`);
  }
});

test("groups tasks by category and labels difficulty", () => {
  const groups = tasksByCategory();
  assert.equal(groups.length, Object.keys(CATEGORIES).length);
  assert.ok(groups.find((g) => g.id === "plumbing").tasks.some((t) => t.id === "toilet_replace"));
  assert.equal(difficultyLabel(2), "Easy to moderate");
  assert.equal(Object.keys(EXPERIENCE_LEVELS).length, 3);
});

test("experience narrows a range to the matching part", () => {
  assert.deepEqual(rangeForExperience([4, 8], "confident"), [4, 6]);
  assert.deepEqual(rangeForExperience([4, 8], "some"), [5, 7]);
  assert.deepEqual(rangeForExperience([4, 8], "new"), [6, 8]);
  assert.deepEqual(rangeForExperience([4, 8], undefined), [4, 8]);
});

const room = {
  wallWidthsFt: [10, 10, 10, 10],
  wallHeightFt: 8,
  doors: 1,
  windows: 1,
  currentColorHex: "#e8e2d4",
  targetColorHex: "#cdd2ca",
  conditions: ["patches"],
  repairPlan: planRepairs([
    { type: "nail_holes", count: 6 },
    { type: "medium_holes", count: 1 },
  ]),
};

test("confident painters get shorter times than beginners, drying time doesn't change", () => {
  const plan = buildPaintPlan(room);
  const pro = estimateHours(plan, { ...room, experience: { interior_painting: "confident", drywall_patching: "confident" } });
  const newbie = estimateHours(plan, { ...room, experience: { interior_painting: "new", drywall_patching: "new" } });
  const unset = estimateHours(plan, room);
  assert.ok(pro.workHours[1] < newbie.workHours[1]);
  assert.ok(pro.workHours[0] <= unset.workHours[0] + 0.01);
  assert.deepEqual(pro.waitHours, newbie.waitHours);
  // A pro crew's time doesn't depend on the user's experience.
  assert.deepEqual(pro.proCrewHours, newbie.proCrewHours);
});

test("experience is applied per task", () => {
  const plan = buildPaintPlan(room);
  const h = estimateHours(plan, { ...room, experience: { interior_painting: "confident", drywall_patching: "new" } });
  const prep = h.phases[0].tasks;
  const patch = prep.find((t) => t.name === "Patch 1 medium hole");
  const holes = prep.find((t) => t.name === "Fill 6 nail or screw holes");
  assert.equal(patch.skill, "drywall_patching");
  assert.equal(holes.skill, "interior_painting");
  // Patching uses the upper half (new), painting tasks the lower half (confident).
  assert.deepEqual(patch.hours, rangeForExperience(patch.baseHours, "new").map((x) => Math.round(x * 4) / 4));
  assert.ok(prep.find((t) => /Light sand all walls/.test(t.name)).hours[1] <= prep.find((t) => /Light sand all walls/.test(t.name)).baseHours[1]);
});

test("repairs report which extra skills they need", () => {
  assert.deepEqual(room.repairPlan.skills.sort(), ["drywall_patching", "interior_painting"]);
  assert.deepEqual(planRepairs([{ type: "trim_gaps", count: 2 }]).skills, ["interior_painting"]);
});
