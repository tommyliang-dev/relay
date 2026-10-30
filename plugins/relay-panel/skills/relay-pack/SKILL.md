---
name: relay-pack
description: List, preview or switch the sprite pack drawn in the relay agents panel (cats, crabs, more later). Use when the user asks to change, swap or show the panel's sprites, pets or critters.
---

# Sprite packs

Use the `mcp__relay-panel__pack` tool. If it is deferred, load it first with ToolSearch (`select:mcp__relay-panel__pack`).

- No specific request: call it with `action: "list"`.
- "Show me", "preview", "what do they look like": `action: "preview"` (opens the sprite pack gallery).
- A named pack: `action: "set"` with the id from `list`. Match loose names to an id: "dogs" → `dogs`, "crab" → `crabs`, "the cats" → `cats`. If nothing matches, call `list` and say which ids exist.

Report the result in one line. Mention that `/relay-pack` (list), `/relay-pack <id>` and `/relay-pack preview` do the same without the model.
