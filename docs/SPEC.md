# relay: spec

Describes relay 0.4.0 and relay-panel 0.5.0.

## Goal

A personally owned copy of johnnyvizz's `savvy-flow` orchestration skill and `savvy-progress` agents-panel mod, renamed **relay**, that installs from this repo as a marketplace next to the stock plugins without clashing. The panel ships several sprite packs and a skill (plus a slash command) swaps the active one.

Delegation is the product; the sprites are the garnish.

## Plugins

The repo is a marketplace named `relay` with two plugins.

| Plugin | What it is | Source it copies |
|---|---|---|
| `relay` | Orchestrator skill + five tiered worker agents | `claude-kit/savvy-flow` 1.2.0, plus the auto-invoking wording of `~/.claude/skills/savvy-flow-auto` |
| `relay-panel` | Progress bar above the prompt + agents panel + sprite packs | The dev-mods fork of `savvy-progress` 1.2.1 (cats), with the stock crab restored as the `clawd` pack |

### Names (all distinct from the stock plugins)

| Thing | Stock | relay |
|---|---|---|
| Skill | `/savvy-flow` (manual only) | `/relay` (model-invocable, auto description from `savvy-flow-auto`) |
| Workers | `savvy-light` … `savvy-fable` | `relay-light`, `relay-medium`, `relay-careful`, `relay-heavy`, `relay-expert` (formerly `relay-fable`; agent type `relay:relay-light` etc.) |
| Tools | `mcp__savvy-progress__progress`, `__step` | `mcp__relay-panel__progress`, `mcp__relay-panel__step`, `mcp__relay-panel__pack` |
| Panel command | `/agents-info` | `/relay-agents` (`open` argument kept) |
| Pack command | none | `/relay-pack` |
| Pane id / state plugin key | `savvy-agents` / `savvy-progress` | `relay-agents` / `relay-panel` |
| Settings key | `pluginConfigs.savvy-progress` | `pluginConfigs.relay-panel` |

The panel recognises **only** `relay-*` workers as tiered (so it does not fight the stock panel over `savvy-*` runs). Every other subagent shows as `other`.

Behaviour otherwise matches the fork: languages (en, ru, he with RTL), `autoOpen`, cost table, step reporting, the brief line appended to workers, sentence case.

The names never clash with the stock plugins, but both panels would draw a band, so only one should be enabled. The README's "Using it next to savvy" has the commands.

## Sprite packs

### Pack interface

Each pack is one module under `plugins/relay-panel/hooks/packs/<id>.ts` exporting a `Pack`:

```ts
export type Role = 'conductor' | 'builder' | 'fixer' | 'tester' | 'scout' | 'plain'
export type Tier = 'expert' | 'heavy' | 'careful' | 'medium' | 'light' | 'other' // expert: formerly fable

export type DrawOptions = {
  seed: number        // uint32; next of a per-role counter (random start per session), fixed per task
  accent: string      // tier colour
  dim?: boolean       // planned task
  isWalking?: boolean // running: CSS animation on
  scale?: number      // default 1
  mirror?: boolean    // RTL
}

export type Pack = {
  id: string                    // 'cats'
  name: string                  // 'British Shorthair cats' (sentence case)
  w: number; h: number          // drawing grid in px at scale 1
  css: string                   // one <style> block; selectors scoped under .p-<id>
  roles: readonly Role[]        // costumes it draws; others fall back to 'plain'
  draw: (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions) => string // SVG <g>
}
```

`who` carries both role and tier because the role picks the character (or costume, breed, colour) and the tier tints one piece. Only a few characters use `seed`, via `seed % n`; the rest ignore it.

The registry `hooks/packs/index.ts` lists the packs, and the panel draws only through it, never a pack directly. CSS from every pack is scoped under its own `.p-<id>` class so two packs never collide in a gallery.

### Roles

The orchestrator sets a `role` on every planned task in `mcp__relay-panel__progress`: `builder` (features, changes), `fixer` (debugging, root cause), `tester` (builds, tests, checks) or `scout` (searching, reading code). A relay worker wears the role of the planned task its description matches; with no match, or no role, it is a builder. The main session is the `conductor`, the built-in Explore agent a `scout`, any other subagent `plain`. Nothing is inferred from task text. The tier colour tints the costume's main piece as well as the collar.

