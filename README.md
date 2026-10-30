# relay

An orchestration skill and a live agents panel for [Claude Code](https://claude.com/claude-code), in one marketplace.

| Plugin | Type | What it does |
| --- | --- | --- |
| [relay](plugins/relay) | skill + agents | `/relay`: the session model plans, delegates to five tiered worker subagents and reviews their work. |
| [relay-panel](plugins/relay-panel) | mod | A progress bar above the prompt and a live agents panel, drawn with swappable sprite packs. |

relay is forked from `savvy-flow` and `savvy-progress` in [johnnyvizz/claude-kit](https://github.com/johnnyvizz/claude-kit) (MIT). All names are changed so it installs next to the stock plugins.

## Install

From GitHub (the repo is private, so this needs GitHub access to it):

```
claude plugin marketplace add tommyliang-dev/relay
claude plugin install relay@relay
claude plugin install relay-panel@relay
```

Or from a local clone: `claude plugin marketplace add ~/Desktop/coding/relay`, then the same two installs.

Restart the session afterwards.

## First use

Ask for non-trivial work, or run `/relay <task>`. The skill plans, shows the tasks with their tiers, and delegates to `relay-*` workers. The bar appears above the prompt. `/relay-agents` opens the agents panel.

## Coexistence

relay installs alongside the stock plugins: every skill, agent, tool and command name differs.

Two panels would both draw a bar and open on plan reports. Disable the stock one:

```
claude plugin disable savvy-progress@claude-kit
```

If you load the dev-mods `savvy-progress` fork, unload it the way you loaded it (remove it from `--plugin-dir` or from the plugin dirs in `env` in `~/.claude/settings.json`).

Optional: disable `savvy-flow@claude-kit` and remove the `savvy-flow-auto` user skill, so only one orchestrator triggers.

```
claude plugin disable savvy-flow@claude-kit
```

## Sprite packs

The panel draws its workers with a sprite pack. By default it follows the seasons (local time):

| Dates | Pack |
|---|---|
| Nov 15-30 | turkeys |
| Dec 1-31 | Christmas |
| the rest of the year | crabs |

The switch happens on its own at midnight; one timer waits for the next change, nothing polls. A seasonal pack that is not installed falls back to crabs.

- **cats**: British Shorthairs in 8 coats, dressed by role.
- **crabs** (off season): the stock crabs, dressed by tier.
- **dogs**: corgi, husky, samoyed, bichon frise, maltese and shiba, dressed by role.
- **turkeys** (Nov 15-30): six heritage breeds with fanned tails, dressed by role.
- **christmas** (December): a cast by role: Santa conducts, Mrs Claus plans, elves build, design and code, the flying sled explores, and reindeer (Rudolph included) are everyone else.

Switch packs:

- `/relay-pack` shows the mode and lists the packs.
- `/relay-pack cats` pins cats, all year.
- `/relay-pack auto` follows the seasons again.
- `/relay-pack preview` opens a gallery of every pack.
- Or just ask: "switch to cats". The `relay-pack` skill handles it.

The starting mode comes from the `pack` option (`auto`, or a pack id to pin), set in `/config` or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "relay-panel": { "options": { "pack": "cats" } } } }
```

A choice made with `/relay-pack` overrides the option and persists across sessions.

### Adding a pack

1. Add one file in `plugins/relay-panel/hooks/packs/` that exports a `Pack` (see `types.ts`).
2. Add one line to `hooks/packs/index.ts`.

`contract.test.ts` runs the shared tests on every registered pack. Spiders may follow.

## Development

```
claude plugin validate .
claude plugin validate plugins/<name>
claude plugin test plugins/relay-panel
```

Pack galleries are in `docs/preview/`.

## License

MIT, as the original.
