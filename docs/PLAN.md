# relay: build plan

Runs after SPEC.md is approved. Workers follow `~/.claude/CLAUDE.md` (shared checkout, file ownership, no git).

| # | Task | Tier | Owns | After |
|---|---|---|---|---|
| 1 | Scaffold marketplace and plugin manifests | light | `.claude-plugin/`, `plugins/*/.claude-plugin/`, `plugins/relay-panel/{tsconfig.json,types/,hooks/hooks.json}` | none |
| 2 | Port relay skill and five worker agents | light | `plugins/relay/` (except manifest) | 1 |
| 3 | Pack interface, registry and cats pack | medium | `plugins/relay-panel/hooks/packs/{types,index,cats}.ts`, `packs/cats.test.ts` | 1 |
| 4 | Crabs pack from stock code | medium | `plugins/relay-panel/hooks/packs/crabs.ts`, `packs/crabs.test.ts` | 3 |
| 5 | Port panel to relay names and pack API | careful | `plugins/relay-panel/hooks/register.tsx`, `hooks/*.test.ts*` | 3 |
| 6 | Pack tool, command, gallery pane, pack skill | medium | `register.tsx` (pack section), `plugins/relay-panel/skills/relay-pack/` | 4, 5 |
| 7 | Gallery render and visual check | orchestrator | `docs/preview/` | 4 |
| 8 | README with install steps | light | `README.md`, `plugins/*/README.md` | 6 |
| 9 | Final gate: validate, test, local install | light | none | all |

Tasks 2, 3 run in parallel after 1; 4 and 5 in parallel after 3. 5 and 6 share `register.tsx`, so they chain.

Dogs and spiders: separate tasks once their sprites exist and you approve importing them (one pack file + registry line each).

## Status (2026-10-30)

Tasks 1-9 done. Validate passes, 63 tests pass, isolated install works. Not yet checked: a live swap in a real Claude Code session. Next: dogs pack (after draft approval), spiders if found, plugin icons.
