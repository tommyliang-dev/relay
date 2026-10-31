# relay

A delegation skill and live agents panel for Claude Code: the main session plans, tiered workers do the work, and a panel shows the crew as pixel sprites.

## Credit

relay is based on **savvy-flow** and **savvy-progress** by johnnyvizz, from [claude-kit](https://github.com/johnnyvizz/claude-kit) (MIT). The core design is theirs: an orchestrator that plans and reviews, five tiered workers, and a progress bar with an agents panel. All credit for it goes to the original authors.

relay keeps that design and adds:

- sprite packs
- seasonal holiday packs
- an everyday pack and shuffle
- a pack gallery
- the orchestration rules, built into the skill
- model presets
- renamed tools, so it installs next to the originals

## Quick start

Paste one of these prompts into Claude Code, either the terminal (CLI) or the Claude app. The prompt tells Claude what to do if the `claude` command is not available.

### Prompt 1: install

````
Install relay for me:

1. Install the plugins. Run these in the shell:
   claude plugin marketplace add tommyliang-dev/relay
   claude plugin install relay@relay
   claude plugin install relay-panel@relay
   If the `claude` command is not found or fails (for example in the Claude app), do not stop. Give me these slash commands to type myself, then wait until I say they are done:
   /plugin marketplace add tommyliang-dev/relay
   /plugin install relay@relay
   /plugin install relay-panel@relay
2. If savvy-progress@claude-kit or another agents panel is enabled, tell me and ask before disabling it.
3. Ask me how I want my worker models set up. Show me these four presets with the exact models (as of October 2026):
   - Default: light Sonnet 5.5 low, medium Sonnet 5.5 medium, careful Sonnet 5.5 high, heavy Opus 5.5 high, expert Opus 5.5 xhigh.
   - Baller: light Opus 5.5 low, medium Opus 5.5 medium, careful Opus 5.5 high, heavy Opus 5.5 xhigh, expert Fable 5.1 xhigh (needs Fable access).
   - Budget: light Haiku 5.5 low, medium Haiku 5.5 medium, careful Sonnet 5.5 medium, heavy Sonnet 5.5 high, expert Opus 5.5 high.
   - Custom: I pick a model and effort per tier.
   Recommend Default, unless I say I have Fable access; then recommend Baller.
4. If I pick anything but Default, add a "## Relay models" block to ~/.claude/CLAUDE.md, one line per tier, like "- light: sonnet, low" (aliases: haiku, sonnet, opus, fable). Before you edit ~/.claude/CLAUDE.md:
   - ask me where to save a backup copy, and recommend my Desktop (~/Desktop/CLAUDE.md.backup-<date>);
   - save the backup and tell me its path;
   - keep everything already in the file, and show me the diff before you save.
5. Tell me to restart (terminal: exit and run `claude` again; Claude app: quit and reopen it).
6. Give me a short tour:
   - /relay <task> runs a task through relay.
   - /relay-agents opens the agents panel.
   - /relay-pack lists the sprite packs; /relay-pack shuffle, /relay-pack seasons on|off and /relay-pack preview.
   - The five sprite packs: cats, clawd, dogs, turkeys and christmas.
   - Holiday packs show by themselves: turkeys Nov 15-30, Christmas in December, and my everyday pack the rest of the year (clawd unless I change it).
````

Good for: trying relay with nothing global changed except an optional model block.

### Prompt 2: install and make relay the default way to delegate

````
Install relay for me and make it my default way to delegate:

1. Install the plugins. Run these in the shell:
   claude plugin marketplace add tommyliang-dev/relay
   claude plugin install relay@relay
   claude plugin install relay-panel@relay
   If the `claude` command is not found or fails (for example in the Claude app), do not stop. Give me these slash commands to type myself, then wait until I say they are done:
   /plugin marketplace add tommyliang-dev/relay
   /plugin install relay@relay
   /plugin install relay-panel@relay
2. If savvy-progress@claude-kit or another agents panel is enabled, tell me and ask before disabling it.
3. Ask me how I want my worker models set up. Show me these four presets with the exact models (as of October 2026):
   - Default: light Sonnet 5.5 low, medium Sonnet 5.5 medium, careful Sonnet 5.5 high, heavy Opus 5.5 high, expert Opus 5.5 xhigh.
   - Baller: light Opus 5.5 low, medium Opus 5.5 medium, careful Opus 5.5 high, heavy Opus 5.5 xhigh, expert Fable 5.1 xhigh (needs Fable access).
   - Budget: light Haiku 5.5 low, medium Haiku 5.5 medium, careful Sonnet 5.5 medium, heavy Sonnet 5.5 high, expert Opus 5.5 high.
   - Custom: I pick a model and effort per tier.
   Recommend Default, unless I say I have Fable access; then recommend Baller.
4. Edit ~/.claude/CLAUDE.md. Before you edit it:
   - ask me where to save a backup copy, and recommend my Desktop (~/Desktop/CLAUDE.md.backup-<date>);
   - save the backup and tell me its path;
   - keep everything already in the file, and show me the diff before you save.
   Then:
   - If I picked anything but Default, add a "## Relay models" block, one line per tier, like "- light: sonnet, low" (aliases: haiku, sonnet, opus, fable).
   - Add this section:

     # Orchestration (relay)
     - Orchestrate: changes across several files or packages, new features, refactors, root-cause debugging, wide searches, or work that ends in a build or test run. Run the `relay` skill first: it plans, delegates to the tiered relay-* workers and reports to the relay-panel progress bar and agents panel.
     - Answer directly: questions, explanations, quick lookups and small edits.
     - A repo's own CLAUDE.md / AGENTS.md wins over this section.

5. If another orchestrator would compete with relay (for example the savvy-flow-auto skill or savvy-flow@claude-kit), list it and ask me whether to disable it.
6. Tell me to restart (terminal: exit and run `claude` again; Claude app: quit and reopen it).
7. Give me a short tour:
   - /relay <task> runs a task through relay.
   - /relay-agents opens the agents panel.
   - /relay-pack lists the sprite packs; /relay-pack shuffle, /relay-pack seasons on|off and /relay-pack preview.
   - The five sprite packs: cats, clawd, dogs, turkeys and christmas.
   - Holiday packs show by themselves: turkeys Nov 15-30, Christmas in December, and my everyday pack the rest of the year (clawd unless I change it).
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
| `/relay-agents` | Opens or closes the agents panel. |
| `/relay-agents open` | Opens the panel, or brings it forward, without closing it. |
| `/relay-pack` | Shows the pack settings and lists the packs. |
| `/relay-pack <id>` | Makes that pack your everyday pack. |
| `/relay-pack shuffle [ids]` | A random non-holiday pack each session, from all of them or the ids you give. |
| `/relay-pack seasons on\|off` | Turns the holiday packs on or off. |
| `/relay-pack auto` | Same as `seasons on`. |
| `/relay-pack preview` | Opens a gallery of every pack. |
| `relay-pack` skill | The same, in plain words: "use dogs", "shuffle my sprites", "turn off holidays". |
| `mcp__relay-panel__progress` | The main session reports the plan, phase and accepted tasks to the progress bar. |
| `mcp__relay-panel__step` | A worker reports its own steps to the agents panel. |
| `mcp__relay-panel__pack` | Lists, sets, shuffles or previews sprite packs, and turns seasons on or off. |

## Sprite packs

Each sprite is dressed by its role. The main session is the conductor. When relay plans, it gives every task a role, and the worker running it wears that costume:

| Role | Who | Cats wear |
| --- | --- | --- |
| conductor | the main session | top hat and baton |
| builder | features and changes | headphones and laptop |
| fixer | debugging, root cause | flat cap and wrench |
| tester | builds, tests, checks | spectacles and clipboard |
| scout | searching and reading code; also the Explore agent | pirate with a spyglass |
| plain | any other subagent | collar only |

The tier colour tints the costume's main piece and the collar.

- **cats**: British Shorthairs in 8 coats, dressed by role.
- **clawd** (the default everyday pack): the original crab, dressed by tier instead of role.
- **dogs**: corgi, husky, samoyed, bichon frise, maltese and shiba, dressed by role.
- **turkeys** (holiday): six heritage breeds with fanned tails, dressed by role.
- **christmas** (holiday): Santa conducts, a gingerbread man builds, a nutcracker fixes, Mrs Claus tests, an elf scouts with a lantern, and reindeer (Rudolph included) are everyone else.

| Dates | Holiday pack |
| --- | --- |
| Nov 15-30 | turkeys |
| Dec 1-31 | christmas |

Two settings decide what the panel draws:

- **Everyday pack**: drawn all year (clawd by default). Or **shuffle**: a random non-holiday pack each session, never the same one twice running.
- **Seasons** (on by default): a holiday pack replaces the everyday pack in its dates, in local time. A holiday pack that is not installed leaves the everyday pack showing.

If you pick a pack during a holiday, it shows now, and that holiday is skipped until it ends.

The pack is checked at session start and when a new `/relay` plan starts.

Set the starting values with the `pack` option (`clawd`, `cats`, `dogs` or `shuffle`) and the `seasons` option (`on` or `off`), in `/config` or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "relay-panel": { "options": { "pack": "cats", "seasons": "on" } } } }
```

A choice made with `/relay-pack` overrides the options and stays across sessions.

## More prompts

### Update relay

For: getting the newest relay and relay-panel.

```
Update relay for me: run "claude plugin marketplace update relay", then "claude plugin update relay@relay" and "claude plugin update relay-panel@relay". Tell me what changed, then tell me to restart Claude Code.
```

### Switch from savvy-flow

For: moving from savvy-flow and savvy-progress to relay.

```
Switch me from savvy-flow to relay:
1. Before you change anything, ask me where to save a backup of ~/.claude/CLAUDE.md, and recommend my Desktop (~/Desktop/CLAUDE.md.backup-<date>). Save it and tell me the path.
2. Run: claude plugin marketplace add tommyliang-dev/relay, claude plugin install relay@relay, claude plugin install relay-panel@relay.
3. Run: claude plugin disable savvy-flow@claude-kit and claude plugin disable savvy-progress@claude-kit.
   For steps 2 and 3, if the `claude` command is not found or fails (for example in the Claude app), give me the same commands as /plugin slash commands (/plugin marketplace add ..., /plugin install ..., /plugin disable ...) to type myself, and wait until I say they are done.
