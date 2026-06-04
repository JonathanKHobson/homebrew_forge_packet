# Codex First Task Prompt

Read AGENTS.md and the docs in this packet. Then scaffold the Homebrew Forge repository.

Build only the first working vertical slice:

1. pnpm workspace.
2. TypeScript packages.
3. Zod schemas for set/card/card_face/art/export profile/asset pack.
4. CSV parser/writer.
5. Demo set with generic sample cards.
6. `forge validate --set DEMO`.
7. Debug asset pack.
8. Simple React/SVG card renderer using the debug pack.
9. Playwright headless render to PNG/JPG.
10. Cockatrice XML/image ZIP export.
11. Tests for schema, validation, render smoke, and XML output.

Do not build production frames. Do not scrape external sites. Do not use Black Panther/Wakanda/Shuri examples. Keep the project general-purpose.

After implementation, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
forge validate --set DEMO
forge render --set DEMO --profile cockatrice
forge export cockatrice --set DEMO --zip
```

If a command cannot be run because a dependency is missing, document the blocker and add the intended command to README.