### Packs

Seven packs. For every pack the role picks the character (or costume, breed, colour) and the tier colour, `accent`, tints part of the costume (a hat band, collar, scarf or clasp). A few characters get a random look from the seed.

1. **cats**: British Shorthair art; the role picks one of six coats (conductor lilac point, builder cream van, fixer cream and white, tester white, scout cream, plain blue and white).
2. **clawd**: the stock savvy-progress crab, wrapped; one costume per role (astronaut, engineer, detective, racer, pirate, bare). The default everyday pack.
3. **dogs**: the role picks the breed (conductor Pomeranian in chocolate and cream, builder corgi, fixer shiba, tester bichon frise, scout husky, plain Mabel the Australian shepherd in blue merle).
4. **turkeys** (holiday, Nov 15-30): one simple body; the role picks the heritage colour (conductor bronze, builder bourbon red, fixer slate, tester white holland, scout narragansett, plain royal palm). No breed silhouettes.
5. **christmas** (holiday, December): one character per role: Santa, gingerbread with a peppermint mallet, nutcracker with the same mallet, Mrs Claus with a test tube, an elf with a lantern, reindeer. Santa, nutcracker and Mrs Claus have one look; gingerbread (dough), elf (tunic) and reindeer (coat) pick one of six looks from the seed.
6. **winter**: front-facing snowman (conductor), yeti (builder), polar bear (fixer), snowy owl (tester), arctic fox (scout), penguin (plain). No held props. 36x30.
7. **adventurers**: front-facing magician with a glowing-orb staff (conductor), thief with twin daggers (builder), knight with sword and shield (fixer), healer with a floating tome (tester), archer with a bow and fire arrow (scout), ninja (plain). 32x30.

Shared props (cats, dogs, turkeys, christmas): fixers hold the peppermint mallet, testers a test tube, and scouts (cats, dogs, turkeys) a flashlight with a beam; the elf keeps its lantern. Clawd, winter and adventurers use their own props.

Sprite boxes: cats, dogs and turkeys 36x28, christmas 32x28, winter 36x30, adventurers 32x30, clawd 30x28. The panel draws sprites at full size up to a 36x32 box and scales anything larger down.

Adding a pack = one file + one line in the registry. `hooks/packs/packs.test.ts` runs over every registered pack, so it needs no test of its own. No panel change.

**Gallery size.** A pane over 100,000 characters draws nothing and says nothing. `register.tsx` runs every pane's sprites through `packs/compact.ts` (rect runs become one path per fill). All seven packs together are about 80,000 characters of compacted sprites and CSS before card text, and `packs.test.ts` fails at 90,000, so a new pack has about 10,000 characters for its six walking sprites and CSS.

## Active pack: storage and redraw

Two settings and a shuffle option (since relay-panel 0.3.0; 0.2.x had one `auto` or pinned mode):

- **Everyday pack**: a pack id, or `shuffle`. The `$.store` key `everyday`, then the plugin option `pack` ("Everyday pack": `clawd` default, `cats`, `dogs`, `winter`, `adventurers`, `shuffle`; a legacy `auto` reads as the default). Any registered id may be stored, holiday packs included (`/relay-pack turkeys` draws turkeys whenever no season shows).
- **Seasons**: on or off. The store key `seasons` (boolean), then the option `seasons` (`on` default, `off`).
- **Shuffle list**: the store key `shuffleList` (empty = every non-holiday pack).
- **Skipped season**: the store key `skipSeason`, `'<seasonId>:<year the season starts>'` (`christmas:2026`), or absent. A key from a season that is over never matches; it is cleared at `session.start`.
- **Last shuffle**: the store key `lastShuffle`, the previous pick.

The store wins over the options. All keys persist across sessions, per plugin, written by the `pack` tool, `/relay-pack` and the gallery.

**Holiday packs** are the packs in `SEASONS` (`hooks/packs/seasons.ts`, local time, inclusive):

| Dates | Pack |
|---|---|
| Nov 15-30 | `turkeys` |
| Dec 1-31 | `christmas` |

`OFF_SEASON` (`clawd`, also `DEFAULT_PACK`) is the fallback.

**Resolution** (`resolvePack` in `seasons.ts`, pure, unit-tested):

