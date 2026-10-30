---
name: relay-pack
description: List, preview or switch the sprite pack drawn in the relay agents panel (seasonal by default; cats, crabs, dogs, turkeys and more). Use when the user asks to change, swap or show the panel's sprites, pets or critters, or to follow the seasons again.
---

# Sprite packs

Use the `mcp__relay-panel__pack` tool. If it is deferred, load it first with ToolSearch (`select:mcp__relay-panel__pack`).

- No specific request: call it with `action: "list"`.
- "Show me", "preview", "what do they look like": `action: "preview"` (opens the sprite pack gallery).
- A named pack: `action: "set"` with the id from `list`. This pins it all year. Match loose names to an id: "dogs" → `dogs`, "crab" → `crabs`, "the cats" → `cats`. If nothing matches, call `list` and say which ids exist.
- "Seasonal", "automatic", "follow the seasons", "back to default": `action: "set"` with `id: "auto"`.

Auto mode (the default) follows the seasons, in local time:

| Dates | Pack |
|---|---|
| Nov 15-30 | `turkeys` |
| Dec 1-31 | `christmas` |
| otherwise | `crabs` |

A seasonal pack that is not installed falls back to `crabs`. `list` prints the mode on its first line.

Report the result in one line. Mention that `/relay-pack` (list), `/relay-pack <id>`, `/relay-pack auto` and `/relay-pack preview` do the same without the model.
