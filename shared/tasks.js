// The DIY task catalog: every kind of job the app covers (or plans to), grouped by category,
// with a difficulty rating and safety rules. The user's experience is asked separately for each
// task, because being confident at painting says nothing about replacing a toilet.
// How experience changes the hours lives in shared/hours.js (rangeForExperience).
// Plain JavaScript with no imports, so it runs in both the browser and the server.
//
// Difficulty ratings are a first pass based on common DIY guidance. They should be checked
// with working tradespeople before launch.

export const EXPERIENCE_LEVELS = {
  new: { label: "New to this", hint: "I've never done it" },
  some: { label: "Some experience", hint: "I've done it once or twice" },
  confident: { label: "Confident", hint: "I do this regularly" },
};

export const DIFFICULTY_LABELS = ["", "Easy", "Easy to moderate", "Moderate", "Advanced", "Pro recommended"];

// Each factor is rated 1 (low) to 5 (high):
//   skill: technique and judgment needed
//   physical: lifting, ladders, awkward positions
//   mistakeCost: how bad and how expensive a mistake is (leaks, damage, safety)
//   tools: special tools beyond a basic toolbox
export const CATEGORIES = {
  painting_walls: "Painting & walls",
  plumbing: "Plumbing",
  electrical: "Electrical",
  carpentry: "Carpentry & doors",
  flooring: "Flooring",
  outdoor: "Outdoor",
};

