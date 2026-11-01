# relay

A delegation skill and live agents panel for Claude Code: the main session plans, tiered workers do the work, and a panel shows the crew as pixel sprites.

## Credit

relay is based on **savvy-flow** and **savvy-progress** by johnnyvizz, from [claude-kit](https://github.com/johnnyvizz/claude-kit) (MIT). The core design is theirs: an orchestrator that plans and reviews, five tiered workers, and a progress bar with an agents panel. All credit for it goes to the original authors.

relay keeps that design and adds:

- sprite packs
- seasonal holiday packs
- an everyday pack and shuffle
- a pack gallery, everyday packs first and seasonal ones last
- one `/relay` command: `/relay <task>` delegates, and `/relay agents`, `/relay preview` and `/relay pack …` run instantly, with no model turn
- the orchestration rules, built into the skill
- model presets
- setup prompts that work in the terminal, the desktop app or an IDE: Claude finds the CLI itself
- renamed tools, so it installs next to the originals

## Quick start

Paste one of these prompts into Claude Code: the terminal, the Claude desktop app or an IDE extension. Claude works out where it is running and installs with the Claude Code CLI itself; it hands you a step only if it cannot run the CLI at all.

### Prompt 1: install

````
Install relay for me. Work out where you're running from your own context; don't ask me.

1. Install relay@relay and relay-panel@relay from the tommyliang-dev/relay marketplace: user scope, enabled, latest (update any already installed). Use `claude`, or else the path in $CLAUDE_CODE_EXECPATH, once `--version` says Claude Code. Show me the versions from plugin list.
   Stop and tell me if a "relay" marketplace already points elsewhere, if a command fails (show the error), or if ~/.claude won't persist here (cloud or temporary environment; wait for my go-ahead). If you can't run the CLI at all, give me the /plugin commands to type in a Claude Code terminal and wait. "userConfig options not yet set" is harmless.
2. If savvy-progress or another agents panel is enabled (plugin list, or loaded in this session), ask before disabling it.
3. Ask which worker models I want; recommend Default, or Baller if I have Fable access. Tiers light / medium / careful / heavy / expert (models as of October 2026):
   - Default: Sonnet 5.5 low / Sonnet 5.5 medium / Sonnet 5.5 high / Opus 5.5 high / Opus 5.5 xhigh
   - Baller: Opus 5.5 low / Opus 5.5 medium / Opus 5.5 high / Opus 5.5 xhigh / Fable 5.1 xhigh
   - Budget: Haiku 5.5 low / Haiku 5.5 medium / Sonnet 5.5 medium / Sonnet 5.5 high / Opus 5.5 high
   - Custom: I pick a model and effort per tier.
4. For anything but Default, add a "## Relay models" block to my user CLAUDE.md (in ~/.claude, or CLAUDE_CONFIG_DIR if set), one line per tier like "- light: sonnet, low" (haiku, sonnet, opus or fable). If the file exists, back it up first (ask where; suggest CLAUDE.md.backup-<date> next to it). Keep what's there and show me the diff before saving.
5. If relay hasn't loaded here (the relay skill and mcp__relay-panel__ tools), tell me how to load it: a new session, or a restart. If the panel never loads, my Claude Code is too old for mods.
6. Short tour: /relay <task> (full name /relay:relay); /relay agents [open]; /relay preview; /relay pack [name | shuffle | seasonal on|off] for sprite packs: clawd, cats, dogs, adventurers, and seasonal winter, turkeys, christmas. Turkeys show Nov 15-30 and Christmas in December; my everyday pack (clawd) the rest of the year.
````

Good for: trying relay with nothing global changed except an optional model block.

### Prompt 2: install and make relay the default way to delegate

````
Install relay for me and make it my default way to delegate. Work out where you're running from your own context; don't ask me.

1. Install relay@relay and relay-panel@relay from the tommyliang-dev/relay marketplace: user scope, enabled, latest (update any already installed). Use `claude`, or else the path in $CLAUDE_CODE_EXECPATH, once `--version` says Claude Code. Show me the versions from plugin list.
   Stop and tell me if a "relay" marketplace already points elsewhere, if a command fails (show the error), or if ~/.claude won't persist here (cloud or temporary environment; wait for my go-ahead). If you can't run the CLI at all, give me the /plugin commands to type in a Claude Code terminal and wait. "userConfig options not yet set" is harmless.
2. If savvy-progress or another agents panel is enabled (plugin list, or loaded in this session), ask before disabling it.
3. Ask which worker models I want; recommend Default, or Baller if I have Fable access. Tiers light / medium / careful / heavy / expert (models as of October 2026):
   - Default: Sonnet 5.5 low / Sonnet 5.5 medium / Sonnet 5.5 high / Opus 5.5 high / Opus 5.5 xhigh
   - Baller: Opus 5.5 low / Opus 5.5 medium / Opus 5.5 high / Opus 5.5 xhigh / Fable 5.1 xhigh
   - Budget: Haiku 5.5 low / Haiku 5.5 medium / Sonnet 5.5 medium / Sonnet 5.5 high / Opus 5.5 high
   - Custom: I pick a model and effort per tier.
4. Edit my user CLAUDE.md (in ~/.claude, or CLAUDE_CONFIG_DIR if set). If it exists, back it up first (ask where; suggest CLAUDE.md.backup-<date> next to it). Keep what's there and show me the diff before saving. For anything but Default, add a "## Relay models" block, one line per tier like "- light: sonnet, low" (haiku, sonnet, opus or fable). Always add this section:

     # Orchestration (relay)
     - Orchestrate: changes across several files or packages, new features, refactors, root-cause debugging, wide searches, or work that ends in a build or test run. Run the `relay` skill first: it plans, delegates to the tiered relay-* workers and reports to the relay-panel progress bar and agents panel.
     - Answer directly: questions, explanations, quick lookups and small edits.
     - A repo's own CLAUDE.md / AGENTS.md wins over this section.

5. If another orchestrator would compete with relay (such as savvy-flow or a savvy-flow-auto skill), ask before disabling it.
6. If relay hasn't loaded here (the relay skill and mcp__relay-panel__ tools), tell me how to load it: a new session, or a restart. If the panel never loads, my Claude Code is too old for mods.
7. Short tour: /relay <task> (full name /relay:relay); /relay agents [open]; /relay preview; /relay pack [name | shuffle | seasonal on|off] for sprite packs: clawd, cats, dogs, adventurers, and seasonal winter, turkeys, christmas. Turkeys show Nov 15-30 and Christmas in December; my everyday pack (clawd) the rest of the year.
````

Good for: every session delegates the same way without typing `/relay`. The working rules live in the skill, so updating relay updates them.

## How it works

1. **Plan.** The main session reads the task, splits it into pieces and picks a tier for each. Design stays with the main session.
2. **Delegate in waves.** Independent tasks run in parallel, at most 10 workers at once. Each brief lists the files the worker owns, so two workers never edit the same file. Workers run no git.
3. **Review.** The main session spot-checks each result, then runs one final gate (build, tests or a check) before it reports back.

Tiers start at the lowest one that plausibly works.

| Tier | Default model · effort | Use for |
| --- | --- | --- |
| light | Sonnet 5.5 · low | Mechanical edits, renames, config, running builds and tests. |
| medium | Sonnet 5.5 · medium | Standard features, fixes with a known cause, a few files. |
| careful | Sonnet 5.5 · high | Multi-file refactors, fixes that must keep invariants, many edge cases. |
| heavy | Opus 5.5 · high | Unfamiliar or messy code, unclear root cause, non-obvious architecture. |
| expert (formerly fable) | Opus 5.5 · xhigh | The hardest problems: very complex logic, bugs that survived a heavy investigation. |

## Choosing models

Pick a preset (exact models as of October 2026):

| Tier | Default | Baller | Budget |
| --- | --- | --- | --- |
| light | Sonnet 5.5, low | Opus 5.5, low | Haiku 5.5, low |
| medium | Sonnet 5.5, medium | Opus 5.5, medium | Haiku 5.5, medium |
| careful | Sonnet 5.5, high | Opus 5.5, high | Sonnet 5.5, medium |
| heavy | Opus 5.5, high | Opus 5.5, xhigh | Sonnet 5.5, high |
| expert | Opus 5.5, xhigh | Fable 5.1, xhigh (needs Fable access) | Opus 5.5, high |

Or choose **Custom**: any model and effort per tier.

Default needs nothing. For any other choice, add a `## Relay models` block to `~/.claude/CLAUDE.md`, one line per tier. Use the aliases `haiku`, `sonnet`, `opus` and `fable`. This is Baller:

```
## Relay models
- light: opus, low
- medium: opus, medium
- careful: opus, high
- heavy: opus, xhigh
- expert: fable, xhigh
```

The main session reads the block and passes that model and effort on every worker call. If your account cannot use a listed model, that tier falls back to its default and you are told once.

To change later, edit the block, or delete it to go back to Default. It applies from the next `/relay` plan.

expert runs on Opus 5.5 unless you choose Baller.

## Commands and skills

| Command, skill or tool | What it does |
| --- | --- |
| `/relay <task>` | Runs the task through relay: plan, delegate, review. The full name is `/relay:relay`. |
| `relay` skill | The same flow, triggered on its own when you ask for non-trivial work. |
| `/relay agents` | Opens or closes the agents panel. Handled by relay-panel instantly, no model turn. |
| `/relay agents open` | Opens the panel, or brings it forward, without closing it. |
| `/relay preview` | Opens the sprite pack gallery: everyday packs first, then a Seasonal section. `/relay pack preview` works too. |
| `/relay pack` | Shows the pack settings and lists the packs: everyday packs, then a `seasonal:` group. Also `/relay pack list`. |
| `/relay pack <name>` | Makes that pack your everyday pack. Names are loose (cat → cats, crab → clawd, xmas → christmas, thanksgiving → turkeys); an unknown name shows the pack list. |
| `/relay pack shuffle [names]` | A random non-holiday pack each session, from all of them or the names you give. |
| `/relay pack seasonal on|off` | Turns the holiday packs on or off (`seasons` also works; `/relay pack auto` is `on`). |
| `mcp__relay-panel__progress` | The main session reports the plan, phase and accepted tasks to the progress bar. |
| `mcp__relay-panel__step` | A worker reports its own steps to the agents panel. |
| `mcp__relay-panel__pack` | Lists, sets, shuffles or previews sprite packs, and turns seasons on or off. Claude uses it when you ask in plain words ("use the dogs", "turn off holidays"); names are loose, as with `/relay pack`. |

How it works: relay-panel watches `/relay` submissions. An exact subcommand match runs instantly with no model turn; anything else, such as `/relay pack the release into a zip`, goes to the relay skill as a task. If relay-panel is not installed, the relay skill tells you so instead of orchestrating.

**Upgrading to 0.7.0** (relay-panel 0.7.0, relay 0.4.2): `/relay-agents` is now `/relay agents`, `/relay-packs` is now `/relay pack` (and `/relay preview` for the gallery), and `/relay-pack` is now `/relay pack`; the `seasons` argument is `seasonal` (`seasons` still works). The old commands are removed, with no aliases. The `relay-packs` skill is removed too: a mod command cannot share a name with a skill, which is why `/relay-packs` failed in 0.6.0. Plain-word requests now go straight to the `pack` tool.

## Sprite packs

Each sprite is dressed by its role. The main session is the conductor. When relay plans, it gives every task a role, and the worker running it wears that costume:

| Role | Who |
| --- | --- |
| conductor | the main session |
| builder | features and changes |
| fixer | debugging, root cause |
| tester | builds, tests, checks |
| scout | searching and reading code; also the Explore agent |
| plain | any other subagent |

The role picks the character (or the costume, breed or colour), so the job reads at a glance. The tier colour tints part of the costume. A few characters also get a random look, fixed for each task.

- **clawd** (the default everyday pack): the original crab, dressed by role: astronaut (conductor), engineer (builder), detective (fixer), racer (tester), pirate (scout), bare (plain).
- **cats**: British Shorthairs. The role picks one of six coats.
- **dogs**: the role picks the breed: Pomeranian (conductor), corgi (builder), shiba (fixer), bichon frise (tester), husky (scout), and Mabel the Australian shepherd (plain).
- **adventurers**: a magician conducts, a thief with twin daggers builds, a knight fixes, a healer tests, an archer scouts, and ninjas are everyone else.

Seasonal (listed last in `/relay pack` and the gallery):

- **winter**: a snowman conducts, a yeti builds, a polar bear fixes, a snowy owl tests, an arctic fox scouts, and penguins are everyone else. Not a holiday pack: it can be your everyday pack or part of a shuffle.
- **turkeys** (holiday): one turkey body; the role picks the heritage colour: bronze, bourbon red, slate, white holland, narragansett, royal palm.
- **christmas** (holiday): Santa conducts, a gingerbread man builds, a nutcracker fixes, Mrs Claus tests, an elf scouts with a lantern, and reindeer are everyone else.

In cats, dogs, turkeys and christmas, fixers hold a peppermint mallet and testers a test tube; scouts hold a flashlight (the christmas elf keeps its lantern).

| Dates | Holiday pack |
| --- | --- |
| Nov 15-30 | turkeys |
| Dec 1-31 | christmas |

Two settings decide what the panel draws:

- **Everyday pack**: drawn all year (clawd by default). Or **shuffle**: a random non-holiday pack each session, never the same one twice running.
- **Seasons** (on by default): a holiday pack replaces the everyday pack in its dates, in local time. A holiday pack that is not installed leaves the everyday pack showing.

If you pick a pack during a holiday, it shows now, and that holiday is skipped until it ends.

The pack is checked at session start and when a new `/relay` plan starts.

Set the starting values with the `pack` option (`clawd`, `cats`, `dogs`, `winter`, `adventurers` or `shuffle`) and the `seasons` option (`on` or `off`), in `/config` or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "relay-panel": { "options": { "pack": "cats", "seasons": "on" } } } }
```

A choice made with `/relay pack` overrides the options and stays across sessions.

## More prompts

### Update relay

For: getting the newest relay and relay-panel.

```
Update relay for me. Use a Claude Code CLI from your shell: `claude` if it is on PATH, otherwise the path in CLAUDE_CODE_EXECPATH; check that `<cli> --version` says Claude Code before using either. Run plugin marketplace update relay, then plugin update relay@relay and plugin update relay-panel@relay, and tell me the versions before and after. If a command fails, show me the error and stop; only if you cannot run the CLI at all, give me the /plugin commands to type in a Claude Code terminal session. Then tell me how to load the new version where you are running: a new session, or a restart of Claude Code.
```

### Switch from savvy-flow

For: moving from savvy-flow and savvy-progress to relay.

```
Switch me from savvy-flow to relay:
For steps 2 and 3, use a Claude Code CLI from your shell: `claude` if it is on PATH, otherwise the path in CLAUDE_CODE_EXECPATH; check that `<cli> --version` says Claude Code before using either. If a command fails, show me the error and stop; only if you cannot run the CLI at all, give me the same commands as /plugin commands to type in a Claude Code terminal session, and wait until I say they are done.

