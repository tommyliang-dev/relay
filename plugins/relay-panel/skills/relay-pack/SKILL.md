---
name: relay-pack
description: List, preview or switch the sprite pack drawn in the relay agents panel (an everyday pack, or a shuffle, with holiday packs in season; cats, clawd, dogs, turkeys and more). Use when the user asks to change, swap, shuffle or show the panel's sprites, pets or critters, or to turn the holiday packs on or off.
---

# Sprite packs

Use the `mcp__relay-panel__pack` tool. If it is deferred, load it first with ToolSearch (`select:mcp__relay-panel__pack`).

Two settings decide what the panel draws:

- **Everyday pack**: the pack drawn all year (`clawd` by default), or `shuffle`: a random non-holiday pack each session, never the same one twice running.
- **Seasons** (on by default): holiday packs replace the everyday pack in season, in local time.

| Dates | Holiday pack |
|---|---|
| Nov 15-30 | `turkeys` |
| Dec 1-31 | `christmas` |

A holiday pack that is not installed leaves the everyday pack showing.

What the user says, and the call:

- No specific request: `action: "list"`. Its first line is the settings, e.g. `everyday: cats · seasons on · showing: cats · next: turkeys Nov 15`.
- "Show me", "preview", "what do they look like": `action: "preview"` (opens the sprite pack gallery).
- "Use dogs", "switch to the cats": `action: "set"` with the id from `list`. Match loose names to an id: "dogs" → `dogs`, "crab", "crabs", "claw'd" → `clawd`, "the cats" → `cats`. If nothing matches, call `list` and say which ids exist. During a season this skips that season for the rest of this year, so the pick shows at once; the reply says until when.
- "Shuffle my sprites", "surprise me", "a different one each time": `action: "shuffle"`. "Shuffle the cats and dogs": `action: "shuffle"` with `ids: ["cats", "dogs"]`. Holiday packs cannot be shuffled.
- "Turn off holidays", "no Christmas sprites", "no seasonal packs": `action: "seasons"` with `on: false`.
- "Turn holidays back on", "follow the seasons", "seasonal", "automatic": `action: "seasons"` with `on: true` (also lifts a skipped season). `set` with `id: "auto"` does the same.

Report the result in one line. Mention that `/relay-pack` (list), `/relay-pack <id>`, `/relay-pack shuffle [ids]`, `/relay-pack seasons on|off` and `/relay-pack preview` do the same without the model.
