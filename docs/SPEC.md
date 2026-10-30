# relay: spec

Status: approved 2026-10-30 with the default answers to the open questions.

## Goal

A personally owned copy of johnnyvizz's `savvy-flow` orchestration skill and `savvy-progress` agents-panel mod, renamed **relay**, that installs from this repo as a marketplace next to the stock plugins without clashing. The panel ships several sprite packs and a skill (plus a slash command) swaps the active one.

Delegation is the product; the sprites are the garnish.

## Plugins

The repo is a marketplace named `relay` with two plugins.

| Plugin | What it is | Source it copies |
|---|---|---|
| `relay` | Orchestrator skill + five tiered worker agents | `claude-kit/savvy-flow` 1.2.0, plus the auto-invoking wording of `~/.claude/skills/savvy-flow-auto` |
| `relay-panel` | Progress bar above the prompt + agents panel + sprite packs | The dev-mods fork of `savvy-progress` 1.2.1 (cats), with the stock crab code restored as a pack |

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

The panel recognises **only** `relay-*` workers as tiered (so it does not fight the stock panel over `savvy-*` runs). Every other subagent still shows as `other`, as today.

Behaviour otherwise matches the fork: languages (en, ru, he with RTL), `autoOpen`, cost table, step reporting, the brief line appended to workers, sentence case.

## Sprite packs

### Pack interface

Each pack is one module under `plugins/relay-panel/hooks/packs/<id>.ts` exporting a `Pack`:

```ts
export type Role = 'orchestrator' | 'planner' | 'architect' | 'developer' | 'designer' | 'explore' | 'other'
export type Tier = 'expert' | 'heavy' | 'careful' | 'medium' | 'light' | 'other' // expert: formerly fable

export type DrawOptions = {
  variant: string     // from pack.variantOf(taskKey)
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
  roles: readonly Role[]        // costumes it draws; others fall back to 'other'
  variants: readonly string[]   // coats / breeds / colours
  variantOf: (taskKey: string) => string // stable hash pick
  draw: (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions) => string // SVG <g>
}
```

`who` carries both role and tier because the crabs dress by tier (astronaut expert, formerly fable; detective heavy, hard-hat careful, chef medium, racer light, pirate explore) while the cats dress by role. A pack uses whichever it wants.

The registry `hooks/packs/index.ts` lists the packs. The panel draws through `activePack().draw(...)`, never a pack directly. CSS from every pack is scoped under its own `.p-<id>` class so two packs never collide in a gallery.

### Packs in v1

1. **cats**: `cats.ts` from the fork, adapted to the interface. 7 roles, 8 coats.
2. **crabs**: stock `crabBody` / `COSTUMES` / `CRAB_CSS`, wrapped. Variants: one per tint of the clay body (variant picker kept stable; v1 may ship a single variant if extra tints look wrong).

### Later packs (slots left open)

3. **dogs**: corgi, husky, samoyed, bichon frise, maltese, shiba. Being drawn in another session at `shorthair-sprites/dogs.ts`. Breed is the variant; costumes by role. Imported only after you approve the draft.
4. **spiders**: if the old sprites turn up. Same interface.

Adding a pack = one file + one line in the registry + its tests. No panel change.

## Active pack: storage and redraw

Two settings and a shuffle option (since relay-panel 0.3.0; 0.2.x had one `auto` or pinned mode):

- **Everyday pack**: a pack id, or `shuffle`. The `$.store` key `everyday`, then the plugin option `pack` ("Everyday pack": `crabs` default, `cats`, `dogs`, `shuffle`; a legacy `auto` reads as the default). Any registered id may be stored, holiday packs included (`/relay-pack turkeys` draws turkeys whenever no season shows).
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

`OFF_SEASON` (`crabs`, also `DEFAULT_PACK`) is the fallback.

**Resolution** (`resolvePack` in `seasons.ts`, pure, unit-tested):

1. Seasons on, a season holds, its pack is registered, and `skipSeason` is not that season's key: the season's pack.
2. Else the everyday pack: a registered id, else `OFF_SEASON`, else `DEFAULT_PACK`; `shuffle` draws the session's pick.

**Shuffle pick**: made once per session at `session.start` (and by `shuffle`), never by a new flow or a redraw. Candidates: the shuffle list (or every registered pack), registered, minus holiday packs, in registry order. `lastShuffle` is left out while more than one candidate remains. `Math.random` picks; the pick is stored as `lastShuffle`. No candidates draws `OFF_SEASON`.

