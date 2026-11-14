// Runs in the user's browser: photo, measurements, color fan, plan, costs and the Pro preview.
import { buildPaintPlan, paintableArea, CONDITIONS } from "/shared/paintCalc.js";
import { estimateCosts, compareDiyVsPro, COST_DEFAULTS, money } from "/shared/costs.js";
import { estimateHours, formatHours } from "/shared/hours.js";

const $ = (id) => document.getElementById(id);

const state = {
  photoBlob: null, // resized photo, reused for analysis and preview
  photoUrl: null,
  config: { analysisAvailable: true, previewAvailable: false },
  proCode: null,
  brands: [], // from /colors/index.json
  catalogs: {}, // brand id -> loaded catalog
  brandId: "sherwin-williams",
  family: "Whites",
  blades: [], // current family split into fan strips
  bladeIndex: 0, // strip the user is looking at
  chosen: null, // { brandId, brand, code, name, hex }
  paintPriceEdited: false,
};

const FAN_SIZE = 9; // strips shown in the fan at once
const BLADE_LENGTH = 7; // chips per strip, like a paper fan deck

// ---------------------------------------------------------------- Setup
// (init() is called at the bottom of this file, once everything it uses is defined.)

async function init() {
  renderConditions();
  addWallRow();
  addWallRow();
  $("primer-price").value = COST_DEFAULTS.primerPerGallon;
  state.proCode = storage.get("proCode");

  try {
    state.config = await (await fetch("/api/config")).json();
  } catch {
    // Server unreachable: keep defaults, errors will show when buttons are used.
  }
  if (!state.config.analysisAvailable) {
    $("analyze-status").textContent = "Photo analysis isn't set up on this server. Enter measurements yourself below.";
  }

  try {
    const index = await (await fetch("/colors/index.json")).json();
    state.brands = index.brands;
  } catch {
    state.brands = [];
  }
  renderBrandTabs();
  await selectBrand(state.brandId);
}

// ---------------------------------------------------------------- Step 1: photo

$("photo-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  setStatus("analyze-status", "Preparing photo…");
  try {
    state.photoBlob = await shrinkPhoto(file);
    if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    state.photoUrl = URL.createObjectURL(state.photoBlob);
    $("photo-preview").src = state.photoUrl;
    $("photo-preview").hidden = false;
    $("photo-placeholder").hidden = true;
    $("analyze-btn").disabled = !state.config.analysisAvailable;
    setStatus("analyze-status", state.config.analysisAvailable ? "" : "Photo saved for the color preview. Enter measurements below.");
    if (!state.config.analysisAvailable) showSteps();
    updatePreviewSection();
  } catch {
    setStatus("analyze-status", "That photo couldn't be opened. Try a JPEG or PNG.", true);
  }
});

$("analyze-btn").addEventListener("click", async () => {
  if (!state.photoBlob) return;
  const form = new FormData();
  form.append("photo", state.photoBlob, "room.jpg");
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
    fillFromAnalysis(result);
    setStatus("analyze-status", "Done! Check the measurements below.");
    showSteps();
    $("step-room").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    setStatus("analyze-status", err.message, true);
  } finally {
    $("analyze-btn").disabled = false;
  }
});

$("manual-btn").addEventListener("click", () => {
  $("confidence-note").textContent = "Measure along the floor for each wall you're painting.";
  showSteps();
  $("step-room").scrollIntoView({ behavior: "smooth" });
});

function showSteps() {
  $("step-room").hidden = false;
  $("step-color").hidden = false;
  updateAll();
}

function fillFromAnalysis(a) {
  setWalls(a.wall_widths_ft.map((w) => roundHalf(w)));
  $("wall-height").value = Number($("hint-ceiling").value) || roundHalf(a.estimated_wall_height_ft);
  $("doors").value = a.doors;
  $("windows").value = a.windows;
  $("current-color").value = a.current_wall_color_hex.toLowerCase();
  $("current-color-name").textContent = a.current_wall_color_name;
  for (const box of document.querySelectorAll("#conditions input")) {
    box.checked = a.conditions.includes(box.value);
  }
  const confidence = {
    low: "⚠️ Rough estimate: the photo didn't have much to judge size by. Measure the walls if you can.",
    medium: "Reasonable estimate. A quick check with a tape measure will make it exact.",
    high: "Good estimate based on clear size clues in the photo.",
  }[a.size_confidence];
  $("confidence-note").textContent = [
    confidence,
    "Add any walls you're painting that aren't in the photo.",
    a.notes,
  ]
    .filter(Boolean)
    .join(" ");
}

