# relay

Marketplace `relay` with two Claude Code plugins: `relay` (orchestrator skill + tiered workers) and `relay-panel` (progress bar, agents panel, sprite packs). Spec: `docs/SPEC.md`. Map: `filemap.md`.

- Copied from johnnyvizz/claude-kit `savvy-flow` / `savvy-progress`. Never reuse a `savvy-*` name, tool, command, pane id or state key: it must install alongside the stock plugins.
- MCP tool names come from the plugin name: `mcp__relay-panel__progress|step|pack`. Skill and agent text must match.
- Sprites: one file per pack in `plugins/relay-panel/hooks/packs/`, implementing `Pack` from `packs/types.ts`. The panel draws only through the registry. Scope pack CSS under `.p-<id>`.
- UI copy is sentence case.
- Anything drawn is verified by rendering it and looking at it, not by tests alone.
- Check: `claude plugin validate .` and `claude plugin validate plugins/<name>`; tests: `claude plugin test plugins/relay-panel`.
- No push until the owner asks.