1. Seasons on, a season holds, its pack is registered, and `skipSeason` is not that season's key: the season's pack.
2. Else the everyday pack: a registered id, else `OFF_SEASON`, else `DEFAULT_PACK`; `shuffle` draws the session's pick.

**Shuffle pick**: made once per session at `session.start` (and by `shuffle`), never by a new flow or a redraw. Candidates: the shuffle list (or every registered pack), registered, minus holiday packs, in registry order. `lastShuffle` is left out while more than one candidate remains. `Math.random` picks; the pick is stored as `lastShuffle`. No candidates draws `OFF_SEASON`.

**Picking a pack during a season**: when rule 1 is showing a season, setting the everyday pack (or shuffling) also stores that season's key in `skipSeason`, so the pick shows now and the season returns next year. Picking the season's own pack skips nothing. Turning seasons on lifts a skip.

**Migration** (once, at `session.start`): the 0.2.x store key `pack`: `auto` sets nothing (the options apply); a registered id becomes `everyday` = that id with `seasons` = true; an unknown id is mentioned once. Then `pack` is deleted.

- **Live**: session atom `{ plugin: 'relay-panel', key: 'pack' }` holds the id showing, written only when it changes. The band and panel read it while drawing, so a write redraws both at once; no restart.
- **Cost**: checked at session start and when a new /relay plan starts (the `progress` call that starts a new flow: none before, the last one finished, or a new title). Each check re-resolves without a new shuffle and writes the atom only if the id changed; the same flow's later calls, and a worker's call, do not check. No timer; nothing checks per render or per tick.
- Unknown stored id (a removed pack, such as the former `crabs`): ignored; the `pack` option applies, then `DEFAULT_PACK`.

Why not a settings key: writing `settings.json` from a mod is heavier, and the options already cover "set it in config".

## Swapping packs

- **Tool** `mcp__relay-panel__pack` `{ action: 'list' | 'set' | 'shuffle' | 'seasons' | 'preview', id?, ids?, on? }`:
  - `list`: the settings line first, then ids, names, `(active)` on the one showing. The line: `everyday: cats · seasons on · showing: cats · next: turkeys Nov 15`; a shuffle reads `everyday: shuffle (cats, dogs) · …`; a skip adds `· christmas skipped until Dec 31`; seasons off reads `· seasons off` with no `next`.
  - `set` with `id`: a pack id becomes the everyday pack (`ok: everyday pack is Pixel dogs`; in season `ok: Pixel dogs now; Christmas skipped until Dec 31`); `shuffle` shuffles every non-holiday pack; `auto` turns seasons on. An unknown id is refused, naming the valid ones.
  - `shuffle` with optional `ids`: everyday `shuffle` over those ids, with a fresh pick now and the same in-season skip. Holiday or unknown ids are refused, naming the valid ones.
  - `seasons` with `on`: holiday packs on or off (`ok: seasons off; showing Clawd`).
  - `preview`: opens a `relay-packs` pane: one card per pack, every role in a row, walking. Labels: holiday cards "Holiday · Nov 15-30" / "Holiday · December", the everyday pack "Everyday", the one drawn now "Showing" (green). "Use" (on every card but the fixed everyday pack) sets the everyday pack.
- **Slash command** `/relay-pack` (no args: list; `<id>`; `shuffle [ids…]`; `seasons on|off`; `auto` = seasons on; `preview`). Works without the model.
- **Skill** `relay-pack` in the `relay-panel` plugin maps plain requests ("use dogs", "shuffle my sprites", "turn off holidays") to the tool. Model-invocable.

## Verification

- `claude plugin validate` on both plugins and the marketplace root.
- `claude plugin test plugins/relay-panel`: the fork's tests ported (renamed tools and ids), plus `hooks/packs/packs.test.ts` (runs over every pack: every role draws, CSS scoped, width/height honoured), `hooks/packs/compact.test.ts` (compacted markup paints the same pixels) and a pack-swap test in `hooks/pack.test.ts` (set → atom changes → drawn SVG changes pack class).
- Visual: `bun scripts/preview.ts` (or `npx tsx scripts/preview.ts`) renders each pack's gallery to `docs/preview/`; look at it in the browser, and at the live panel in Claude Code after swapping.
- Install test: add the marketplace from the local path, install both, confirm tool names and `/relay-agents`, `/relay-pack` appear.
