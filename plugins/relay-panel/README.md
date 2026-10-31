# relay-panel

A Claude Code mod: a progress bar above the prompt and a live panel of subagents. Made for the [relay](../relay) skill, and useful with any subagents.

- **Progress bar**: the flow's title, phase, accepted tasks out of planned, and a button with the crew size that opens the panel. It appears once something reports progress (relay does) or a `relay-*` worker starts.
- **Agents panel** (`/relay-agents` toggles it; `/relay-agents open` opens it or brings it forward without toggling): running, finished and planned subagents with model, effort, task progress, context, estimated cost and time. Workers are drawn by the active sprite pack. They walk while running; `prefers-reduced-motion` stops them.

Only `relay-*` workers count as tiered. Every other subagent shows as `other`.

Each sprite wears a costume for its role. The main session is the **conductor**. The orchestrator gives every planned task a role, and a worker wears the role of the task it runs: **builder** (features, changes), **fixer** (debugging, root cause), **tester** (builds, tests, checks) or **scout** (searching, reading code). A worker with no matching task is a builder. The built-in Explore agent is a scout; any other subagent is **plain**. The tier colour tints the costume's main piece (hat, headphones, clipboard, bandana) and the collar.

## Sprite packs

- **cats**: British Shorthairs in profile, one costume per role: the conductor in a top hat with a baton, the builder in headphones with a laptop, the fixer in a flat cap with a wrench, the tester in spectacles with a clipboard, and the scout as a pirate with a spyglass. Each task gets its own coat (blue, white, cream, blue and white, cream van, cream and white, lilac point or fawn).
- **clawd** (the default everyday pack): the original crab, one costume per tier instead of per role: astronaut (expert, formerly fable), detective (heavy), hard hat (careful), chef (medium), racer (light), and pirate for a scout.
- **dogs**: six breeds (corgi, husky, samoyed, bichon frise, maltese, shiba), breed per task, in the same costumes as the cats.
- **turkeys** (holiday, Nov 15-30): six heritage breeds (bronze, narragansett, bourbon red, white holland, royal palm, slate) with fanned tails; the conductor in a pilgrim hat with a drumstick baton, the fixer with a wrench, the tester with a recipe card and the scout with a spyglass.
- **christmas** (holiday, December): one character per role: Santa (conductor), a gingerbread man with a peppermint mallet (builder), a nutcracker with a magnifying glass (fixer), Mrs Claus with a clipboard (tester), an elf with a lantern (scout) and reindeer (plain), with Rudolph among the coats.

Two settings decide what is drawn. The **everyday pack** shows all year: clawd by default, any pack, or `shuffle` (a random non-holiday pack each session, never the same one twice running). With **seasons** on (the default) holiday packs replace it in season, in local time: turkeys Nov 15-30, Christmas in December (a holiday pack that is not installed leaves the everyday pack showing). The pack is checked at session start and when a new `/relay` plan starts.

`/relay-pack` shows the settings (`everyday: cats · seasons on · showing: cats · next: turkeys Nov 15`) and lists the packs. `/relay-pack <id>` sets the everyday pack; picked during a season it shows at once and that season is skipped until it ends. `/relay-pack shuffle [ids]` shuffles (all non-holiday packs, or the ids given). `/relay-pack seasons on|off` turns the holiday packs on or off; `/relay-pack auto` is the same as `seasons on`. `/relay-pack preview` opens a gallery where holiday cards show their dates, the everyday pack reads "Everyday", the one drawn now "Showing", and "Use" sets the everyday pack. The `relay-pack` skill does the same when you ask ("use dogs", "shuffle my sprites", "turn off holidays"). Choices stay across sessions and redraw at once.

## Tools it adds

- `mcp__relay-panel__progress`: the orchestrator reports the plan, phase and accepted tasks. Only the main session can: a call from a subagent is ignored, so a worker cannot rename, finish or reset the flow.
- `mcp__relay-panel__step`: a worker reports its own steps (`done`, `total`, `note`). A worker that does not report shows its context fill in grey instead. The tool is listed up front rather than behind ToolSearch, and each `relay-*` worker gets one line at the end of its brief asking for these reports.
- `mcp__relay-panel__pack`: `list` (settings and packs), `set` (a pack id becomes the everyday pack; `shuffle`; `auto` turns seasons on), `shuffle` (optional `ids`), `seasons` (`on`: true or false) or `preview` sprite packs.

Cost is a rough estimate from token counts and a built-in per-model price table (`PRICES` in `hooks/register.tsx`, list prices as of 2026-10-10), not a bill. Cache writes are priced at the 1-hour rate, which is what Claude Code writes on a subscription; a session that writes 5-minute entries is overestimated there.

## Settings

Set them in `/config`, or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "relay-panel": { "options": { "language": "ru", "pack": "cats", "seasons": "on" } } } }
```

`language`: `auto` (default), `en`, `ru` or `he`. Hebrew draws the bar and the panel right to left. `auto` follows Claude Code's `language` setting, then the system locale, and falls back to English.

`autoOpen`: `relay` (default) or `any`. With `relay` the panel opens by itself when a `relay-*` worker starts or a plan is reported. With `any` it also opens, once per session, when any other subagent starts. `/relay-agents` toggles it either way.

`pack`: the everyday pack: `clawd` (default), `cats`, `dogs` or `shuffle` (a random non-holiday pack each session). A 0.2.x value `auto` reads as the default. `/relay-pack <id>` and `/relay-pack shuffle` override it.

`seasons`: `on` (default: turkeys Nov 15-30 and Christmas in December replace the everyday pack) or `off` (the everyday pack all year). `/relay-pack seasons on|off` overrides it.

Upgrading from 0.2.x: a pack pinned with `/relay-pack` becomes the everyday pack with seasons on.

Upgrading from 0.3.x: the `crabs` pack is now `clawd`; a stored or configured `crabs` falls back to the default, which is `clawd`. Roles come from the plan (`role` on each task in `mcp__relay-panel__progress`) instead of the task's wording, and are conductor, builder, fixer, tester, scout and plain.

## Install

```
claude plugin install relay-panel@relay
```

Add the marketplace first (`claude plugin marketplace add tommyliang-dev/relay`), then restart Claude Code. Copy-paste setup prompts are in the [repository README](../../README.md).
