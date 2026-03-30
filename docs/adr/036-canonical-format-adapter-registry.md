# ADR-036: Canonical agent definition format and multi-runtime adapter registry
Date: 2026-03-30
Status: accepted

## Context

dev-team targets Claude Code exclusively. Its agent definitions use Markdown with YAML frontmatter — a format richer than any competing standard (AGENTS.md is unstructured Markdown with no frontmatter, no multi-agent support, and no metadata).

The v2.0 vision (see research briefs #264, #508) calls for multi-runtime support. The key insight from research is that the current dev-team format is already the canonical superset: it contains portable fields (name, description, instruction body) that any runtime can consume, plus runtime-specific fields (tools, model, memory) that only capable runtimes use.

The init.ts and update.ts modules contain inline agent copy logic (lines ~310-330 and ~490-545 respectively). Adding more runtimes would require duplicating this logic per runtime, bloating both modules.

## Decision

### 1. The canonical format IS the current format

No migration needed. `templates/agents/*.md` with YAML frontmatter (name, description, tools, model, memory) + Markdown body = the canonical schema. A TypeScript interface (`CanonicalAgentDefinition`) describes the parsed structure with fields classified as:

- **Portable** (`PortableFields`): `name`, `description`, `body` — universally meaningful across all agent runtimes
- **Runtime-specific** (`RuntimeSpecificFields`): `tools`, `model`, `memory` — meaningful only on runtimes that support the capability

### 2. Adapter registry pattern

A `RuntimeAdapter` interface defines `generate()` and `update()` methods. Adapters are registered in a central registry. init.ts and update.ts iterate registered adapters instead of containing inline copy logic.

The Claude Code adapter is an identity transform — it copies .md files as-is, preserving exact backward compatibility.

### 3. Runtime configuration

The `runtimes` field in config.json (default: `["claude"]`) controls which adapters run during init and update. The `--runtime` CLI flag sets this at init time.

## Consequences

### Easier
- Adding a new runtime adapter (Codex CLI, Copilot, Cursor) requires only implementing `RuntimeAdapter` and registering it — no changes to init.ts or update.ts
- Templates remain untouched — the current format is canonical
- Backward compatible — existing installations see no behavior change (default runtime is "claude", adapter is identity transform)

### Harder
- Agent file parsing adds a layer of indirection (frontmatter parsing) that wasn't previously needed for the Claude Code path
- Adapters must handle edge cases per-runtime (file naming, directory structure, metadata stripping)
- Testing matrix grows per-adapter
