# File map

```
.claude-plugin/marketplace.json        marketplace "relay": lists both plugins
plugins/
  relay/                               orchestration plugin
    .claude-plugin/plugin.json
    skills/relay/SKILL.md              /relay orchestrator skill
    agents/relay-{light,medium,careful,heavy,expert}.md
    README.md
  relay-panel/                         mod: band + agents panel + sprite packs
    .claude-plugin/plugin.json         userConfig: language, autoOpen, pack, seasons
    hooks/hooks.json                   loads register.tsx
    hooks/register.tsx                 band, panel, tools (progress, step, pack), commands, gallery
    hooks/*.test.ts(x)                 panel, band, tools, cost and caller tests
    hooks/packs/types.ts               Pack, Role, Tier, DrawOptions
    hooks/packs/index.ts               registry: packs, default pack, lookup
    hooks/packs/seasons.ts             holiday table, pack resolution, shuffle
    hooks/packs/cats.ts                British Shorthair cats
    hooks/packs/clawd.ts               Clawd, the pixel crab (costumes by tier)
    hooks/packs/dogs.ts                six dog breeds
    hooks/packs/turkeys.ts             Thanksgiving turkeys (six heritage breeds)
    hooks/packs/christmas.ts           Santa, gingerbread, nutcracker, Mrs Claus, elf, reindeer
    hooks/packs/*.test.ts              per-pack tests; contract.test.ts runs over every pack
    skills/relay-pack/SKILL.md         list / preview / swap packs
    types/index.d.ts                   panel state types
    README.md
scripts/preview.ts                     renders the pack galleries into docs/preview/ (gitignored)
docs/SPEC.md                           design
docs/SPRITES.md                        how packs are built (start here for a new one)
README.md                              install, presets, commands, packs
```
