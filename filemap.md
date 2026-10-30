# File map

Planned layout (most files arrive after the spec is approved).

```
.claude-plugin/marketplace.json        marketplace "relay": lists both plugins
plugins/
  relay/                               orchestration plugin
    .claude-plugin/plugin.json
    skills/relay/SKILL.md              /relay orchestrator skill
    agents/relay-{light,medium,careful,heavy,fable}.md
  relay-panel/                         mod: band + agents panel + sprite packs
    .claude-plugin/plugin.json         userConfig: language, autoOpen, pack
    hooks/hooks.json                   loads register.tsx
    hooks/register.tsx                 band, panel, tools (progress, step, pack), commands
    hooks/packs/types.ts               Pack, Role, Tier, DrawOptions
    hooks/packs/index.ts               registry: list, get, default
    hooks/packs/cats.ts                British Shorthair cats
    hooks/packs/crabs.ts               pixel crabs (stock costumes)
    hooks/packs/contract.test.ts       Pack contract, looped over every registered pack
    hooks/*.test.ts(x), packs/*.test.ts
    skills/relay-pack/SKILL.md         list / preview / swap packs
    types/index.d.ts                   panel state types
docs/SPEC.md                           approved design
docs/PLAN.md                           build plan
docs/preview/                          rendered pack galleries (visual check)
README.md                              install steps
```
