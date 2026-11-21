# DIWHYMAN: Product Vision and Build Plan

_Living document. Last updated: 2026-11-21._

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
| Experience asked per task (e.g. painting, drywall patching), with hands-on times tuned to each answer | Done |
| Task catalog with difficulty ratings across 6 categories (see section 5) | Done; only painting and drywall patching are live |
| Cost estimate: DIY materials vs. pro labor + materials, with Dollars / Time toggle | Done |
| AI preview of the finished room: damage repaired and walls repainted in the new color | Done, Pro-only. Tested live with OpenAI (`gpt-image-2`): about 11 seconds per image |
| Pro access via access codes | Done (stand-in until real payments) |
| Interactive demo of a sample 10 × 10 bedroom | Done |

### Not built yet (painting)

- Neutral wording throughout the cost comparison
- "Why pros cost more" breakdown
- Edge choices: cut in freehand vs. tape, per type of edge, with defaults based on the user's painting experience
- "Watch how" video slots on individual steps (see "Learning and videos" in section 5)
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

### Task catalog, difficulty and experience

The app keeps a catalog of DIY tasks (`shared/tasks.js`) grouped into categories: Painting & walls, Plumbing, Electrical, Carpentry & doors, Flooring and Outdoor. Each task has:

- **A difficulty rating** from 1 (Easy) to 5 (Pro recommended), based on four factors rated 1–5: skill needed, physical effort, cost of a mistake, and special tools.
- **Permit likelihood:** no, sometimes, or usually (rules vary by city).
- **Safety level:** none, "caution" (doable with care, with a specific warning), or "always hire a pro" (gas, electrical panels, roofing and similar).
- **Its own experience question**, e.g. "How much toilet installation have you done?"

**Experience is asked per task, never once for the whole app.** Someone confident at painting may never have replaced a toilet, and replacing a faucet is a very different job from fixing a running toilet. A single project can involve more than one task. A paint job with a doorknob hole asks about painting and about drywall patching, and each task's hours follow its own answer: confident users see the lower part of the range, new users the upper part. Drying time and the pro comparison don't change with experience, and safety warnings always show, whatever level someone picks.

Difficulty ratings are a first pass based on common DIY guidance and should be checked with working tradespeople before launch.

| Category | Example tasks (difficulty) |
|---|---|
| Painting & walls | Interior painting (2), drywall patching (2), wallpaper removal (2) |
| Plumbing | Running toilet (1), leaky faucet (2), replace a faucet (3), replace a toilet (3), water heater (5, always pro) |
| Electrical | Outlet or switch (3, caution), light fixture (3, caution), new circuit or panel (5, always pro) |
| Carpentry & doors | Door hardware (1), hang a door (3), baseboards (3) |
| Flooring | Regrout tile (2), click-lock flooring (3) |
| Outdoor | Deck staining (2), gutters (2, caution), roof repair (5, always pro) |

### Likely next job types

Picked for being common, low-risk, and easy to diagnose from a photo:

1. Drywall patching (holes, cracks): basic patching and caulking is already built into painting prep, so this would expand it into a standalone job
2. Caulking (tubs, sinks, windows)
3. Leaky faucet (cartridge or washer replacement)
4. Running toilet (flapper or fill valve)
5. Replacing a light fixture or switch (with clear limits on electrical work)

### Learning and videos

Videos are placed where people need them, not in a wall of links:

- **"Watch how" chips** on specific steps in the Prep → Coatings → Cleanup checklist (e.g. "Cut in edges", "Pull tape while slightly tacky", "Patch a medium hole"). A tap opens a panel with the video, three key points in text, and the tools shown (where affiliate links fit naturally). Nothing autoplays.
- **Side-by-side method comparisons** where there's more than one good way, starting with cutting in freehand vs. taping: time, cost, look, risks and who each suits, with a video for each.
- **A "Learn" library** later, grouping every video by job and phase.

Where the videos come from, in order:

1. Curated public videos from established DIY and pro-painter channels, credited to the creator and started at the relevant moment.
2. Partnerships with a few creators: they get traffic, the app gets consistent quality, and the tools shown can share affiliate links.
3. DIWHYMAN's own short, consistent clips, one per step.

## 6. How it makes money

DIWHYMAN earns on both paths a user can take, which is what lets it stay neutral.