// ---------------------------------------------------------------- Step 2: measurements

$("add-wall").addEventListener("click", () => {
  addWallRow();
  $("walls").lastElementChild.querySelector("input").focus();
  updateAll();
});

$("walls").addEventListener("click", (e) => {
  const btn = e.target.closest(".remove-wall");
  if (!btn) return;
  btn.closest("li").remove();
  if (!$("walls").children.length) addWallRow();
  renumberWalls();
  updateAll();
});

$("quick-fill").addEventListener("click", () => {
  const length = Number($("room-length").value);
  const width = Number($("room-width").value);
  if (!(length > 0 && width > 0)) return;
  setWalls([length, width, length, width]);
  $("ceiling-area").value = Math.round(length * width);
  $("quick-room").open = false;
  updateAll();
});

$("include-ceiling").addEventListener("change", (e) => {
  $("ceiling-area-wrap").hidden = !e.target.checked;
  const length = Number($("room-length").value);
  const width = Number($("room-width").value);
  if (e.target.checked && !$("ceiling-area").value && length > 0 && width > 0) {
    $("ceiling-area").value = Math.round(length * width);
  }
  updateAll();
});

// Any change to the measurements, condition boxes or prices refreshes the totals.
for (const id of ["step-room", "results"]) {
  $(id).addEventListener("input", (e) => {
    if (e.target.id === "paint-price") state.paintPriceEdited = true;
    updateAll();
  });
}

function addWallRow(value = "") {
  const li = document.createElement("li");
  li.innerHTML = `
    <span class="wall-label"></span>
    <input type="number" inputmode="decimal" min="0" step="0.5" placeholder="ft" aria-label="Wall length in feet" />
    <button type="button" class="remove-wall" aria-label="Remove wall">✕</button>`;
  li.querySelector("input").value = value;
  $("walls").append(li);
  renumberWalls();
}

function setWalls(widths) {
  $("walls").innerHTML = "";
  for (const w of widths.length ? widths : [""]) addWallRow(w);
}

function renumberWalls() {
  [...$("walls").children].forEach((li, i) => {
    li.querySelector(".wall-label").textContent = `Wall ${i + 1}`;
  });
}

function renderConditions() {
  $("conditions").innerHTML = Object.entries(CONDITIONS)
    .map(([key, label]) => `<label><input type="checkbox" value="${key}" /> ${label}</label>`)
    .join("");
}

function readRoom() {
  return {
    wallWidthsFt: [...document.querySelectorAll("#walls input")].map((i) => Number(i.value) || 0),
    wallHeightFt: Number($("wall-height").value),
    doors: Number($("doors").value),
    windows: Number($("windows").value),
    includeCeiling: $("include-ceiling").checked,
    ceilingSqFt: Number($("ceiling-area").value),
    currentColorHex: $("current-color").value,
    conditions: [...document.querySelectorAll("#conditions input:checked")].map((b) => b.value),
  };
}

function renderAreaTotal(room) {
  const walls = room.wallWidthsFt.filter((w) => w > 0).length;
  let a;
  try {
    a = paintableArea(room);
  } catch {
    $("area-total").innerHTML = `<span class="muted">Enter wall lengths and height to see the square footage.</span>`;
    return;
  }
  $("area-total").innerHTML = `
    <div class="total-line"><span>${walls} wall${walls > 1 ? "s" : ""}: ${fmt(a.totalWallWidthFt)} ft × ${fmt(a.wallHeightFt)} ft</span><span>${fmt(a.grossWallSqFt)} sq ft</span></div>
    <div class="total-line"><span>Doors &amp; windows</span><span>− ${fmt(a.openingsSqFt)} sq ft</span></div>
    ${a.ceilingSqFt ? `<div class="total-line"><span>Ceiling</span><span>+ ${fmt(a.ceilingSqFt)} sq ft</span></div>` : ""}
    <div class="total-line grand"><span>Total to paint</span><span>${fmt(a.totalSqFt)} sq ft</span></div>`;
}

// ---------------------------------------------------------------- Step 3: color fan

