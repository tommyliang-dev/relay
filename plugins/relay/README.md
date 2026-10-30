# relay

An orchestration skill for Claude Code. The session model plans, owns design and reviews. Five tiered worker subagents implement.

## The skill

`/relay <task>` runs the flow. The skill is also model-invocable: ask for non-trivial work and it triggers on its own. Plugin skills are namespaced, so the full name is `/relay:relay`.

The flow: understand and plan, design (kept by the orchestrator), delegate by tier, spot-check each result, run one final gate, then close.

Independent tasks run in parallel waves, at most 10 workers at once (2-5 by default). Each brief lists the files the worker owns and must not touch, so parallel workers never edit the same file. Workers run no state-changing git; the orchestrator does git only when you ask. Tiers start at the lowest one that plausibly works.

## Workers

Agent types are `relay:relay-light`, `relay:relay-medium` and so on.

| Tier | Agent | Model / effort | Use for |
| --- | --- | --- | --- |
| Fable | `relay-fable` | Fable / high | The hardest problems: very complex logic, bugs that survived a Heavy investigation, design features only when asked. |
| Heavy | `relay-heavy` | Opus / xhigh | Understand and find: unfamiliar or messy code, unclear root cause, non-obvious architecture. |
| Careful | `relay-careful` | Opus / high | Do it right: multi-file refactors, fixes that must keep invariants, many edge cases. |
| Medium | `relay-medium` | Opus / medium | Standard features, fixes with a known cause, a few files. |
| Light | `relay-light` | Opus / low | Mechanical edits, renames, config, running builds and tests. |

## With relay-panel

relay works on its own. With [relay-panel](../relay-panel) installed, the flow drives the progress bar and workers report their steps to the agents panel.

## Install

```
claude plugin install relay@relay
```

Add the marketplace first; full steps are in the [repository README](../../README.md).
