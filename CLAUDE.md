# DIWHYMAN project notes

DIWHYMAN is a DIY home-repair app. Painting is the first job type; the long-term plan is a general DIY app. See `docs/VISION.md` for the vision, revenue streams and build path, and `README.md` for how to run the code.

## Keep the vision document current

`docs/VISION.md` is a living document for builders and investors. Whenever a change affects it, update it in the same commit:

- A feature gets built or changes: update the "Built so far" / "Not built yet" tables in section 4, and the build path in section 7.
- A decision is made about the product, pricing, revenue or partners: update the relevant section.
- Always bump the "Last updated" date and add a row to the change log at the end.

## Product principles to follow when building

- Keep DIY-vs-pro wording neutral. Show both options honestly and never steer users toward either.
- Show estimates as ranges with their assumptions, and say when the app isn't sure.
- Dangerous work (gas, electrical panels, structural, roofing at height, lead paint, asbestos) always gets a clear "hire a licensed pro" recommendation.

## Code conventions

- Paint math, time and cost estimates live in `shared/` and run in both the browser and the server. Keep them free of imports.
- Run `npm test` before committing.