// status: "live" = built into the app, "planned" = on the roadmap.
// permit: "no" | "sometimes" | "usually" (rules vary by city).
// safety: null | "caution" (doable with care) | "always_pro" (the app always recommends a licensed pro).
export const TASKS = {
  // ---------------- Painting & walls
  interior_painting: {
    name: "Interior painting",
    category: "painting_walls",
    status: "live",
    difficulty: 2,
    factors: { skill: 2, physical: 2, mistakeCost: 1, tools: 1 },
    permit: "no",
    safety: null,
    question: "How much interior painting have you done?",
  },
  drywall_patching: {
    name: "Drywall patching",
    category: "painting_walls",
    status: "live",
    difficulty: 2,
    factors: { skill: 3, physical: 1, mistakeCost: 1, tools: 2 },
    permit: "no",
    safety: null,
    question: "How much drywall patching have you done?",
  },
  wallpaper_removal: {
    name: "Wallpaper removal",
    category: "painting_walls",
    status: "planned",
    difficulty: 2,
    factors: { skill: 1, physical: 3, mistakeCost: 2, tools: 2 },
    permit: "no",
    safety: "caution",
    safetyNote: "Homes built before 1978 may have lead paint underneath. Test before scraping or sanding.",
    question: "How much wallpaper removal have you done?",
  },

  // ---------------- Plumbing
  faucet_cartridge: {
    name: "Fix a leaky faucet (cartridge or washer)",
    category: "plumbing",
    status: "planned",
    difficulty: 2,
    factors: { skill: 2, physical: 1, mistakeCost: 2, tools: 2 },
    permit: "no",
    safety: null,
    question: "How much faucet repair have you done?",
  },
  faucet_replace: {
    name: "Replace a faucet",
    category: "plumbing",
    status: "planned",
    difficulty: 3,
    factors: { skill: 3, physical: 3, mistakeCost: 3, tools: 3 },
    permit: "no",
    safety: null,
    question: "How much faucet installation have you done?",
  },
  toilet_flapper: {
    name: "Fix a running toilet (flapper or fill valve)",
    category: "plumbing",
    status: "planned",
    difficulty: 1,
    factors: { skill: 1, physical: 1, mistakeCost: 1, tools: 1 },
    permit: "no",
    safety: null,
    question: "How much toilet repair have you done?",
  },
  toilet_replace: {
    name: "Replace a toilet",
    category: "plumbing",
    status: "planned",
    difficulty: 3,
    factors: { skill: 3, physical: 4, mistakeCost: 4, tools: 2 },
    permit: "sometimes",
    safety: null,
    question: "How much toilet installation have you done?",
  },
  water_heater: {
    name: "Replace a water heater",
    category: "plumbing",
    status: "planned",
    difficulty: 5,
    factors: { skill: 4, physical: 5, mistakeCost: 5, tools: 4 },
    permit: "usually",
    safety: "always_pro",
    safetyNote: "Gas lines, venting and pressure relief valves can be dangerous if done wrong. Hire a licensed plumber.",
    question: "How much water heater work have you done?",
  },

  // ---------------- Electrical
  outlet_switch: {
    name: "Replace an outlet or light switch",
    category: "electrical",
    status: "planned",
    difficulty: 3,
    factors: { skill: 3, physical: 1, mistakeCost: 4, tools: 2 },
    permit: "sometimes",
    safety: "caution",
    safetyNote: "Turn off the breaker and check the wires are dead with a voltage tester before touching anything.",
    question: "How much electrical work have you done?",
  },
  light_fixture: {
    name: "Replace a light fixture",
    category: "electrical",
    status: "planned",
    difficulty: 3,
    factors: { skill: 3, physical: 3, mistakeCost: 4, tools: 2 },
    permit: "sometimes",
    safety: "caution",
    safetyNote: "Turn off the breaker and check the wires are dead with a voltage tester before touching anything.",
    question: "How much light fixture installation have you done?",
  },
  new_circuit: {
    name: "Add a new circuit or panel work",
    category: "electrical",
    status: "planned",
    difficulty: 5,
    factors: { skill: 5, physical: 3, mistakeCost: 5, tools: 4 },
    permit: "usually",
    safety: "always_pro",
    safetyNote: "Panel and new-circuit work can cause fires or electrocution and usually needs a permit. Hire a licensed electrician.",
    question: "How much electrical panel work have you done?",
  },

  // ---------------- Carpentry & doors
  door_hardware: {
    name: "Replace door hardware",
    category: "carpentry",
    status: "planned",
    difficulty: 1,
    factors: { skill: 1, physical: 1, mistakeCost: 1, tools: 1 },
    permit: "no",
    safety: null,
    question: "How much door hardware work have you done?",
  },
  interior_door: {
    name: "Hang an interior door",
    category: "carpentry",
    status: "planned",
    difficulty: 3,
    factors: { skill: 4, physical: 3, mistakeCost: 2, tools: 3 },
    permit: "no",
    safety: null,
    question: "How much door installation have you done?",
  },
  baseboards: {
    name: "Install baseboards",
    category: "carpentry",
    status: "planned",
    difficulty: 3,
    factors: { skill: 4, physical: 2, mistakeCost: 2, tools: 4 },
    permit: "no",
    safety: null,
    question: "How much trim carpentry have you done?",
  },

  // ---------------- Flooring
  click_flooring: {
    name: "Install click-lock vinyl or laminate flooring",
    category: "flooring",
    status: "planned",
    difficulty: 3,
    factors: { skill: 3, physical: 4, mistakeCost: 3, tools: 3 },
    permit: "no",
    safety: null,
    question: "How much flooring installation have you done?",
  },
  regrout_tile: {
    name: "Regrout tile",
    category: "flooring",
    status: "planned",
    difficulty: 2,
    factors: { skill: 2, physical: 3, mistakeCost: 2, tools: 2 },
    permit: "no",
    safety: null,
    question: "How much tile work have you done?",
  },

  // ---------------- Outdoor
  deck_staining: {
    name: "Clean and stain a deck",
    category: "outdoor",
    status: "planned",
    difficulty: 2,
    factors: { skill: 2, physical: 4, mistakeCost: 2, tools: 2 },
    permit: "no",
    safety: null,
    question: "How much deck staining have you done?",
  },
  gutter_cleaning: {
    name: "Clean gutters",
    category: "outdoor",
    status: "planned",
    difficulty: 2,
    factors: { skill: 1, physical: 4, mistakeCost: 3, tools: 2 },
    permit: "no",
    safety: "caution",
    safetyNote: "Ladder falls are a leading cause of home injuries. Use a stable ladder and have someone hold it. Consider a pro for second-story gutters.",
    question: "How much gutter cleaning have you done?",
  },
  roof_repair: {
    name: "Roof repair",
    category: "outdoor",
    status: "planned",
    difficulty: 5,
    factors: { skill: 4, physical: 5, mistakeCost: 5, tools: 4 },
    permit: "sometimes",
    safety: "always_pro",
    safetyNote: "Working at roof height is dangerous, and a bad repair can cause hidden water damage. Hire a licensed roofer.",
    question: "How much roofing work have you done?",
  },
};

export function difficultyLabel(level) {
  return DIFFICULTY_LABELS[level] || "";
}

/** Tasks grouped by category, for menus and roadmap lists. */
export function tasksByCategory() {
  return Object.entries(CATEGORIES).map(([id, name]) => ({
    id,
    name,
    tasks: Object.entries(TASKS)
      .filter(([, t]) => t.category === id)
      .map(([taskId, t]) => ({ id: taskId, ...t })),
  }));
}
