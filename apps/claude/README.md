# @bitcode/external-apps-claude

Bitcode plugins for Claude (V49 Claude External law C-5).

## Plugins

| Plugin | Path | For |
|---|---|---|
| `bitcode` | `apps/claude/` | Product use: remote MCP connector at `https://bitcode.exchange/api/mcp` (OAuth with your Bitcode account) + the `bitcode` usage skill |
| `bitcode-developer` | `apps/claude/developer/` | Monorepo development: hierarchy-aware operator skill, assistant agent, session hook, and the local stdio MCP server (`apps/mcp`, API key) |

```
claude/
├── .claude-plugin/plugin.json   # bitcode (product)
├── .mcp.json                    # { "type": "http", "url": ".../api/mcp" }
├── skills/bitcode/SKILL.md
└── developer/                   # bitcode-developer
    ├── .claude-plugin/plugin.json
    ├── .mcp.json                # stdio apps/mcp
    ├── skills/bitcode-operator/SKILL.md
    ├── agents/bitcode-assistant.md
    └── hooks/hooks.json
```

Components sit at each **plugin root**, not inside `.claude-plugin/` (Claude
Code layout law).

## Connect without the plugin

- **Claude.ai / Claude Desktop:** Settings → Connectors → Add custom connector →
  `https://bitcode.exchange/api/mcp`, then approve on Bitcode.
- **Claude Code:** `claude mcp add --transport http bitcode https://bitcode.exchange/api/mcp`,
  then `/mcp` to sign in.

Grants are listed (and revocable) in Bitcode → Auxillaries → Externals →
Claude. Bitcode never receives Anthropic credentials.

## Related

- ChatGPT App: `@bitcode/external-apps-chatgpt`
- Bitcode stdio MCP: `@bitcode/generic-mcps-bitcode` (`apps/mcp`)
- Hosted MCP + OAuth: `apps/uapi/app/api/mcp`, `apps/uapi/lib/oauth`
