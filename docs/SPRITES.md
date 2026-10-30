# Sprite packs: what we've learned

The foundation for every new pack. The contract is `plugins/relay-panel/hooks/packs/types.ts`; the reference implementation is `packs/cats.ts`.

## The contract

- One file per pack in `hooks/packs/<id>.ts`, exporting a `Pack`: `id`, `name` (sentence case), `w`, `h`, `css`, `roles`, `variants`, `variantOf`, `draw`.
- `draw(x, y, { role, tier }, { variant, accent, dim, isWalking, scale, mirror })` returns one SVG string wrapped in `<g class="p-<id>">`.
- Registration is one import and one entry in `PACKS` in `index.ts`, plus the id in the `pack` option in `plugin.json`. `contract.test.ts` then tests the pack automatically.

## Canvas and anatomy

- 32×28 grid units, profile facing right, rendered as `<rect>`s with `shape-rendering="crispEdges"`. Crabs use 30×28. The panel fits any size: the band uses scale `min(0.75, 21/h)`, panel rows `min(1, 36/w, 32/h)`. Stay at or under 32×28 to keep the cats' spacing.
- The body sits 2 rows down (`DY = 2`), so tall hats fit above it.
- **Silhouette first.** Every filled pixel next to empty space becomes outline, in a darker shade of the sprite's own coat. The shape reads with no interior detail.
- Tones per coat: outline, shadow, base, highlight, plus small accents (nose, iris, inner ear, `ink` for props). Multi-tone coats add a second tone set and a pattern rule that says which pixels wear it (bicolour, van, point).
- **Pale coats need a grey outline**, or they vanish on light rows (white cat, samoyed, maltese).
- **The collar always carries the tier accent, in the same place.** It's the one thing that tells tiers apart in packs that dress by role.
- A lifted front paw (`hold`) is the anchor for held props (laptop, clipboard, brush, baton, tube, cutlass), so props line up across costumes.

## Costumes by role

Every role-dressed pack keeps the same costume meanings, so the panel reads the same whichever pack is active:

| Role | Costume (cats and dogs) |
|---|---|
| orchestrator | top hat and bow tie, conducting with a baton |
| planner | spectacles, clipboard |
| architect | flat cap, blueprint tube |
| developer | headphones, laptop |
| designer | beret, palette and brush |
| explore | pirate: bandana, eye patch, cutlass |
| other | plain, collar only |

Crabs dress by tier instead (expert astronaut, formerly fable; heavy detective, careful hard hat, medium chef, light racer). A pack picks one scheme; role is the default.

A themed pack may reinterpret each costume for its theme. It must keep the role readable at a glance: same kind of hat and same kind of held prop in the same place.

## Variants

- `variants` are coats, breeds or colours, and `variantOf(taskKey)` picks one with an FNV-1a hash. The same task always wears the same look, across redraws and sessions.
- 6-8 variants is the sweet spot: a crew of 5-10 workers looks varied and repeats are rare.

## Animation

- Pure CSS, running only on `.run` (a running worker). No redraws, so animation costs nothing between frames.
- Named groups: `bd` body, `la` / `lb` leg pairs, `tl` tail, plus one group per moving prop.
- Legs `steps(1)` over .5s, the two pairs half a cycle apart; body bob a quarter cycle off; tail swish 1.2s ease-in-out. Periods should divide 1s, because the running rows redraw once a second.
- Each costume adds one prop motion: the baton conducts, the brush dabs, the clipboard ticks, the laptop screen blinks.
- `transform-box: fill-box` on groups, so transform origins are relative to the group.
- `@media (prefers-reduced-motion: reduce)` turns all of it off.

## Isolation (several packs share one SVG in the gallery)

- Every CSS selector starts with `.p-<id> `, and every `@keyframes` name is prefixed `<id>-`. The contract test checks both.
- `dim` sets opacity .45 (planned tasks). `mirror` flips the sprite inside its own `w` box (right-to-left languages). `scale` defaults to 1.
- Cache the built rects per look (role + variant + accent). The panel redraws every second.

## Verification

- Tests: `claude plugin test plugins/relay-panel` (pack fields, every role draws, stable variants, scoped CSS).
- **Look at it.** Render a gallery of every variant × every role, walking, at 3-4×, on a light row *and* a dark row, and view it in the browser. Then check one row at panel scale (1×), where 1-pixel details disappear. Galleries live in `docs/preview/<id>.html`.
- Things that went wrong before: a page without `<meta charset="utf-8">` garbles `·` and `…`; white sprites with white outlines vanish on light rows.