1. Before you change anything, back up my user CLAUDE.md (in ~/.claude, or in CLAUDE_CONFIG_DIR if that is set): ask me where, recommend a copy next to it (CLAUDE.md.backup-<date>), save it and tell me the path.
2. Run: plugin marketplace add tommyliang-dev/relay, plugin install relay@relay, plugin install relay-panel@relay (plugin update instead for any already installed).
3. Run: plugin disable savvy-flow@claude-kit and plugin disable savvy-progress@claude-kit, skipping any that plugin list does not show.
4. If I have a savvy-flow-auto skill in ~/.claude/skills, move it aside (for example to ~/.claude/skills-disabled/) instead of deleting it.
5. In my user CLAUDE.md, change references to savvy-flow, savvy-progress and their tools to relay, relay-panel and mcp__relay-panel__progress / step. Keep everything else, and show me the diff before you save.
6. Keep all backups and tell me where they are. Then tell me how to load relay where you are running: a new session, or a restart of Claude Code.
```

### Set up relay for a team repo

For: teammates get asked to install relay when they open the repo.

```
Set up relay for this repo's team:
1. In the repo's .claude/settings.json, add the relay marketplace under extraKnownMarketplaces ("relay": { "source": { "source": "github", "repo": "tommyliang-dev/relay" } }) and turn on both plugins under enabledPlugins ("relay@relay": true, "relay-panel@relay": true). Keep everything already there.
2. Add a short line to the repo's CLAUDE.md: "Delegate non-trivial work with the relay skill (/relay)."
3. Show me the diff of both files before you save.
```

### Try the panel

For: seeing the agents panel and sprites without real work.

```
Show me the relay agents panel: open it with /relay agents, then start a few demo workers, one per tier (relay-light, relay-medium, relay-careful, relay-heavy, relay-expert) plus one Explore agent. Each one only reports a few steps with mcp__relay-panel__step and changes nothing.
```

### Uninstall or undo

For: removing relay and putting things back.

```
Remove relay:
1. Remove the "# Orchestration (relay)" and "## Relay models" sections from my user CLAUDE.md (in ~/.claude, or in CLAUDE_CONFIG_DIR if that is set). If there is a CLAUDE.md.backup-* next to it or on my Desktop, tell me and ask whether to restore it instead: it may be older than other changes I made since. Show me the diff before you save.
2. Use a Claude Code CLI from your shell: `claude` if it is on PATH, otherwise the path in CLAUDE_CODE_EXECPATH; check that `<cli> --version` says Claude Code before using either. Run plugin uninstall relay@relay and plugin uninstall relay-panel@relay. If a command fails, show me the error and stop; only if you cannot run the CLI at all, give me /plugin uninstall relay@relay and /plugin uninstall relay-panel@relay to type in a Claude Code terminal session, and wait until I say they are done.
3. Re-enable anything relay setup disabled (for example savvy-flow@claude-kit or savvy-progress@claude-kit), and move back any skill that was moved aside. Ask me first.
4. Tell me how to finish unloading relay where you are running: a new session, or a restart of Claude Code.
```

### Make a new sprite pack

For: contributors adding a pack.

```
Help me make a new relay sprite pack:
1. Read docs/SPRITES.md and plugins/relay-panel/hooks/packs/types.ts first.
2. Build plugins/relay-panel/hooks/packs/<id>.ts, following an existing pack.
3. Register it in plugins/relay-panel/hooks/packs/index.ts. An everyday pack also goes in the `pack` option's list in plugins/relay-panel/.claude-plugin/plugin.json; a holiday pack goes in SEASONS in plugins/relay-panel/hooks/packs/seasons.ts instead.
4. Run `bun scripts/preview.ts` (or `npx tsx scripts/preview.ts` without bun), open docs/preview/ and look at the pack before you call it done.
5. Run claude plugin test plugins/relay-panel.
   If the `claude` or `bun` command is not found (for example in the Claude app), do not stop. Give me the exact commands to run in a terminal that has them, and wait for the result.
```

## Using it next to savvy

Every relay skill, agent, tool and command name differs from savvy-flow and savvy-progress, so nothing clashes.

Two panels would both draw a bar, so turn one off:

```
claude plugin disable savvy-progress@claude-kit
```

To keep only one orchestrator, also disable savvy-flow and move the `savvy-flow-auto` skill aside if you have it:

```
claude plugin disable savvy-flow@claude-kit
```

## Requirements and notes

- Claude Code with mod support. A plain terminal draws the panel as text.
- After installing, start a new session; restart Claude Code if the relay commands do not show up.
- Delegating costs more tokens than answering directly.
- You need Fable access only for the Baller preset.

## Development

```
claude plugin validate .
claude plugin validate plugins/relay
claude plugin validate plugins/relay-panel
claude plugin test plugins/relay-panel
```

These need the `claude` command in a terminal. The Claude app's `/plugin` commands cover install, update and uninstall only, so in the app run validate and test from a terminal that has the CLI.

How packs are built: `docs/SPRITES.md`. Pack galleries: `bun scripts/preview.ts` (or `npx tsx scripts/preview.ts`) writes them to `docs/preview/` (not committed).

## License

MIT, as the original (see [Credit](#credit)).
