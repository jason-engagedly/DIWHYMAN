// Runs in the user's browser: handles the photo, the form and showing results.

// Keep these keys in sync with CONDITIONS in lib/paintCalc.js.
const CONDITIONS = {
  bare_drywall: "New or unpainted drywall",
  patches: "Patched or repaired spots",
  stains: "Stains, water marks or smoke damage",
  glossy_finish: "Glossy or semi-gloss existing paint",
  cracks_or_peeling: "Cracks or peeling paint",
  wallpaper: "Wallpaper on the wall",
};

const SWATCHES = [
  { name: "Bright white", hex: "#f4f3ee" },
  { name: "Greige", hex: "#c9bfb1" },
  { name: "Sage green", hex: "#7a9e7e" },
  { name: "Soft blue", hex: "#a7bfd1" },
  { name: "Navy", hex: "#22344d" },
  { name: "Charcoal", hex: "#3c3f41" },
  { name: "Terracotta", hex: "#c0623f" },
  { name: "Butter yellow", hex: "#f1d77c" },
];

const $ = (id) => document.getElementById(id);
let photoBlob = null; // resized photo, reused for analysis and preview
let photoUrl = null;

// ---------- Step 1: photo ----------

$("photo-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  setStatus("analyze-status", "Preparing photo…");
  try {
    photoBlob = await shrinkPhoto(file);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(photoBlob);
    $("photo-preview").src = photoUrl;
    $("photo-preview").hidden = false;
    $("photo-placeholder").hidden = true;
    $("analyze-btn").disabled = false;
    setStatus("analyze-status", "");
  } catch {
    setStatus("analyze-status", "That photo couldn't be opened. Try a JPEG or PNG.", true);
  }
});

$("analyze-btn").addEventListener("click", async () => {
  if (!photoBlob) return;
  const form = new FormData();
  form.append("photo", photoBlob, "room.jpg");
  form.append("ceilingHeightFt", $("hint-ceiling").value);
  form.append("knownWallWidthFt", $("hint-width").value);

  $("analyze-btn").disabled = true;
  setStatus("analyze-status", "Looking at your room… this takes about 10–30 seconds.");
  try {
    const result = await postForm("/api/analyze", form);
    if (!result.is_room_photo) {
      setStatus("analyze-status", "That doesn't look like a room with walls to paint. Try another photo.", true);
      return;
    }
    fillRoomForm(result);
    setStatus("analyze-status", "Done! Check the numbers below.");
    showStep("step-room");
    showStep("step-color");
    $("step-room").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    setStatus("analyze-status", err.message, true);
  } finally {
    $("analyze-btn").disabled = false;
  }
});

$("manual-btn").addEventListener("click", () => {
  $("confidence-note").textContent = "Measure each wall you're painting and add the widths together.";
  showStep("step-room");
  showStep("step-color");
  $("step-room").scrollIntoView({ behavior: "smooth" });
});

function fillRoomForm(a) {
  // Prefer the user's own measurements over the AI's estimate.
  $("wall-width").value = round(a.estimated_wall_width_ft);
  $("wall-height").value = Number($("hint-ceiling").value) || round(a.estimated_wall_height_ft);
  $("doors").value = a.doors;
  $("windows").value = a.windows;
  $("current-color").value = a.current_wall_color_hex.toLowerCase();
  $("current-color-name").textContent = a.current_wall_color_name;
  for (const box of document.querySelectorAll("#conditions input")) {
    box.checked = a.conditions.includes(box.value);
  }

  const confidence = {
    low: "⚠️ Rough estimate: the photo didn't have much to judge size by. Measure the walls if you can.",
    medium: "Reasonable estimate. A quick tape-measure check will make it exact.",
    high: "Good estimate based on clear size clues in the photo.",
  }[a.size_confidence];
  $("confidence-note").textContent = [
    confidence,
    `We saw ${a.walls_visible} wall${a.walls_visible === 1 ? "" : "s"}. If you're painting walls that aren't in the photo, add their widths.`,
    a.notes,
  ]
    .filter(Boolean)
    .join(" ");
}

// ---------- Step 2: conditions + ceiling ----------

$("conditions").innerHTML = Object.entries(CONDITIONS)
  .map(([key, label]) => `<label><input type="checkbox" value="${key}" /> ${label}</label>`)
  .join("");

$("include-ceiling").addEventListener("change", (e) => {
  $("ceiling-area-wrap").hidden = !e.target.checked;
});

// ---------- Step 3: color ----------

$("swatches").innerHTML = SWATCHES.map(
  (s) =>
    `<button type="button" class="swatch" data-hex="${s.hex}" data-name="${s.name}" aria-pressed="false">
       <span style="background:${s.hex}"></span><small>${s.name}</small>
     </button>`,
).join("");

$("swatches").addEventListener("click", (e) => {
  const btn = e.target.closest(".swatch");
  if (!btn) return;
  $("target-color").value = btn.dataset.hex;
  $("target-name").value = btn.dataset.name;
  markSwatch(btn.dataset.hex);
});
$("target-color").addEventListener("input", (e) => {
  $("target-name").value = "";
  markSwatch(e.target.value);
});

