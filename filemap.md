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
    hooks/packs/index.ts               registry: packs (everyday first, then seasonal), default pack, lookup
    hooks/packs/seasons.ts             holiday table, pack resolution, shuffle
    hooks/packs/compact.ts             merges rect runs into paths so the gallery fits the pane limit
    hooks/packs/cats.ts                British Shorthair cats (six coats, by role)
    hooks/packs/clawd.ts               Clawd, the pixel crab (costumes by role)
    hooks/packs/dogs.ts                six dog breeds, by role
    hooks/packs/turkeys.ts             Thanksgiving turkeys (six heritage colours, by role)
    hooks/packs/christmas.ts           Santa, gingerbread, nutcracker, Mrs Claus, elf, reindeer
    hooks/packs/winter.ts              snowman, yeti, polar bear, snowy owl, arctic fox, penguin
    hooks/packs/adventurers.ts         magician, thief, knight, healer, archer, ninja
    hooks/packs/packs.test.ts          one test that runs over every pack
    hooks/packs/compact.test.ts        compacted markup paints the same pixels as the rects
    hooks/packs/seasons.test.ts        holiday table and pack resolution
    skills/relay-packs/SKILL.md        list / preview / swap packs (model-only skill)
    types/index.d.ts                   panel state types
    README.md
scripts/preview.ts                     renders the pack galleries into docs/preview/ (gitignored)
docs/SPEC.md                           design
docs/SPRITES.md                        how packs are built (start here for a new one)
README.md                              install, presets, commands, packs
```
