# DIWHYMAN Paint Planner

DIWHYMAN is starting with painting on the way to a full DIY home-repair app. For the product vision, revenue streams and build path, see [docs/VISION.md](docs/VISION.md).

Snap a photo of a room and get a paint plan:

- **Measurements.** Length of each wall plus wall height, with a live square-footage total. Has a quick "length × width" option for rectangular rooms, and doors and windows are subtracted automatically.
- **Color fan.** About 9,900 colors from Sherwin-Williams, Benjamin Moore and Behr, laid out like a paper fan deck by color family. You can also search by name or code (e.g. "Alabaster" or "SW 7008").
- **Holes, cracks and gaps.** Add close-up photos (or a list by hand) and each spot gets the right fix: caulk for gaps along trim and corner cracks, spackle for nail holes, a mesh patch for medium holes, tape for wall cracks. Water damage and wide or diagonal cracks get a "have a pro look first" warning. Repairs flow into the materials, hours and costs.
- **Experience per task.** "How much interior painting have you done?" (and drywall patching, when the repairs need it). Hands-on hours narrow to match each answer.
- **Difficulty rating.** Each job shows its difficulty, from a task catalog in `shared/tasks.js` that also covers planned plumbing, electrical, carpentry, flooring and outdoor tasks.
- **Sanding built in.** A light sand of all walls before the wipe-down, and a light sand between every coat.
- **Primer and coats.** Based on the color change and the wall's condition (stains, patches, bare drywall, glossy paint…).
- **Shopping list.** Paint and primer rounded up to whole gallons, with a note on how much will be left over.
- **Time estimate.** Hours broken into gated phases (Prep → Coatings → Cleanup), each with its tasks, drying waits and a "ready when" checkpoint before the next phase. Also a total ("A weekend") and a pro-crew comparison.
- **Cost estimate.** Do-it-yourself materials vs. hiring a pro (labor + materials), with prices and region you can adjust.
- **Finished-room preview (Pro).** An AI-generated picture of your room finished: holes, cracks and gaps repaired, and the walls repainted in the new color. Each image costs money, so it's locked behind Pro.

## How it works

| Step | What does it | Needs an API key? |
|---|---|---|
| Read the photo: wall color, wall lengths, doors/windows, surface problems | Claude (Anthropic) | Yes: `ANTHROPIC_API_KEY` |
| Area, primer, coats, gallons, hours, costs | Plain math in `shared/` (runs in the browser, so totals update as you type) | No |
| Color catalog and fan | Static files in `public/colors/` | No |
| Show the room in the new color (Pro only) | OpenAI image editing | Yes: `OPENAI_API_KEY` |

The AI's measurements are a starting point. A photo has no built-in sense of scale, so the app shows the numbers for the user to check. Entering one real measurement, like the ceiling height, makes them much more accurate. You can also skip the photo and type the measurements in yourself. Everything except the photo analysis and the preview works without API keys.

## Pro access (the color preview)

The AI preview only appears when the server has an `OPENAI_API_KEY`. Even then it's locked until the user enters a **Pro code**. Codes are listed in `.env`:

```
PRO_ACCESS_CODES=FRIEND-2026,BETA-TESTER
PRO_DAILY_PREVIEW_LIMIT=20
```

- The server checks the code **before** reading the photo, so a free user can never trigger a paid image.
- Each code is limited to `PRO_DAILY_PREVIEW_LIMIT` previews a day. Previews that fail don't count.
- This is a stand-in for real accounts and payments (e.g. a Stripe subscription). When those are added, only `isPro()` in `lib/proAccess.js` needs to change.

## Color catalog

