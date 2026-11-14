import { test } from "node:test";
import assert from "node:assert/strict";

process.env.PRO_ACCESS_CODES = "TEST-PRO, Friend-2026";
process.env.PRO_DAILY_PREVIEW_LIMIT = "2";
const { isPro, usePreview, refundPreview } = await import("../lib/proAccess.js");

test("accepts listed codes, ignoring case and spaces", () => {
  assert.equal(isPro("TEST-PRO"), true);
  assert.equal(isPro(" friend-2026 "), true);
  assert.equal(isPro("nope"), false);
  assert.equal(isPro(""), false);
  assert.equal(isPro(undefined), false);
});

test("enforces the daily preview limit, and refunds failed previews", () => {
  assert.equal(usePreview("TEST-PRO"), true);
  assert.equal(usePreview("TEST-PRO"), true);
  assert.equal(usePreview("TEST-PRO"), false); // limit of 2 reached
  refundPreview("TEST-PRO"); // a preview failed, so it shouldn't count
  assert.equal(usePreview("TEST-PRO"), true);
  // Each code has its own count.
  assert.equal(usePreview("FRIEND-2026"), true);
});
