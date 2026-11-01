# Sprite packs: what we've learned

The foundation for every new pack. The contract is `plugins/relay-panel/hooks/packs/types.ts`; the reference implementation is `packs/cats.ts`.

## The contract

- One file per pack in `hooks/packs/<id>.ts`, exporting a `Pack`: `id`, `name` (sentence case), `w`, `h`, `css`, `roles`, `draw`.
- `draw(x, y, { role, tier }, { seed, accent, dim, isWalking, scale, mirror })` returns one SVG string wrapped in `<g class="p-<id>">`.
- Registration is one import and one entry in `PACKS` in `index.ts`, plus, for an everyday pack, the id in the `pack` option in `plugin.json`. `packs.test.ts` then tests the pack automatically.

## Canvas and anatomy

- Grid units, rendered as `<rect>`s with `shape-rendering="crispEdges"`. Cats, dogs and turkeys are 36 wide, in profile facing right; christmas is 32×28, winter 36×30, adventurers 32×30 (the last two face front) and clawd 30×28. The panel fits any size: the band uses scale `min(0.75, 21/h)`, panel rows `min(1, 36/w, 32/h)`, so sprites up to 36×32 draw at full size and larger ones shrink.
- The body sits 2 rows down (`DY = 2`), so tall hats fit above it.
- **Silhouette first.** Every filled pixel next to empty space becomes outline, in a darker shade of the sprite's own coat. The shape reads with no interior detail.
- Tones per coat: outline, shadow, base, highlight, plus small accents (nose, iris, inner ear, `ink` for props). Multi-tone coats add a second tone set and a pattern rule that says which pixels wear it (bicolour, van, point).
- **Pale coats need a grey outline**, or they vanish on light rows (white cat, bichon frise, white holland turkey).
- **The tier accent tints the costume's main piece** (hat, headphone cups, bandana) **and the collar, in the same place.** It's what tells tiers apart in packs that dress by role.
- A lifted front paw (`hold`) is the anchor for held props (laptop, baton, mallet, test tube, flashlight), so props line up across costumes.

## Costumes by role

Every role-dressed pack keeps the same costume meanings, so the panel reads the same whichever pack is active:

| Role | Who wears it | Costume (cats) |
|---|---|---|
| conductor | the main session | top hat and bow tie, conducting with a baton |
| builder | features and changes | headphones, laptop |
| fixer | debugging, root cause | flat cap, peppermint mallet |
| tester | builds, tests, checks | spectacles, test tube |
| scout | searching code; the Explore agent | pirate: bandana, eye patch, flashlight |
| plain | any non-relay subagent | plain, collar only |

The orchestrator sets the role per planned task (`role` in `mcp__relay-panel__progress`); nothing is guessed from task text.

The role picks the character, or the costume, breed or colour; the tier only tints one piece. Clawd wears one costume per role (astronaut, engineer, detective, racer, pirate, bare). Winter and adventurers use a different animal or hero per role and hold no shared props.

A themed pack may reinterpret each costume for its theme. It must keep the role readable at a glance: same kind of hat and same kind of held prop in the same place.

## Seed

- There are no pack-level variants. `seed` is a uint32 the panel assigns the first time it sees a task: the next number from a per-role counter that starts at a random uint32 each session, remembered for the session. Same-role tasks on screen together get consecutive seeds (so different looks until the pack runs out), existing tasks never change, and the start is random across sessions.
- A character that varies (the Christmas gingerbread's dough, the elf's tunic, the reindeer's coat) picks its look with `seed % n`. Every other character ignores the seed.

## Animation

- Pure CSS, running only on `.run` (a running worker). No redraws, so animation costs nothing between frames.
- Named groups: `bd` body, `la` / `lb` leg pairs, `tl` tail, plus one group per moving prop.
- Move parts by whole pixels. A smooth `rotate` on a pixel part leaves the grid and tears it from the body (the cats' tail did); swap between drawn poses with `steps(1)` instead, and keep attached parts inside `bd` so they share its bob. Never nest a second `bd`: it bobs twice.
- Legs `steps(1)` over .5s, the two pairs half a cycle apart; body bob a quarter cycle off; tail swish 1.2s ease-in-out. Periods should divide 1s, because the running rows redraw once a second.
- Each costume adds one prop motion: the baton conducts, the laptop screen blinks, the held tool moves.
- `transform-box: fill-box` on groups, so transform origins are relative to the group.
- `@media (prefers-reduced-motion: reduce)` turns all of it off.

## Isolation (several packs share one SVG in the gallery)

- Every CSS selector starts with `.p-<id> `, and every `@keyframes` name is prefixed `<id>-`. `packs.test.ts` checks both.
- `dim` sets opacity .45 (planned tasks). `mirror` flips the sprite inside its own `w` box (right-to-left languages). `scale` defaults to 1.
- Cache the built rects per look (role + seed look + accent). The panel redraws every second.
- **Panes cap at 100,000 characters** and draw nothing, silently, past it. `register.tsx` runs every pane's sprites through `packs/compact.ts` (rect runs become one `<path>` per fill), which took the gallery from ~335,000 to ~78,000 for all seven packs (sprites only, before card text). Packs keep emitting plain `<rect x y width height fill>`. A new pack should stay under about 12,000 compacted characters for its six walking sprites; a much bigger one may need trimming.

## Verification

- Tests: `claude plugin test plugins/relay-panel` (`packs.test.ts` runs over every pack: fields, every role draws, scoped CSS).
- **Look at it.** Render a gallery of every role (and every seeded look), walking, at 3-4×, on a light row *and* a dark row, and view it in the browser. Then check one row at panel scale (1×), where 1-pixel details disappear. `bun scripts/preview.ts` writes the galleries to `docs/preview/<id>.html` (not committed).
- Things that went wrong before: a page without `<meta charset="utf-8">` garbles `·` and `…`; white sprites with white outlines vanish on light rows.