The colors come from the open-source [colornerd](https://github.com/jpederson/colornerd) dataset (MIT license). To rebuild the files in `public/colors/` with the latest data:

```bash
node scripts/build-colors.mjs
```

Things to know:
- **On-screen colors are approximate.** Screens vary, so users should always check a real sample.
- **Benjamin Moore data has gaps.** Some names are shortened ("Hale" instead of "Hale Navy"), and much of the Off-White Collection (e.g. White Dove, Chantilly Lace) is missing. The app tells users this.
- **Before launching commercially,** check with the paint brands about using their color names and codes. Sherwin-Williams and Benjamin Moore both have partner programs that offer official, complete color data. That's the reliable long-term source, and better than scraping their websites (which their terms of use generally forbid).

## Cost estimates

Defaults live in `shared/costs.js` and are ballpark U.S. figures. Change them there to match your market:

- Paint per gallon: Sherwin-Williams and Benjamin Moore $80, Behr $45, other $50 (typical full retail; users can edit it)
- Primer: $35/gal
- Pro labor: $1.50–$3.50 per sq ft of wall (2 coats), $2–$4 for ceilings, plus primer and prep, with a $250–$400 minimum job
- "Your area" scales labor by 0.8× (lower cost), 1× (average) or 1.3× (higher cost)
- A **Dollars / Time** toggle switches the DIY and pro cards between cost and time. Time view shows your hands-on hours vs. the pro crew's hours on site and how soon it's done, plus roughly how much money each hour of your own work saves (`compareDiyVsPro` in `shared/costs.js`).

## Time estimates

Working speeds live in `shared/hours.js` (`HOUR_RATES`) and assume one first-time painter:

- Rolling walls, including cutting in edges: 130–200 sq ft per hour per coat (ceilings 80–120)
- Taping: 80–150 ft per hour, along the floor and ceiling lines plus around each door and window
- Sanding: 300–500 sq ft per hour before painting, 350–600 between coats
- Spot repairs: per-repair times and drying in `shared/repairs.js` (e.g. a nail hole is a few minutes, a medium patch 45–90 minutes plus 3–6 hours of drying)
- Repairs, sanding and wallpaper stripping are added only when that wall condition is checked
- Drying: 2–4 hrs between coats, 1–3 hrs for primer, 1–2 hrs for spackle
- A 2-person pro crew does the hands-on work in roughly 25–35% of the DIY time
- Times are calculated exactly but shown in whole hours ("1–3 hrs", "Under 1 hr"), with a note that experienced painters will land at the low end and first-timers at the high end

## Project layout

```
server.js               Web server and API endpoints
shared/paintCalc.js     Paint math: area, primer, coats, gallons (used by browser and server)
shared/costs.js         DIY and professional cost estimates (used by browser and server)
shared/hours.js         Time estimate by phase: Prep, Coatings, Cleanup
shared/repairs.js       Holes, cracks and gaps: fix, materials, time and pro price per repair
shared/tasks.js         Task catalog: categories, difficulty ratings, safety levels, experience questions
lib/analyzePhoto.js     Sends the photo to Claude and gets structured room details back
lib/analyzeImperfections.js  Sends close-ups of damage to Claude and gets a list of repairs back
lib/previewColor.js     Asks the image model to repaint the walls
lib/proAccess.js        Pro codes and the daily preview limit
public/                 The phone-friendly page (HTML, CSS, JavaScript)
public/colors/          Paint color catalog, one file per brand
scripts/build-colors.mjs  Rebuilds the color catalog
scripts/build-demo.mjs    Builds the standalone interactive demo from demo/template.html
demo/                   Source of the interactive 10 × 10 bedroom demo
test/fixtures/          Test photos (a damaged bedroom, and its AI finished-room preview)
test/                   Automated tests
```

## Running it on your computer

1. Install [Node.js](https://nodejs.org) version 20 or newer.
2. In this folder, install the libraries:
   ```bash
   npm install
   ```
3. Copy the settings file and add your keys:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and paste in your keys. Get them here:
   - Anthropic: https://console.anthropic.com → API Keys
   - OpenAI: https://platform.openai.com/api-keys

   `.env` is listed in `.gitignore`, so your keys never get uploaded to GitHub.
4. Start the app:
   ```bash
   npm start
   ```
5. Open http://localhost:3000 in your browser.

To try it on your phone, connect it to the same Wi-Fi and open `http://<your-computer's-IP>:3000`. The camera button works best once the app is hosted on a real `https://` address.

## Tests

```bash
npm test
```

## Running costs

Each photo analysis costs about a cent or two with Claude. Each color preview costs roughly 4–20 cents, depending on the image model and quality. Both services bill you directly through your own accounts. Previews only run for Pro codes, up to the daily limit.

## Ideas for next steps

- Real accounts and payments for Pro (e.g. Stripe), replacing access codes
- Match the photo's current wall color to the nearest catalog color
- Multiple photos per room, to cover all four walls
- Trim paint as its own line item
- Host it online so friends can use it from their phones