function renderBrandTabs() {
  $("brand-tabs").innerHTML = state.brands
    .map(
      (b) =>
        `<button type="button" role="tab" data-brand="${b.id}" aria-selected="${b.id === state.brandId}">${escapeHtml(b.name)}</button>`,
    )
    .join("");
}

$("brand-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-brand]");
  if (btn) selectBrand(btn.dataset.brand);
});

async function selectBrand(id) {
  state.brandId = id;
  for (const b of document.querySelectorAll("#brand-tabs button")) {
    b.setAttribute("aria-selected", String(b.dataset.brand === id));
  }
  const catalog = await loadCatalog(id);
  if (!catalog) {
    $("brand-note").textContent = "The color catalog couldn't be loaded.";
    return;
  }
  $("brand-note").textContent = catalog.note || `${catalog.colors.length.toLocaleString()} ${catalog.brand} colors.`;
  renderFamilies(catalog);
  selectFamily(state.family);
  runSearch();
}

async function loadCatalog(id) {
  if (state.catalogs[id]) return state.catalogs[id];
  try {
    const res = await fetch(`/colors/${id}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    // [code, name, hex, family, hue, lightness] → objects
    data.colors = data.colors.map(([code, name, hex, family, hue, light]) => ({
      code,
      name,
      hex,
      family,
      hue,
      light,
    }));
    state.catalogs[id] = data;
    return data;
  } catch {
    return null;
  }
}

function renderFamilies(catalog) {
  // Show each family with a typical color from this brand as its dot.
  $("families").innerHTML = catalog.families
    .map((f) => {
      const members = catalog.colors.filter((c) => c.family === f);
      if (!members.length) return "";
      const sample = members.sort((a, b) => Math.abs(a.light - 60) - Math.abs(b.light - 60))[0];
      const dot = f === "Whites" ? "#f4f2ea" : sample.hex;
      return `<button type="button" class="family" data-family="${f}" aria-pressed="false"><span style="background:${dot}"></span>${f}</button>`;
    })
    .join("");
}

$("families").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-family]");
  if (btn) selectFamily(btn.dataset.family);
});

function selectFamily(family) {
  const catalog = state.catalogs[state.brandId];
  if (!catalog) return;
  state.family = family;
  for (const b of document.querySelectorAll(".family")) {
    b.setAttribute("aria-pressed", String(b.dataset.family === family));
  }
  // Like a paper fan deck: order colors by hue, cut into strips, lightest at the top of each strip.
  const members = catalog.colors
    .filter((c) => c.family === family)
    .sort((a, b) => a.hue - b.hue || b.light - a.light);
  state.blades = [];
  for (let i = 0; i < members.length; i += BLADE_LENGTH) {
    state.blades.push(members.slice(i, i + BLADE_LENGTH).sort((a, b) => b.light - a.light));
  }
  state.bladeIndex = Math.min(Math.floor(FAN_SIZE / 2), state.blades.length - 1);
  $("fan-scrub").max = Math.max(0, state.blades.length - 1);
  renderFan();
}

function renderFan() {
  const total = state.blades.length;
  if (!total) {
    $("fan").innerHTML = "";
    $("blade-detail").innerHTML = "";
    $("fan-position").textContent = "No colors in this family.";
    return;
  }
  // Show up to FAN_SIZE strips around the selected one, spread out like an open fan.
  const start = Math.max(0, Math.min(state.bladeIndex - Math.floor(FAN_SIZE / 2), total - FAN_SIZE));
  const visible = state.blades.slice(start, start + FAN_SIZE);
  const spread = 84; // degrees from the leftmost to the rightmost strip
  const step = visible.length > 1 ? spread / (visible.length - 1) : 0;

  $("fan").innerHTML =
    visible
      .map((blade, i) => {
        const index = start + i;
        const angle = visible.length > 1 ? -spread / 2 + i * step : 0;
        const selected = index === state.bladeIndex;
        return `<button type="button" class="blade${selected ? " selected" : ""}" data-blade="${index}"
            style="--angle:${angle}deg; z-index:${selected ? 50 : i}"
            aria-label="Color strip ${index + 1}" aria-pressed="${selected}">
            ${blade.map((c) => `<span style="background:${c.hex}"></span>`).join("")}
          </button>`;
      })
      .join("") + `<span class="rivet" aria-hidden="true"></span>`;

  $("fan-scrub").value = state.bladeIndex;
  $("fan-prev").disabled = state.bladeIndex === 0;
  $("fan-next").disabled = state.bladeIndex >= total - 1;
  $("fan-position").textContent = `Strip ${state.bladeIndex + 1} of ${total} · ${state.family}`;
  renderBladeDetail();
}

function renderBladeDetail() {
  const blade = state.blades[state.bladeIndex] || [];
  $("blade-detail").innerHTML = blade.map((c) => colorRow(c, state.brandId)).join("");
}

$("fan").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-blade]");
  if (!btn) return;
  state.bladeIndex = Number(btn.dataset.blade);
  renderFan();
});
$("fan-prev").addEventListener("click", () => moveBlade(-1));
$("fan-next").addEventListener("click", () => moveBlade(1));
$("fan-scrub").addEventListener("input", (e) => {
  state.bladeIndex = Number(e.target.value);
  renderFan();
});

function moveBlade(delta) {
  state.bladeIndex = Math.max(0, Math.min(state.blades.length - 1, state.bladeIndex + delta));
  renderFan();
}

// Swipe left/right on the fan to turn through the strips.
let touchX = null;
$("fan").addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
$("fan").addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 30) moveBlade(dx < 0 ? 1 : -1);
  touchX = null;
});

function colorRow(c, brandId) {
  const selected = state.chosen && state.chosen.brandId === brandId && state.chosen.code === c.code;
  return `<li><button type="button" class="color-pick${selected ? " selected" : ""}" data-code="${escapeHtml(c.code)}" data-brand="${brandId}">
      <span class="chip" style="background:${c.hex}"></span>
      <span class="color-text"><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.code)}</small></span>
      ${selected ? '<span class="tick">✓</span>' : ""}
    </button></li>`;
}

for (const id of ["blade-detail", "search-results"]) {
  $(id).addEventListener("click", (e) => {
    const btn = e.target.closest(".color-pick");
    if (!btn) return;
    const catalog = state.catalogs[btn.dataset.brand];
    const color = catalog.colors.find((c) => c.code === btn.dataset.code);
    chooseColor({ brandId: btn.dataset.brand, brand: catalog.brand, ...color });
  });
}

$("color-search").addEventListener("input", runSearch);

function runSearch() {
  const q = $("color-search").value.trim().toLowerCase();
  const searching = q.length >= 2;
  $("fan-view").hidden = searching;
  $("search-view").hidden = !searching;
  if (!searching) return;
  const catalog = state.catalogs[state.brandId];
  if (!catalog) return;
  const compact = q.replace(/[\s-]/g, "");
  const matches = catalog.colors
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().replace(/[\s-]/g, "").includes(compact),
    )
    .slice(0, 60);
  $("search-results").innerHTML = matches.length
    ? matches.map((c) => colorRow(c, state.brandId)).join("")
    : `<li class="muted">No ${escapeHtml(catalog.brand)} colors match "${escapeHtml(q)}". Try another brand tab.</li>`;
}

$("use-custom").addEventListener("click", () => {
  chooseColor({
    brandId: "other",
    brand: null,
    code: "",
    name: $("custom-name").value.trim() || "Custom color",
    hex: $("custom-color").value,
  });
});

function chooseColor(color) {
  state.chosen = color;
  if (!state.paintPriceEdited) {
    $("paint-price").value = COST_DEFAULTS.paintPerGallon[color.brandId] ?? COST_DEFAULTS.paintPerGallon.other;
  }
  $("chosen").hidden = false;
  $("chosen").innerHTML = `
    <span class="chip big" style="background:${color.hex}"></span>
    <span><small>Your new color</small><strong>${escapeHtml(color.name)}</strong>
    <small>${escapeHtml([color.brand, color.code].filter(Boolean).join(" · "))}</small></span>`;
  renderBladeDetail();
  runSearch();
  updateAll();
  updatePreviewSection();
}

function colorLabel(c) {
  return [c.brand, c.name, c.code ? `(${c.code})` : ""].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------- Plan + costs (live)

function updateAll() {
  const room = readRoom();
  renderAreaTotal(room);
  if (!state.chosen) return;

  let plan;
  try {
    plan = buildPaintPlan({ ...room, targetColorHex: state.chosen.hex });
  } catch {
    $("results").hidden = true;
    return; // measurements not filled in yet
  }
  const costs = estimateCosts(plan, {
    brandId: state.chosen.brandId,
    paintPerGallon: $("paint-price").value,
    primerPerGallon: $("primer-price").value,
    region: $("region").value,
    conditions: room.conditions,
  });
  const wasHidden = $("results").hidden;
  renderPlan(plan);
  const hours = estimateHours(plan, room);
  renderHours(hours);
  renderCosts(costs, hours);
  $("results").hidden = false;
  if (wasHidden) $("results").scrollIntoView({ behavior: "smooth" });
}
$("region").addEventListener("change", updateAll);

function renderPlan(p) {
  const primerLabel = { none: "None", spot: "Spot", full: "Full coat" }[p.primer];
  const shopping = [
    `<li><strong>Paint: ${p.paint.buy.label}</strong> of ${escapeHtml(colorLabel(state.chosen))}<br><small>${p.paint.buy.note}${
      p.paint.buy.bucketTip ? " Tip: a 5-gallon bucket is usually cheaper than 5 single gallons." : ""
    }</small></li>`,
  ];
  if (p.primerAmount) {
    shopping.push(
      `<li><strong>Primer: ${p.primerAmount.buy.label}</strong> of ${escapeHtml(p.primerType)}<br><small>${p.primerAmount.buy.note}</small></li>`,
    );
  }
  shopping.push("<li>Painter's tape, drop cloths, a 9\" roller with 3/8\" nap, a tray and a 2\" angled brush</li>");

  $("plan-body").innerHTML = `
    <div class="big-numbers">
      <div><strong>${Math.round(p.area.totalSqFt)}</strong><span>sq ft to paint</span></div>
      <div><strong>${p.coats}</strong><span>coat${p.coats > 1 ? "s" : ""} of paint</span></div>
      <div><strong>${primerLabel}</strong><span>primer</span></div>
    </div>
    <h3>🛒 Shopping list</h3>
    <ul class="shopping">${shopping.join("")}</ul>
    ${p.coats === 1 ? "<p class='hint'>The paint is sized for two coats, in case one doesn't cover evenly.</p>" : ""}
    ${p.prepSteps.length ? `<h3>🧰 Prep first</h3><ol>${p.prepSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>` : ""}
    <details><summary>Why this plan</summary>
      <ul class="reasons">${p.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
      <ul class="assumptions">${p.assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
    </details>`;
}

function renderHours(h) {
  const phases = h.phases
    .map((p, i) => {
      const next = h.phases[i + 1];
      const tasks = p.tasks
        .map((t) => `<li><span>${escapeHtml(t.name)}</span><span>${formatHours(t.hours)}</span></li>`)
        .join("");
      const waits = p.waits
        .map(
          (w) =>
            `<li class="wait"><span>⏳ ${escapeHtml(w.name)}</span><span>${formatHours(w.hours)}</span></li>`,
        )
        .join("");
      return `
        <li class="phase">
          <div class="phase-head">
            <span class="phase-num">${i + 1}</span>
            <strong>${escapeHtml(p.name)}</strong>
            <span class="phase-hours">${formatHours(p.hours)}</span>
          </div>
          <ul class="lines">${tasks}${waits}</ul>
          <p class="gate"><strong>✅ ${next ? `Ready for ${escapeHtml(next.name)} when` : "Done when"}:</strong> ${escapeHtml(p.gate)}</p>
        </li>`;
    })
    .join("");

  $("hours-body").innerHTML = `
    <div class="big-numbers">
      <div><strong>${formatHours(h.workHours).replace(/ hrs?$/, "")}</strong><span>hours of work</span></div>
      <div><strong>${formatHours(h.waitHours).replace(/ hrs?$/, "")}</strong><span>hours drying</span></div>
      <div><strong class="schedule">${escapeHtml(h.schedule)}</strong><span>plan for</span></div>
    </div>
    <ol class="phases">${phases}</ol>
    <p class="hint">A 2-person pro crew: about <strong>${formatHours(h.proCrewHours)}</strong> on site, plus drying time.</p>
    <ul class="assumptions">${h.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`;
}

function renderCosts(c, h) {
  const range = ([lo, hi]) => `${money(lo)}–${money(hi)}`;
  const cmp = compareDiyVsPro(c, h);
  $("cost-body").innerHTML = `
    <div class="cost-compare">
      <div class="cost diy">
        <span>Do it yourself</span>
        <strong>${money(c.diy.total)}</strong>
        <small>materials</small>
        <div class="cost-time"><b>${formatHours(h.workHours)}</b><small>of your time</small><small>Plan for ${escapeHtml(h.schedule.toLowerCase())}</small></div>
      </div>
      <div class="cost pro">
        <span>Hire a pro</span>
        <strong>${range(c.pro.total)}</strong>
        <small>labor + materials</small>
        <div class="cost-time"><b>${formatHours(h.proCrewHours)}</b><small>crew on site</small><small>${escapeHtml(h.proSchedule)}</small></div>
      </div>
    </div>
    <p class="savings">Doing it yourself saves about <strong>${range(cmp.dollarsSaved)}</strong> for <strong>${formatHours(cmp.yourHours)}</strong> of work. That's roughly <strong>${money(cmp.dollarsPerHour)} for every hour</strong> you put in.</p>
    <details><summary>Cost breakdown</summary>
      <h4>Materials</h4>
      <ul class="lines">${c.diy.lines.map((l) => `<li><span>${escapeHtml(l.label)}</span><span>${money(l.amount)}</span></li>`).join("")}</ul>
      <h4>Professional labor</h4>
      <ul class="lines">${c.pro.laborParts.map((l) => `<li><span>${escapeHtml(l.label)}</span><span>${range(l.range)}</span></li>`).join("")}
      ${c.pro.minimumApplies ? `<li><span>Raised to a typical minimum job charge</span><span></span></li>` : ""}</ul>
      <ul class="assumptions">${c.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
    </details>`;
}

// ---------------------------------------------------------------- Pro: AI color preview

function updatePreviewSection() {
  // Only offer the preview when the server can make one and there's a photo and a color.
  const ready = state.config.previewAvailable && state.photoBlob && state.chosen;
  $("preview-section").hidden = !ready;
  if (!ready) return;
  const pro = Boolean(state.proCode);
  $("pro-locked").hidden = pro;
  $("preview-btn").hidden = !pro;
  $("preview-btn").textContent = `Show my room in ${state.chosen.name}`;
}

$("pro-unlock").addEventListener("click", async () => {
  const code = $("pro-code").value.trim();
  if (!code) return;
  try {
    const res = await fetch("/api/pro/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const { pro } = await res.json();
    if (!pro) {
      setStatus("preview-status", "That code didn't work. Check it and try again.", true);
      return;
    }
    state.proCode = code;
    storage.set("proCode", code);
    setStatus("preview-status", "Pro unlocked!");
    updatePreviewSection();
  } catch {
    setStatus("preview-status", "Couldn't check the code. Try again.", true);
  }
});

$("preview-btn").addEventListener("click", async () => {
  if (!state.photoBlob || !state.chosen) return;
  const form = new FormData();
  form.append("photo", state.photoBlob, "room.jpg");
  form.append("colorHex", state.chosen.hex);
  form.append("colorName", colorLabel(state.chosen));

  $("preview-btn").disabled = true;
  setStatus("preview-status", "Repainting your room… this can take up to a minute.");
  try {
    const { image } = await postForm("/api/preview", form, { "x-pro-code": state.proCode });
    $("before-img").src = state.photoUrl;
    $("after-img").src = image;
    $("after-caption").textContent = state.chosen.name;
    $("preview-result").hidden = false;
    setStatus("preview-status", "");
  } catch (err) {
    if (err.status === 402) {
      // The code stopped working (e.g. it was removed): lock the feature again.
      state.proCode = null;
      storage.remove("proCode");
      updatePreviewSection();
    }
    setStatus("preview-status", err.message, true);
  } finally {
    $("preview-btn").disabled = false;
  }
});

// ---------------------------------------------------------------- Helpers

/** Phone photos can be 5–10 MB. Shrink to a JPEG at most 1600px on its long side. */
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

async function postForm(url, form, headers = {}) {
  const res = await fetch(url, { method: "POST", body: form, headers });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("The server didn't respond properly. Is it running?");
  }
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { status: res.status });
  return data;
}

// Browser storage can be blocked (private mode), so never let it break the page.
const storage = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  remove: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

function setStatus(id, text, isError = false) {
  $(id).textContent = text;
  $(id).classList.toggle("error", isError);
}

function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

function fmt(n) {
  return Number(n.toFixed(1)).toLocaleString("en-US");
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

init();
