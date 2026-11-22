// Pro access for paid features (the AI color preview).
//
// For now, Pro is unlocked with an access code you hand out (set PRO_ACCESS_CODES in .env).
// This is a stand-in until real accounts and payments are added. Swap isPro() for a
// subscription check then, and the rest of the app keeps working.
import { createHash, timingSafeEqual } from "node:crypto";

const DAILY_LIMIT = Number(process.env.PRO_DAILY_PREVIEW_LIMIT) || 20;

function hash(value) {
  return createHash("sha256").update(String(value).trim().toUpperCase()).digest();
}

function validCodes() {
  return (process.env.PRO_ACCESS_CODES || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map(hash);
}

/** True when the code matches one of PRO_ACCESS_CODES (case-insensitive). */
export function isPro(code) {
  if (!code) return false;
  const candidate = hash(code);
  // Constant-time comparison so codes can't be guessed by timing responses.
  return validCodes().some((valid) => timingSafeEqual(valid, candidate));
}

// How many previews each code has used today. Kept in memory, so it resets when the server restarts.
const usage = new Map();

/** Counts one preview against the code's daily limit. Returns false when the limit is reached. */
export function usePreview(code) {
  const today = new Date().toISOString().slice(0, 10);
  const key = hash(code).toString("hex");
  const entry = usage.get(key);
  const count = entry?.day === today ? entry.count : 0;
  if (count >= DAILY_LIMIT) return false;
  usage.set(key, { day: today, count: count + 1 });
  return true;
}

/** Gives a preview back to the daily count, e.g. when image generation failed. */
export function refundPreview(code) {
  const key = hash(code).toString("hex");
  const entry = usage.get(key);
  if (entry && entry.count > 0) entry.count -= 1;
}

export const PRO_DAILY_LIMIT = DAILY_LIMIT;