| Revenue stream | How it works | When | Notes |
|---|---|---|---|
| **Material affiliate links** | Users who choose DIY buy materials and tools through links (Amazon, home improvement retailers). DIWHYMAN earns a commission on each sale. | First | Commission is a percentage of the order. Each program has its own rules on disclosure and on showing prices, so read them before building. |
| **Pro referrals** | Users who choose a pro request quotes through the app. DIWHYMAN earns per lead or per booked job from a contractor marketplace partner (e.g. Angi, Thumbtack) or, later, directly from local pros. | First | Partner programs avoid building a contractor network up front. A direct local-pro network can come later. |
| **Pro subscription** | Paid features: AI preview of the user's own room finished (repaired and repainted in the new color), saved projects, multi-room planning, ad-free guides. | Second | Already gated in the prototype with access codes. Needs accounts and payments (e.g. Stripe). |
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

- First live test of the photo checks (room photo and holes/cracks) with an Anthropic API key. The AI preview has already passed its live tests.
- Edge choices (cut in vs. tape) with experience-based defaults, plus the first "Watch how" video slots
- Neutral wording in the cost comparison, plus a "why pros cost more" breakdown
- Step-by-step guide for each phase, with video links
- Shopping list with product links (placeholders until affiliate accounts are approved)
- "Get quotes from local painters" button
- Small open items: see "Open questions" in section 10

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

## 10. Product decisions so far

Decisions made while building the painting prototype, so they aren't reopened by accident:

| Decision | Why |
|---|---|
| Experience is asked **per task** (painting, drywall patching, and later each plumbing or electrical job), with three levels: New to this, Some experience, Confident | Skill doesn't carry across trades. Each task's hands-on hours narrow to match its answer; drying time, pro time and safety warnings never change. |
| Time estimates are **shown in whole hours** ("1–3 hrs", "Under 1 hr"), with a note that experience moves you within the range | Fractions looked messy. The math underneath stays exact. |
| Paint and primer are **rounded up to whole gallons**, with a note on how much will be left over | Paint is almost always bought by the gallon. |
| Costs use a **Dollars / Time toggle**: DIY materials vs. pro price, or your hours vs. the pro crew's hours | One measure at a time is easier to read. The time view shows roughly how much money each hour of DIY work saves. |
| **Sanding is standard:** a light sand before the wipe-down, and between every coat | Pro practice for a better finish. |
| Repairs pick the **right fix per problem**: caulk for gaps along trim and corner cracks, spackle for nail holes, mesh patch for medium holes, tape for wall cracks, new drywall for large holes | Each needs different materials and time. |
| **Water damage and wide or diagonal cracks** always get "have a pro look first" | Safety principle: they can mean a leak or the house moving. |
| The AI preview is **one image of the finished room**: damage repaired, then painted | It shows what following the plan achieves. One image keeps the cost down. |
| The AI preview is **Pro-only**, with a daily limit per user, and the server checks access before any paid call | Image generation costs money per image. |
| Most painters **cut in freehand** and tape only where it's worth it; the app should recommend per edge rather than tape everything | Matches real practice. Not built yet. |

### Open questions

- Spot-priming a few patches currently shows "1 gallon of primer." Allow quarts just for spot primer?
- Add a short note under the finished-room preview when the repairs include water damage or wide cracks, so the clean picture doesn't hide that a pro should look first?
- The DIY-vs-pro wording still leans DIY in places ("Doing it yourself saves…"). Rework it to the neutral form in principle 1.
- Check the difficulty ratings and time rates with working tradespeople.

---

## Change log

| Date | Change |
|---|---|
| 2026-11-14 | First version: vision, current painting prototype, revenue streams, build path, risks. |
| 2026-11-15 | Added holes, cracks and gaps (photo check, fix advice, safety flags) and standard sanding steps to painting. |
| 2026-11-15 | Added the task catalog with difficulty ratings, and experience asked per task with times tuned to each answer. |
| 2026-11-15 | OpenAI connected; the AI room preview passed its first live test. |
| 2026-11-21 | The AI preview now shows the finished room (holes, cracks and gaps repaired, then painted), tested on a realistic AI-generated room with damage. |
| 2026-11-21 | Added "Product decisions so far" and "Open questions" (section 10), the learning and videos plan, and the updated Phase 1 list. Demo source and test photos moved into the repository. |
