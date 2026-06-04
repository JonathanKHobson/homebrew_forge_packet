# MCP Config Examples

The Homebrew Forge app should not depend on MCP to render cards. MCP is useful for Codex/assistant workflows that compare custom cards against official Magic data.

## Suggested split

- App: local deterministic cache from Scryfall/MTGJSON.
- Codex: optional MTG MCP server for card/rules lookup.
- Renderer/exporter: no MCP dependency.

## Example use cases

```text
Ask MCP: Find cards with wording similar to "Whenever you sacrifice an artifact".
Ask MCP: Compare this custom card to official cards around mana value 3.
Ask MCP: Find all official cards with keyword "Crew" and WUR color identity.
```

## Guardrail

Codex should never rewrite card data directly from an MCP response without updating CSV/YAML and running validation.