function markSwatch(hex) {
  for (const b of document.querySelectorAll(".swatch")) {
    b.setAttribute("aria-pressed", String(b.dataset.hex === hex));
  }
}
markSwatch($("target-color").value);

// ---------- Plan ----------

$("plan-btn").addEventListener("click", async () => {
  const body = {
    wallWidthFt: Number($("wall-width").value),
    wallHeightFt: Number($("wall-height").value),
    doors: Number($("doors").value),
    windows: Number($("windows").value),
    includeCeiling: $("include-ceiling").checked,
    ceilingSqFt: Number($("ceiling-area").value),
    currentColorHex: $("current-color").value,
    targetColorHex: $("target-color").value,
    conditions: [...document.querySelectorAll("#conditions input:checked")].map((b) => b.value),
  };
  if (!(body.wallWidthFt > 0) || !(body.wallHeightFt > 0)) {
    setStatus("plan-status", "Enter the wall width and height in step 2 first.", true);
    $("step-room").scrollIntoView({ behavior: "smooth" });
    return;
  }
  setStatus("plan-status", "");
  try {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const plan = await res.json();
    if (!res.ok) throw new Error(plan.error);
    renderPlan(plan);
  } catch (err) {
    setStatus("plan-status", err.message, true);
  }
});

function renderPlan(p) {
  const primerLabel = { none: "None", spot: "Spot", full: "Full coat" }[p.primer];
  const colorName = $("target-name").value || $("target-color").value;
  const shopping = [`<li><strong>Paint (${escapeHtml(colorName)}):</strong> ${p.paint.buy.label}</li>`];
  if (p.primerAmount) {
    shopping.push(`<li><strong>Primer:</strong> ${p.primerAmount.buy.label} of ${escapeHtml(p.primerType)}</li>`);
  }
  shopping.push(
    "<li>Painter's tape, drop cloths, a 9\" roller with 3/8\" nap, a tray and a 2\" angled brush for edges</li>",
  );

  $("results").innerHTML = `
    <h2>Your paint plan</h2>
    <div class="big-numbers">
      <div><strong>${Math.round(p.area.totalSqFt)}</strong><span>sq ft to paint</span></div>
      <div><strong>${p.coats}</strong><span>coat${p.coats > 1 ? "s" : ""} of paint</span></div>
      <div><strong>${primerLabel}</strong><span>primer</span></div>
    </div>

    <h3>🛒 Shopping list</h3>
    <ul class="shopping">${shopping.join("")}</ul>
    ${p.coats === 1 ? "<p class='hint'>We've still sized the paint for two coats, in case one doesn't cover evenly.</p>" : ""}

    ${p.prepSteps.length ? `<h3>🧰 Prep first</h3><ol>${p.prepSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>` : ""}

    <h3>Why this plan</h3>
    <ul class="reasons">${p.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>

    <h3>Area breakdown</h3>
    <p>${p.area.grossWallSqFt} sq ft of wall − ${p.area.openingsSqFt} sq ft of doors/windows = <strong>${p.area.wallSqFt} sq ft</strong>${
      p.area.ceilingSqFt ? ` + ${p.area.ceilingSqFt} sq ft ceiling` : ""
    }</p>
    <ul class="assumptions">${p.assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
  `;
  showStep("results");
  $("results").scrollIntoView({ behavior: "smooth" });
}

// ---------- Preview ----------

$("preview-btn").addEventListener("click", async () => {
  if (!photoBlob) {
    setStatus("plan-status", "Add a photo in step 1 to see a preview.", true);
    $("step-photo").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const form = new FormData();
  form.append("photo", photoBlob, "room.jpg");
  form.append("colorHex", $("target-color").value);
  form.append("colorName", $("target-name").value);

  $("preview-btn").disabled = true;
  setStatus("plan-status", "Repainting your room… this can take up to a minute.");
  try {
    const { image } = await postForm("/api/preview", form);
    $("before-img").src = photoUrl;
    $("after-img").src = image;
    $("preview-color-label").textContent = $("target-name").value || $("target-color").value;
    showStep("preview-card");
    setStatus("plan-status", "");
    $("preview-card").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    setStatus("plan-status", err.message, true);
  } finally {
    $("preview-btn").disabled = false;
  }
});

// ---------- Helpers ----------

/** Phone photos can be 5–10 MB. Shrink to a JPEG at most 1600px wide to upload quickly. */
async function shrinkPhoto(file, maxSide = 1600) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.88),
  );
}

async function postForm(url, form) {
  const res = await fetch(url, { method: "POST", body: form });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("The server didn't respond properly. Is it running?");
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function setStatus(id, text, isError = false) {
  $(id).textContent = text;
  $(id).classList.toggle("error", isError);
}

function showStep(id) {
  $(id).hidden = false;
}

function round(n) {
  return Math.round(n * 2) / 2; // nearest half foot
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