**Picking a pack during a season**: when rule 1 is showing a season, setting the everyday pack (or shuffling) also stores that season's key in `skipSeason`, so the pick shows now and the season returns next year. Picking the season's own pack skips nothing. Turning seasons on lifts a skip.

**Migration** (once, at `session.start`): the 0.2.x store key `pack`: `auto` sets nothing (the options apply); a registered id becomes `everyday` = that id with `seasons` = true; an unknown id is mentioned once. Then `pack` is deleted.

- **Live**: session atom `{ plugin: 'relay-panel', key: 'pack' }` holds the id showing, written only when it changes. The band and panel read it while drawing, so a write redraws both at once; no restart.
- **Cost**: checked at session start and when a new /relay plan starts (the `progress` call that starts a new flow: none before, the last one finished, or a new title). Each check re-resolves without a new shuffle and writes the atom only if the id changed; the same flow's later calls, and a worker's call, do not check. No timer; nothing checks per render or per tick.
- Unknown stored id (pack removed): fall back to the option and say so once.

Why not a settings key: writing `settings.json` from a mod is heavier, and the options already cover "set it in config".

## Swapping packs

- **Tool** `mcp__relay-panel__pack` `{ action: 'list' | 'set' | 'shuffle' | 'seasons' | 'preview', id?, ids?, on? }`:
  - `list`: the settings line first, then ids, names, variant count, `(active)` on the one showing. The line: `everyday: cats · seasons on · showing: cats · next: turkeys Nov 15`; a shuffle reads `everyday: shuffle (cats, dogs) · …`; a skip adds `· christmas skipped until Dec 31`; seasons off reads `· seasons off` with no `next`.
  - `set` with `id`: a pack id becomes the everyday pack (`ok: everyday pack is Pixel dogs`; in season `ok: Pixel dogs now; Christmas skipped until Dec 31`); `shuffle` shuffles every non-holiday pack; `auto` turns seasons on. An unknown id is refused, naming the valid ones.
  - `shuffle` with optional `ids`: everyday `shuffle` over those ids, with a fresh pick now and the same in-season skip. Holiday or unknown ids are refused, naming the valid ones.
  - `seasons` with `on`: holiday packs on or off (`ok: seasons off; showing Pixel crabs`).
  - `preview`: opens a `relay-packs` pane: one card per pack, every role in a row, walking. Labels: holiday cards "Holiday · Nov 15-30" / "Holiday · December", the everyday pack "Everyday", the one drawn now "Showing" (green). "Use" (on every card but the fixed everyday pack) sets the everyday pack.
- **Slash command** `/relay-pack` (no args: list; `<id>`; `shuffle [ids…]`; `seasons on|off`; `auto` = seasons on; `preview`). Works without the model.
- **Skill** `relay-pack` in the `relay-panel` plugin maps plain requests ("use dogs", "shuffle my sprites", "turn off holidays") to the tool. Model-invocable.

## Verification

- `claude plugin validate` on both plugins and the marketplace root.
- `claude plugin test plugins/relay-panel`: the fork's tests ported (renamed tools and ids), plus per-pack tests (every role draws, `variantOf` stable, CSS scoped, width/height honoured) and a pack-swap test (set → atom changes → drawn SVG changes pack class).
- Visual: render each pack's gallery to HTML and look at it in the browser; screenshot the live panel in Claude Code after swapping.
- Install test: add the marketplace from the local path, install both, confirm tool names and `/relay-agents`, `/relay-pack` appear.

## Out of scope

- Pushing to GitHub (remote added later on request).
- Changing the stock plugins, the dev-mods fork or `~/.claude/CLAUDE.md`.
- New orchestration rules: the skill text is copied with renames only; your global rules in `~/.claude/CLAUDE.md` keep applying on top.

## Coexistence

Both panels would draw a band and auto-open on plan reports. After installing relay, disable `savvy-progress@claude-kit` and the dev-mods `savvy-progress` fork. `savvy-flow@claude-kit` can stay installed (different names) but it is simpler to disable it too, and to point the `savvy-flow-auto` user skill at relay or remove it so two orchestrator skills don't both trigger.

## Open questions

1. Keep the five tier names (light … expert) as is? Settled: the top tier is `expert`, formerly `fable`; the panel still reads `fable` and `relay-fable` as expert.
2. Crab variants: one clay colour, or a few tints? Default: one, extra tints only if they look good.
3. Should `/relay` stay model-invocable (auto) or be manual like `/savvy-flow`? Default: auto, since that's how you use it now.