4. If I have a savvy-flow-auto skill in ~/.claude/skills, move it aside (for example to ~/.claude/skills-disabled/) instead of deleting it.
5. In ~/.claude/CLAUDE.md, change references to savvy-flow, savvy-progress and their tools to relay, relay-panel and mcp__relay-panel__progress / step. Keep everything else, and show me the diff before you save.
6. Keep all backups. Tell me where they are, then tell me to restart Claude Code.
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
Show me the relay agents panel: open it with /relay-agents, then start a few demo workers, one per tier (relay-light, relay-medium, relay-careful, relay-heavy, relay-expert) plus one Explore agent. Each one only reports a few steps with mcp__relay-panel__step and changes nothing.
```

### Uninstall or undo

For: removing relay and putting things back.

```
Remove relay:
1. If there is a CLAUDE.md backup on my Desktop (~/Desktop/CLAUDE.md.backup-*), ask me whether to restore it. Otherwise remove the "# Orchestration (relay)" and "## Relay models" sections from ~/.claude/CLAUDE.md. Show me the diff before you save.
2. Run: claude plugin uninstall relay@relay and claude plugin uninstall relay-panel@relay. If the `claude` command is not found or fails (for example in the Claude app), give me /plugin uninstall relay@relay and /plugin uninstall relay-panel@relay to type myself, and wait until I say they are done.
3. Re-enable anything relay setup disabled (for example savvy-flow@claude-kit or savvy-progress@claude-kit), and move back any skill that was moved aside. Ask me first.
4. Tell me to restart (terminal: exit and run `claude` again; Claude app: quit and reopen it).
```

### Make a new sprite pack

For: contributors adding a pack.

```
Help me make a new relay sprite pack:
1. Read docs/SPRITES.md and plugins/relay-panel/hooks/packs/types.ts first.
2. Build plugins/relay-panel/hooks/packs/<id>.ts with its tests, following an existing pack.
3. Register it in plugins/relay-panel/hooks/packs/index.ts. An everyday pack also goes in the `pack` option's list in plugins/relay-panel/.claude-plugin/plugin.json; a holiday pack goes in SEASONS in plugins/relay-panel/hooks/packs/seasons.ts instead.
4. Run `bun scripts/preview.ts`, open docs/preview/ and look at the pack before you call it done.
5. Run claude plugin test plugins/relay-panel.
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
- Restart Claude Code after you install.
- Delegating costs more tokens than answering directly.
- You need Fable access only for the Baller preset.

## Development

```
claude plugin validate .
claude plugin validate plugins/relay
claude plugin validate plugins/relay-panel
claude plugin test plugins/relay-panel
```

How packs are built: `docs/SPRITES.md`. Pack galleries: `bun scripts/preview.ts` writes them to `docs/preview/` (not committed).

## License

MIT, as the original (see [Credit](#credit)).
