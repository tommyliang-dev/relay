# Sprite packs: what we've learned

The foundation for every new pack. The contract is `plugins/relay-panel/hooks/packs/types.ts`; the reference implementation is `packs/cats.ts`.

## The contract

- One file per pack in `hooks/packs/<id>.ts`, exporting a `Pack`: `id`, `name` (sentence case), `w`, `h`, `css`, `roles`, `variants`, `variantOf`, `draw`.
- `draw(x, y, { role, tier }, { variant, accent, dim, isWalking, scale, mirror })` returns one SVG string wrapped in `<g class="p-<id>">`.
- Registration is one import and one entry in `PACKS` in `index.ts`, plus the id in the `pack` option in `plugin.json`. `contract.test.ts` then tests the pack automatically.

## Canvas and anatomy

- 32×28 grid units, profile facing right, rendered as `<rect>`s with `shape-rendering="crispEdges"`. Clawd uses 30×28. The panel fits any size: the band uses scale `min(0.75, 21/h)`, panel rows `min(1, 36/w, 32/h)`. Stay at or under 32×28 to keep the cats' spacing.
- The body sits 2 rows down (`DY = 2`), so tall hats fit above it.
- **Silhouette first.** Every filled pixel next to empty space becomes outline, in a darker shade of the sprite's own coat. The shape reads with no interior detail.
- Tones per coat: outline, shadow, base, highlight, plus small accents (nose, iris, inner ear, `ink` for props). Multi-tone coats add a second tone set and a pattern rule that says which pixels wear it (bicolour, van, point).
- **Pale coats need a grey outline**, or they vanish on light rows (white cat, samoyed, maltese).
- **The tier accent tints the costume's main piece** (hat, headphone cups, clipboard, bandana) **and the collar, in the same place.** It's what tells tiers apart in packs that dress by role.
- A lifted front paw (`hold`) is the anchor for held props (laptop, clipboard, brush, baton, tube, cutlass), so props line up across costumes.

## Costumes by role

Every role-dressed pack keeps the same costume meanings, so the panel reads the same whichever pack is active:

| Role | Who wears it | Costume (cats) |
|---|---|---|
| conductor | the main session | top hat and bow tie, conducting with a baton |
| builder | features and changes | headphones, laptop |
| fixer | debugging, root cause | flat cap, wrench |
| tester | builds, tests, checks | spectacles, clipboard |
| scout | searching code; the Explore agent | pirate: bandana, eye patch, spyglass |
| plain | any non-relay subagent | plain, collar only |

The orchestrator sets the role per planned task (`role` in `mcp__relay-panel__progress`); nothing is guessed from task text.

Clawd dresses by tier instead (expert astronaut, formerly fable; heavy detective, careful hard hat, medium chef, light racer). A pack picks one scheme; role is the default.

A themed pack may reinterpret each costume for its theme. It must keep the role readable at a glance: same kind of hat and same kind of held prop in the same place.

## Variants

- `variants` are coats, breeds or colours, and `variantOf(taskKey)` picks one with an FNV-1a hash. The same task always wears the same look, across redraws and sessions.
- 6-8 variants is the sweet spot: a crew of 5-10 workers looks varied and repeats are rare.

## Animation

- Pure CSS, running only on `.run` (a running worker). No redraws, so animation costs nothing between frames.
- Named groups: `bd` body, `la` / `lb` leg pairs, `tl` tail, plus one group per moving prop.
- Move parts by whole pixels. A smooth `rotate` on a pixel part leaves the grid and tears it from the body (the cats' tail did); swap between drawn poses with `steps(1)` instead, and keep attached parts inside `bd` so they share its bob. Never nest a second `bd`: it bobs twice.
- Legs `steps(1)` over .5s, the two pairs half a cycle apart; body bob a quarter cycle off; tail swish 1.2s ease-in-out. Periods should divide 1s, because the running rows redraw once a second.
- Each costume adds one prop motion: the baton conducts, the brush dabs, the clipboard ticks, the laptop screen blinks.
- `transform-box: fill-box` on groups, so transform origins are relative to the group.
- `@media (prefers-reduced-motion: reduce)` turns all of it off.

## Isolation (several packs share one SVG in the gallery)

- Every CSS selector starts with `.p-<id> `, and every `@keyframes` name is prefixed `<id>-`. The contract test checks both.
- `dim` sets opacity .45 (planned tasks). `mirror` flips the sprite inside its own `w` box (right-to-left languages). `scale` defaults to 1.
- Cache the built rects per look (role + variant + accent). The panel redraws every second.
- **Panes cap at 100,000 characters** and draw nothing, silently, past it. `register.tsx` runs every pane's sprites through `packs/compact.ts` (rect runs become one `<path>` per fill), which took the gallery from ~335,000 to ~90,000. Packs keep emitting plain `<rect x y width height fill>`; the gallery test fails if the total gets near the cap, so a new pack that is much bigger than the others may need trimming.

## Verification

- Tests: `claude plugin test plugins/relay-panel` (pack fields, every role draws, stable variants, scoped CSS).
- **Look at it.** Render a gallery of every variant × every role, walking, at 3-4×, on a light row *and* a dark row, and view it in the browser. Then check one row at panel scale (1×), where 1-pixel details disappear. `bun scripts/preview.ts` writes the galleries to `docs/preview/<id>.html` (not committed).
- Things that went wrong before: a page without `<meta charset="utf-8">` garbles `·` and `…`; white sprites with white outlines vanish on light rows.
