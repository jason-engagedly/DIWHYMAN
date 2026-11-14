# DIWHYMAN Paint Planner

Snap a photo of a room and get a paint plan:

- **Square footage.** Wall area minus doors and windows, plus the ceiling if you want it.
- **Primer or not.** Based on the color change and the wall's condition (stains, patches, bare drywall, glossy paint…).
- **How many coats.** Usually 2. It can be 1 for a near-identical color, and 3 for bright reds and yellows.
- **Shopping list.** Rounded to cans you can actually buy (quarts, gallons, 5-gallon buckets).
- **Color preview.** An AI-generated picture of your room in the new color.

## How it works

| Step | What does it | Needs an API key? |
|---|---|---|
| Read the photo: wall color, doors/windows, rough size, surface problems | Claude (Anthropic) | Yes: `ANTHROPIC_API_KEY` |
| Work out area, primer, coats and gallons | Plain math in `lib/paintCalc.js` | No |
| Show the room in the new color | OpenAI image editing | Yes: `OPENAI_API_KEY` |

The AI's measurements are a starting point. A photo has no built-in sense of scale, so the app shows the numbers for the user to check. Entering one real measurement, like the ceiling height, makes them much more accurate. You can also skip the photo analysis and type the measurements in yourself. That part works without any API keys.

## Project layout

```
server.js            Web server and the 3 API endpoints (/api/analyze, /api/plan, /api/preview)
lib/paintCalc.js     Paint math: area, primer, coats, gallons (no AI)
lib/analyzePhoto.js  Sends the photo to Claude and gets structured room details back
lib/previewColor.js  Asks the image model to repaint the walls
public/              The phone-friendly page (HTML, CSS, JavaScript)
test/                Automated tests for the paint math
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

## Cost

Each photo analysis costs about a cent or two with Claude. Each color preview costs roughly 4–20 cents, depending on the image model and quality. Both services bill you directly through your own accounts.

## Ideas for next steps

- Paint brand color matching (e.g. look up the nearest Sherwin-Williams or Behr color)
- Multiple photos per room, to cover all four walls
- Price estimate using local store prices
- Trim and ceiling paint as separate line items
- Host it online so friends can use it from their phones
