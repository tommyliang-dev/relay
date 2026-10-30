# relay-panel

A Claude Code mod: a progress bar above the prompt and a live panel of subagents. Made for the [relay](../relay) skill, and useful with any subagents.

- **Progress bar**: the flow's title, phase, accepted tasks out of planned, and a button with the crew size that opens the panel. It appears once something reports progress (relay does) or a `relay-*` worker starts.
- **Agents panel** (`/relay-agents` toggles it; `/relay-agents open` opens it or brings it forward without toggling): running, finished and planned subagents with model, effort, task progress, context, estimated cost and time. Workers are drawn by the active sprite pack. They walk while running; `prefers-reduced-motion` stops them.

Only `relay-*` workers count as tiered. Every other subagent shows as `other`.

## Sprite packs

- **cats** (default): British Shorthairs in profile, one costume per role: the orchestrator in a top hat with a baton, the planner in spectacles with a clipboard, the architect in a flat cap with a blueprint tube, the developer in headphones with a laptop, the designer in a beret with a brush, and explore as a pirate. The collar carries the tier colour. Each task gets its own coat (blue, white, cream, red, chocolate, lilac, cinnamon or fawn).
- **crabs**: the stock crabs, one costume per tier: astronaut (fable), detective (heavy), hard hat (careful), chef (medium), racer (light), and pirate for explore.

`/relay-pack` lists the packs, `/relay-pack <id>` switches, `/relay-pack preview` opens a gallery. The `relay-pack` skill does the same when you ask ("switch to crabs"). The choice persists across sessions and redraws at once.

## Tools it adds

- `mcp__relay-panel__progress`: the orchestrator reports the plan, phase and accepted tasks. Only the main session can: a call from a subagent is ignored, so a worker cannot rename, finish or reset the flow.
- `mcp__relay-panel__step`: a worker reports its own steps (`done`, `total`, `note`). A worker that does not report shows its context fill in grey instead. The tool is listed up front rather than behind ToolSearch, and each `relay-*` worker gets one line at the end of its brief asking for these reports.
- `mcp__relay-panel__pack`: `list`, `set` or `preview` sprite packs.

Cost is a rough estimate from token counts and a built-in per-model price table (`PRICES` in `hooks/register.tsx`, list prices as of 2026-10-10), not a bill. Cache writes are priced at the 1-hour rate, which is what Claude Code writes on a subscription; a session that writes 5-minute entries is overestimated there.

## Settings

Set them in `/config`, or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "relay-panel": { "options": { "language": "ru", "pack": "crabs" } } } }
```

`language`: `auto` (default), `en`, `ru` or `he`. Hebrew draws the bar and the panel right to left. `auto` follows Claude Code's `language` setting, then the system locale, and falls back to English.

`autoOpen`: `relay` (default) or `any`. With `relay` the panel opens by itself when a `relay-*` worker starts or a plan is reported. With `any` it also opens, once per session, when any other subagent starts. `/relay-agents` toggles it either way.

`pack`: `cats` (default) or `crabs`. The default pack. `/relay-pack` overrides it.

## Install

```
claude plugin install relay-panel@relay
```

Add the marketplace first; full steps are in the [repository README](../../README.md).
