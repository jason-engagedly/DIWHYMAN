# DIWHYMAN: Product Vision and Build Plan

_Living document. Last updated: 2026-11-15._

This document explains what DIWHYMAN is, where it stands today, how it can make money, and what gets built next. It's written for anyone joining the project, whether building it or backing it. It's updated as the product changes; see the [change log](#change-log) at the end.

---

## 1. In one paragraph

DIWHYMAN helps people decide between doing a home repair themselves and hiring a pro, and then helps them do it either way. Point your phone at the problem (a wall that needs paint, a leaking faucet) and the app works out what the job involves: materials, step-by-step instructions, how hard it is, how long it takes, and what it costs. It shows the same job done by a professional side by side, with an honest explanation of why pros cost more. If you go DIY, it gives you the shopping list and a full guide. If you go pro, it connects you with local help. The app earns money either way, so it has no reason to push people in one direction.

## 2. The problem

When something in the home needs fixing, people face the same questions every time:

- **Can I do this myself?** How hard is it really, and what happens if I get it wrong?
- **What will it take?** Which materials, how much of them, which tools, how many hours?
- **What would a pro charge, and is it worth it?**

Today the answers are scattered across videos, forum threads, store websites and contractor marketplaces. None of them answer the actual question, which is *"for this specific job, in my home, which option is better for me?"*

- **Tutorial videos** show how, but not whether you should, or what it'll cost you in time.
- **Contractor marketplaces** are built to sell pro services.
- **Retailer and paint brand apps** are built to sell products.

## 3. The product

### What a user gets for any job

| Piece | What it answers |
|---|---|
| **Photo diagnosis** | What is this job, how big is it, and what condition is it in? |
| **Difficulty rating** | How hard is this, and is it safe for me to do? |
| **Materials and tools list** | What exactly do I need to buy, and how much? |
| **Step-by-step guide** | How do I do it, phase by phase, with videos and a checkpoint before each next step? |
| **Time estimate** | How many hours of my time, and how many days start to finish? |
| **Cost estimate** | What does it cost me in materials vs. hiring a pro? |
| **Pro comparison** | What does a pro charge, how fast are they, and why do they cost more? |
| **Next step** | Buy the materials (DIY) or get quotes from local pros |

### Principles

1. **Informed decisions, not a sales pitch.** The app never steers people toward DIY or toward pros. It shows both honestly and lets the user choose. Wording is kept neutral (e.g. "a pro costs $X more and saves you Y hours", not "DIY saves you $X").
2. **Safety first.** Some jobs (gas, electrical panels, structural work, roofing at height, lead paint, asbestos) always get a clear recommendation to hire a licensed pro, no matter what the time or cost comparison says.
3. **Honest estimates.** Every number shows its assumptions, ranges are used instead of false precision, and the app says when it isn't sure (e.g. a low-confidence photo reading).
4. **Transparent money.** Users are told the app earns from product links and pro referrals. Because it earns from both paths, it has no reason to favor either.

## 4. Where it stands today: painting prototype

Painting is the first job type, chosen because it's common, low-risk and easy to measure. The goal is to make painting complete and polished before adding more jobs.

### Built so far

| Feature | Status |
|---|---|
| Photo analysis (AI reads wall size, color, doors/windows, condition) | Built, not yet tested with a live API key |
| Wall-by-wall measurements with a live square-footage total | Done |
| Color catalog: ~9,900 Sherwin-Williams, Benjamin Moore and Behr colors in a "fan deck" | Done (Benjamin Moore data has gaps) |
| Primer and coats recommendation based on color change and wall condition | Done |
| Shopping list in whole gallons, with leftover note | Done |
| Holes, cracks and gaps: close-up photo check (AI) or a hand-entered list. Each repair gets the right fix (caulk, spackle, mesh patch, tape, new drywall), a difficulty rating, materials, time and pro price | Done; photo check not yet tested with a live API key |
| Safety flags: water damage and wide or diagonal cracks get "have a pro look first" | Done |
| Sanding as a standard step: light sand before the wipe-down, and between every coat | Done |
| Time estimate in phases (Prep → Coatings → Cleanup) with checkpoints | Done |
| Cost estimate: DIY materials vs. pro labor + materials, with Dollars / Time toggle | Done |
| AI preview of the room in the new color | Built, Pro-only, not yet tested live |
| Pro access via access codes | Done (stand-in until real payments) |
| Interactive demo of a sample 10 × 10 bedroom | Done |

### Not built yet (painting)

- Neutral wording throughout the cost comparison
- "Why pros cost more" breakdown
- Difficulty rating for the whole job (each repair is already rated)
- Step-by-step guide with photos and video links
- Shopping list with product links (affiliate)
- "Get quotes from local painters" option
- User accounts, saved projects, payments
- Hosting on a public web address

## 5. How painting becomes a general DIY app

Every home repair has the same shape: diagnose → materials → phased steps with checkpoints → time and cost → DIY vs. pro. Painting was built so this shape can be reused.

Each new job becomes a **job type**, a description of:

- What to look for in the photo, and what follow-up questions to ask the user
- How to size the job (square feet for paint, number of fixtures for plumbing)
- Materials and tools, and how quantities are worked out
- The phases and steps, with time ranges and checkpoints
- Pro pricing (labor rates, minimum charges) and the reasons pros cost more for this trade
- Difficulty rating and safety rules (when to always recommend a pro)
- Video and guide links for each step

Adding a new job then means writing a new job type, not rebuilding the app.

### Likely next job types

Picked for being common, low-risk, and easy to diagnose from a photo:

1. Drywall patching (holes, cracks): basic patching and caulking is already built into painting prep, so this would expand it into a standalone job
2. Caulking (tubs, sinks, windows)
3. Leaky faucet (cartridge or washer replacement)
4. Running toilet (flapper or fill valve)
5. Replacing a light fixture or switch (with clear limits on electrical work)

## 6. How it makes money

DIWHYMAN earns on both paths a user can take, which is what lets it stay neutral.

| Revenue stream | How it works | When | Notes |
|---|---|---|---|
| **Material affiliate links** | Users who choose DIY buy materials and tools through links (Amazon, home improvement retailers). DIWHYMAN earns a commission on each sale. | First | Commission is a percentage of the order. Each program has its own rules on disclosure and on showing prices, so read them before building. |
| **Pro referrals** | Users who choose a pro request quotes through the app. DIWHYMAN earns per lead or per booked job from a contractor marketplace partner (e.g. Angi, Thumbtack) or, later, directly from local pros. | First | Partner programs avoid building a contractor network up front. A direct local-pro network can come later. |
| **Pro subscription** | Paid features: AI preview of the user's own room in a new color, saved projects, multi-room planning, ad-free guides. | Second | Already gated in the prototype with access codes. Needs accounts and payments (e.g. Stripe). |
| **Sponsored content and partnerships** | Paint and tool brands sponsor guides or featured products, clearly labeled. | Later | Must never affect the DIY-vs-pro advice. |
| **Pro tools** | A version for handymen and small contractors: quick job estimates and customer-facing quotes. | Later | Reuses the same estimate engine. |

### Running costs per user

- Photo analysis with AI: about 1–2 cents per photo
- AI room preview: roughly 4–20 cents per image, which is why it's Pro-only, with a daily limit per user
- Everything else (math, color catalog, guides) runs at almost no cost

### Assumptions to test

These numbers decide whether the business works, and none have been measured yet:

- What share of users choose DIY vs. pro for a given job
- How many DIY users click through and buy materials, and the average order size
- Lead value from pro referral partners for each trade
- How many users pay for Pro, and at what price
- How many users come back for a second job (the main growth driver once there are several job types)

## 7. Build path

### Phase 1: Finish painting (now)

- Neutral wording in the cost comparison, plus a "why pros cost more" breakdown
- Difficulty rating
- Step-by-step guide for each phase, with video links
- Shopping list with product links (placeholders until affiliate accounts are approved)
- "Get quotes from local painters" button
- First live test of photo analysis and the AI preview with real API keys

### Phase 2: Ready for real users

- Public hosting and a domain
- User accounts and saved projects
- Payments for Pro (replacing access codes)
- Sign up for affiliate and referral programs, and add the required disclosures
- Privacy policy and terms of use (photos of people's homes are personal data)
- Licensed or official color data from the paint brands before commercial launch
- Basic analytics for the assumptions in section 6

### Phase 3: Second job type

- Pull the painting logic into the general "job type" format from section 5
- Add drywall patching (pairs with painting), then one plumbing job
- Safety rules and "always hire a pro" triggers
- AI follow-up questions when a photo is ambiguous

### Phase 4: Full DIY platform

- Library of job types across painting, plumbing, electrical (safe tasks only), carpentry and outdoor
- Own video library
- Direct local-pro network
- Native phone apps
- Pro tools for contractors

## 8. Risks and how they're handled

| Risk | How it's handled |
|---|---|
| **Someone gets hurt or damages their home following the app** | Safety rules per job type, "always hire a pro" for dangerous work, clear warnings, and terms of use. Needs legal review before launch. |
| **AI misreads a photo** | Show confidence, ask follow-up questions, and always let the user check and correct measurements. |
| **Estimates are off** | Show ranges and assumptions. Let users adjust prices for their area. Tune rates with real-world data over time. |
| **Seen as biased toward DIY or pros** | Neutral wording, earning on both paths, and saying so openly. |
| **Brand color data and trademarks** | Prototype uses an open dataset. Get licensed data from the paint brands before commercial launch. |
| **Affiliate program rules** | Read each program's rules (disclosure, price display, app use) before building the shopping list. |
| **AI costs grow with usage** | Expensive features (image generation) are Pro-only with daily limits. |

## 9. What to measure

- **Decision split:** % of users who choose DIY vs. pro, per job type
- **Affiliate conversion:** clicks and purchases from the shopping list
- **Referral conversion:** quote requests and booked jobs
- **Pro conversion:** free to paid
- **Return rate:** users who start a second project
- **Estimate accuracy:** users' actual time and cost vs. the app's estimate (an optional follow-up after a job)

---

## Change log

| Date | Change |
|---|---|
| 2026-11-14 | First version: vision, current painting prototype, revenue streams, build path, risks. |
| 2026-11-15 | Added holes, cracks and gaps (photo check, fix advice, safety flags) and standard sanding steps to painting. |
