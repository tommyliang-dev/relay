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
| Workers | `savvy-light` … `savvy-fable` | `relay-light`, `relay-medium`, `relay-careful`, `relay-heavy`, `relay-fable` (agent type `relay:relay-light` etc.) |
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
export type Tier = 'fable' | 'heavy' | 'careful' | 'medium' | 'light' | 'other'

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

`who` carries both role and tier because the crabs dress by tier (astronaut fable, detective heavy, hard-hat careful, chef medium, racer light, pirate explore) while the cats dress by role. A pack uses whichever it wants.

The registry `hooks/packs/index.ts` lists the packs. The panel draws through `activePack().draw(...)`, never a pack directly. CSS from every pack is scoped under its own `.p-<id>` class so two packs never collide in a gallery.

### Packs in v1

1. **cats**: `cats.ts` from the fork, adapted to the interface. 7 roles, 8 coats.
2. **crabs**: stock `crabBody` / `COSTUMES` / `CRAB_CSS`, wrapped. Variants: one per tint of the clay body (variant picker kept stable; v1 may ship a single variant if extra tints look wrong).

### Later packs (slots left open)

3. **dogs**: corgi, husky, samoyed, bichon frise, maltese, shiba. Being drawn in another session at `shorthair-sprites/dogs.ts`. Breed is the variant; costumes by role. Imported only after you approve the draft.
4. **spiders**: if the old sprites turn up. Same interface.

Adding a pack = one file + one line in the registry + its tests. No panel change.

## Active pack: storage and redraw

- **Default**: plugin option `pack` in `userConfig` (`cats` default; choices are the shipped pack ids). Set in `/config` or `pluginConfigs.relay-panel.options.pack`.
- **Override**: `$.store` key `pack` (persists across sessions, per plugin). Written by the `pack` tool or `/relay-pack`.
- **Live**: session atom `{ plugin: 'relay-panel', key: 'pack' }`, loaded at `session.start` from store → option → `cats`. The band and panel read it while drawing, so a write redraws both at once; no restart.
- Unknown id (pack removed): fall back to `cats` and say so once.

Why not a settings key: writing `settings.json` from a mod is heavier, and the option already covers "set it in config".

## Swapping packs

- **Tool** `mcp__relay-panel__pack` `{ action: 'list' | 'set' | 'preview', id? }`:
  - `list`: ids, names, variant count, which is active.
  - `set`: validates, writes store + atom, returns the new active pack.
  - `preview`: opens a `relay-packs` pane: one card per pack, every role in a row, walking, with the active one marked.
- **Slash command** `/relay-pack` (no args: list; `<id>`: set; `preview`: open the gallery). Works without the model.
- **Skill** `relay-pack` in the `relay-panel` plugin: "switch / list / preview sprite packs". It calls the tool. Model-invocable so "use the dogs" works.

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

1. Keep the five tier names (light … fable) as is? Default: yes.
2. Crab variants: one clay colour, or a few tints? Default: one, extra tints only if they look good.
3. Should `/relay` stay model-invocable (auto) or be manual like `/savvy-flow`? Default: auto, since that's how you use it now.
