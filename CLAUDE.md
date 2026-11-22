# DIWHYMAN project notes

DIWHYMAN is a DIY home-repair app. Painting is the first job type; the long-term plan is a general DIY app. See `docs/VISION.md` for the vision, revenue streams, build path, **product decisions so far and open questions (section 10)**, and `README.md` for how to run the code.

## Keep the vision document current

`docs/VISION.md` is a living document for builders and investors. Whenever a change affects it, update it in the same commit:

- A feature gets built or changes: update the "Built so far" / "Not built yet" tables in section 4, and the build path in section 7.
- A decision is made about the product, pricing, revenue or partners: add it to section 10 (or the relevant section), and remove it from "Open questions" if it settles one.
- Always bump the "Last updated" date and add a row to the change log at the end.

## Product principles to follow when building

- Keep DIY-vs-pro wording neutral. Show both options honestly and never steer users toward either.
- Show estimates as ranges with their assumptions, and say when the app isn't sure.
- Dangerous work (gas, electrical panels, structural, roofing at height, lead paint, asbestos) always gets a clear "hire a licensed pro" recommendation.
- Ask experience per task, never once for the whole app. Experience changes hands-on hours only, never safety warnings.

## Code layout and conventions

- `shared/` holds the paint math, costs, hours, repairs and task catalog. It runs in both the browser and the server, so keep each file free of imports.
- `lib/` holds the server-only AI calls: Claude for photo analysis (`analyzePhoto.js`, `analyzeImperfections.js`), OpenAI for the finished-room preview (`previewColor.js`), and Pro access codes (`proAccess.js`).
- Run `npm test` before committing.

## Interactive demo

- Source: `demo/template.html`. Build with `node scripts/build-demo.mjs`, which inlines `shared/` and writes `demo/dist/` (not committed).
- Published at https://claude.ai/artifact/NE5aQgt6aTqy5dXEStNDhk. To update it, publish `demo/dist/bedroom-demo.html` to that URL with `demo/dist/colors/*.json` as files at `colors/...`.
- When a change to `shared/` or the app's screens affects what the demo shows, update `demo/template.html` too, rebuild and republish.

## Cloud workspace notes

- Sessions run on the personal "DIWHYMAN" cloud environment. Its setup script runs `npm install`.
- The OpenAI key is saved on that environment as a network secret: the proxy adds it to requests to api.openai.com. Set `OPENAI_API_KEY=proxy-injected` (a placeholder) when running code that needs the variable.
- Node doesn't use the HTTPS proxy by default. Run the server and scripts that call outside APIs with `NODE_USE_ENV_PROXY=1`, e.g.:
  `NODE_USE_ENV_PROXY=1 OPENAI_API_KEY=proxy-injected PRO_ACCESS_CODES=TEST-PRO node server.js`
- No Anthropic API key is set up yet, so the photo checks haven't run live. `test/fixtures/bedroom-damaged.jpg` is a realistic test room with a doorknob hole, nail holes, a crack above the window and a baseboard gap, ready for that first test.
