# ADR-037: MCP enforcement server

Date: 2026-03-30
Status: superseded — removed in v2.0.1; native runtime hooks (Copilot, Codex) replace MCP enforcement

## Context

dev-team enforces quality through Claude Code hooks — shell scripts that intercept tool use and block commits missing review evidence. This works well in the Claude Code runtime, but hooks are proprietary to Claude Code. The v2.0 multi-runtime vision (ADR-036, research briefs #264, #508) requires enforcement mechanisms that work across runtimes.

MCP (Model Context Protocol) is the emerging standard for tool integration across agent runtimes (see research brief #264). Every major runtime supports MCP: Claude Code, GitHub Copilot, Cursor, Windsurf, Codex CLI. An MCP server exposing dev-team's enforcement checks as tools would make them portable without rewriting them per-runtime.

## Decision

### 1. Transport: stdio with JSON-RPC 2.0

The MCP server uses stdio transport (JSON-RPC 2.0 over stdin/stdout). This is the simplest transport, supported by all MCP clients, and requires no network configuration. The server is started via `npx dev-team mcp`.

### 2. Zero dependencies: implement the protocol directly

Consistent with ADR-002 (zero npm dependencies), the JSON-RPC 2.0 protocol is implemented directly using Node.js built-ins (`readline` for input, `process.stdout` for output). The protocol is simple: each message is a JSON object on a single line. No MCP SDK dependency is needed.

### 3. Tool surface: start with `review_gate`

The prototype exposes a single tool — `review_gate` — that checks whether a file has the required review evidence before commit. This validates the architecture with a real enforcement check. The tool registry pattern allows adding more tools without modifying the server core.

### 4. Security: read-only checks, no mutation

All MCP tools are read-only. They check state (review sidecars, config files) but never modify the repository. This keeps the MCP server safe to run — it cannot corrupt state even if called incorrectly.

### 5. Lifecycle: CLI subcommand

`npx dev-team mcp` starts the server. MCP clients configure it as:

```json
{
  "mcpServers": {
    "dev-team": {
      "command": "npx",
      "args": ["dev-team", "mcp"]
    }
  }
}
```

## Consequences

### Easier

- Enforcement checks become portable across any MCP-capable runtime
- Adding new enforcement tools (lint-gate, test-gate, architecture-check) follows the same registry pattern
- No new dependencies — consistent with the zero-dependency constraint

### Harder

- Two code paths for the same logic: hooks (for Claude Code) and MCP tools (for all runtimes). Must keep them in sync.
- Stdio transport means one server instance per client session — no shared state between sessions
- MCP protocol implementation must be maintained as the spec evolves
