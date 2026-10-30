# relay-panel

A Claude Code mod: a progress bar above the prompt and a live panel of subagents. Made for the [relay](../relay) skill, and useful with any subagents.

- **Progress bar**: the flow's title, phase, accepted tasks out of planned, and a button with the crew size that opens the panel. It appears once something reports progress (relay does) or a `relay-*` worker starts.
- **Agents panel** (`/relay-agents` toggles it; `/relay-agents open` opens it or brings it forward without toggling): running, finished and planned subagents with model, effort, task progress, context, estimated cost and time. Workers are drawn by the active sprite pack. They walk while running; `prefers-reduced-motion` stops them.

Only `relay-*` workers count as tiered. Every other subagent shows as `other`.

## Sprite packs

- **cats**: British Shorthairs in profile, one costume per role: the orchestrator in a top hat with a baton, the planner in spectacles with a clipboard, the architect in a flat cap with a blueprint tube, the developer in headphones with a laptop, the designer in a beret with a brush, and explore as a pirate. The collar carries the tier colour. Each task gets its own coat (blue, white, cream, red, chocolate, lilac, cinnamon or fawn).
- **crabs** (off season): the stock crabs, one costume per tier: astronaut (fable), detective (heavy), hard hat (careful), chef (medium), racer (light), and pirate for explore.
- **dogs**: six breeds (corgi, husky, samoyed, bichon frise, maltese, shiba), one costume per role, breed per task.
- **turkeys** (Nov 15-30): six heritage breeds (bronze, narragansett, bourbon red, white holland, royal palm, slate) with fanned tails; pilgrim hat, recipe card, pie palette.
- **christmas** (December): characters by role: Santa (orchestrator), Mrs Claus (planner), elves (architect, developer, designer), the flying sled (explore) and reindeer (other), with Rudolph among the coats.

By default the pack follows the seasons, in local time: turkeys Nov 15-30, Christmas in December, crabs the rest of the year (a seasonal pack that is not installed falls back to crabs). It switches by itself at midnight: one timer waits for the next change, nothing polls.

`/relay-pack` shows the mode and lists the packs, `/relay-pack <id>` pins one, `/relay-pack auto` follows the seasons again, `/relay-pack preview` opens a gallery. The `relay-pack` skill does the same when you ask ("switch to cats"). The choice persists across sessions and redraws at once.

## Tools it adds

- `mcp__relay-panel__progress`: the orchestrator reports the plan, phase and accepted tasks. Only the main session can: a call from a subagent is ignored, so a worker cannot rename, finish or reset the flow.
- `mcp__relay-panel__step`: a worker reports its own steps (`done`, `total`, `note`). A worker that does not report shows its context fill in grey instead. The tool is listed up front rather than behind ToolSearch, and each `relay-*` worker gets one line at the end of its brief asking for these reports.
- `mcp__relay-panel__pack`: `list` (mode and packs), `set` (a pack id pins it, `auto` follows the seasons) or `preview` sprite packs.

Cost is a rough estimate from token counts and a built-in per-model price table (`PRICES` in `hooks/register.tsx`, list prices as of 2026-10-10), not a bill. Cache writes are priced at the 1-hour rate, which is what Claude Code writes on a subscription; a session that writes 5-minute entries is overestimated there.

## Settings

Set them in `/config`, or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "relay-panel": { "options": { "language": "ru", "pack": "cats" } } } }
```

`language`: `auto` (default), `en`, `ru` or `he`. Hebrew draws the bar and the panel right to left. `auto` follows Claude Code's `language` setting, then the system locale, and falls back to English.

`autoOpen`: `relay` (default) or `any`. With `relay` the panel opens by itself when a `relay-*` worker starts or a plan is reported. With `any` it also opens, once per session, when any other subagent starts. `/relay-agents` toggles it either way.

`pack`: `auto` (default: follow the seasons) or a pack id (`cats`, `crabs`, `dogs`, `turkeys`) to pin it. `/relay-pack` overrides it.

## Install

```
claude plugin install relay-panel@relay
```

Add the marketplace first; full steps are in the [repository README](../../README.md).
