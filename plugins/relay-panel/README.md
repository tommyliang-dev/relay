# relay-panel

A Claude Code mod: a progress bar above the prompt and a live panel of subagents. Made for the [relay](../relay) skill, and useful with any subagents.

- **Progress bar**: the flow's title, phase, accepted tasks out of planned, and a button with the crew size that opens the panel. It appears once something reports progress (relay does) or a `relay-*` worker starts.
- **Agents panel** (`/relay-agents` toggles it; `/relay-agents open` opens it or brings it forward without toggling): running, finished and planned subagents with model, effort, task progress, context, estimated cost and time. Workers are drawn by the active sprite pack. They walk while running; `prefers-reduced-motion` stops them.

Only `relay-*` workers count as tiered. Every other subagent shows as `other`.

Each sprite wears a costume for its role. The main session is the **conductor**. The orchestrator gives every planned task a role, and a worker wears the role of the task it runs: **builder** (features, changes), **fixer** (debugging, root cause), **tester** (builds, tests, checks) or **scout** (searching, reading code). A worker with no matching task is a builder. The built-in Explore agent is a scout; any other subagent is **plain**. The role picks the character (or the costume, breed or colour), so the job reads at a glance. The tier colour tints part of the costume. A few characters also get a random look, fixed for each task.

## Sprite packs

- **clawd** (the default everyday pack): the original crab, dressed by role: astronaut (conductor), engineer (builder), detective (fixer), racer (tester), pirate (scout), bare (plain).
- **cats**: British Shorthairs in profile. The role picks one of six coats; the conductor wears a top hat and conducts with a baton, the builder has headphones and a laptop, the fixer a flat cap, the tester spectacles, and the scout a pirate bandana.
- **dogs**: the role picks the breed: Pomeranian (conductor), corgi (builder), shiba (fixer), bichon frise (tester), husky (scout), and Mabel the Australian shepherd (plain).
- **adventurers**: front-facing magician (conductor), thief with twin daggers (builder), knight (fixer), healer (tester), archer (scout) and ninja (plain).

Seasonal (listed last in `/relay-packs` and the gallery):

- **winter**: front-facing snowman (conductor), yeti (builder), polar bear (fixer), snowy owl (tester), arctic fox (scout) and penguin (plain). They hold no props. Not a holiday pack: it can be the everyday pack or part of a shuffle.
- **turkeys** (holiday, Nov 15-30): one turkey body with a fanned tail; the role picks the heritage colour: bronze (conductor), bourbon red (builder), slate (fixer), white holland (tester), narragansett (scout), royal palm (plain).
- **christmas** (holiday, December): Santa (conductor), a gingerbread man with a peppermint mallet (builder), a nutcracker with the same mallet (fixer), Mrs Claus with a test tube (tester), an elf with a lantern (scout) and reindeer (plain). The gingerbread, elf and reindeer get a random look from six.

In cats, dogs, turkeys and christmas, fixers hold a peppermint mallet and testers a test tube; scouts in cats, dogs and turkeys hold a flashlight with a beam.

Two settings decide what is drawn. The **everyday pack** shows all year: clawd by default, any pack, or `shuffle` (a random non-holiday pack each session, never the same one twice running). With **seasons** on (the default) holiday packs replace it in season, in local time: turkeys Nov 15-30, Christmas in December (a holiday pack that is not installed leaves the everyday pack showing). The pack is checked at session start and when a new `/relay` plan starts.

`/relay-packs` shows the settings (`everyday: cats · seasons on · showing: cats · next: turkeys Nov 15`) and lists the packs: the everyday packs (clawd, cats, dogs, adventurers), then a `seasonal:` group (winter, turkeys, christmas). The old `/relay-pack` still works as a hidden alias. `/relay-agents [open]` and `/relay-packs` show argument hints and run immediately, even mid-turn. `/relay-packs <id>` sets the everyday pack; picked during a season it shows at once and that season is skipped until it ends. `/relay-packs shuffle [ids]` shuffles (all non-holiday packs, or the ids given). `/relay-packs seasons on|off` turns the holiday packs on or off; `/relay-packs auto` is the same as `seasons on`. `/relay-packs preview` opens a gallery (everyday packs first, then a Seasonal section: winter, turkeys, christmas) where holiday cards show their dates, the everyday pack reads "Everyday", the one drawn now "Showing", and "Use" sets the everyday pack. The `relay-packs` skill (model-only, not in the slash menu) does the same when you ask ("use dogs", "shuffle my sprites", "turn off holidays"). Choices stay across sessions and redraw at once.

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

`pack`: the everyday pack: `clawd` (default), `cats`, `dogs`, `winter`, `adventurers` or `shuffle` (a random non-holiday pack each session). A 0.2.x value `auto` reads as the default. `/relay-packs <id>` and `/relay-packs shuffle` override it.

`seasons`: `on` (default: turkeys Nov 15-30 and Christmas in December replace the everyday pack) or `off` (the everyday pack all year). `/relay-packs seasons on|off` overrides it.

Upgrading from 0.2.x: a pack pinned with `/relay-packs` becomes the everyday pack with seasons on.

Upgrading from 0.3.x: the `crabs` pack is now `clawd`; a stored or configured `crabs` falls back to the default, which is `clawd`. Roles come from the plan (`role` on each task in `mcp__relay-panel__progress`) instead of the task's wording, and are conductor, builder, fixer, tester, scout and plain.

Upgrading to 0.6.0: `/relay-pack` is now `/relay-packs` (the old name still works, hidden from the menu); the skill is model-only; the gallery lists the everyday packs, then a Seasonal section (winter, turkeys, christmas). Winter is seasonal for display only and stays a valid everyday and shuffle pack.

Upgrading from 0.4.x (0.5.0): the pack contract changed (no variants; each task gets a `seed`), clawd now dresses by role instead of tier, packs were redrawn, and the winter and adventurers packs were added.

## Install

```
claude plugin install relay-panel@relay
```

Add the marketplace first (`claude plugin marketplace add tommyliang-dev/relay`), then start a new session (restart Claude Code if `/relay-agents` does not show up). In the Claude desktop app, paste a setup prompt from the repository README instead: Claude runs the install with the app's own CLI. The CLI may print "4 userConfig options not yet set": harmless, all four have defaults; change them with `/plugin configure relay-panel@relay`. Copy-paste setup prompts are in the [repository README](../../README.md).
