# ADR-014: Runtime auto-discovery of skills and hooks

Date: 2026-03-22
Status: accepted

## Context

The init and update commands originally used hardcoded arrays for skill directories (`SKILL_DIRS`) and agent/hook mappings (`AGENT_FILES`, `HOOK_FILES`). Adding a new skill, agent, or hook required updating code in multiple places — creating the template file AND updating the hardcoded list.

This caused drift: the update command's hardcoded maps missed agents added in v0.2/v0.3 (Docs, Architect, Release, Lead, Watch list).

## Decision

Eliminate hardcoded lists in favor of runtime discovery:

1. **Skills**: `listSubdirectories(templates/skills/)` at runtime instead of hardcoded `SKILL_DIRS`
2. **Agents/hooks in update.ts**: derived from `ALL_AGENTS` and `QUALITY_HOOKS` imported from `init.ts` (single source of truth)
3. **New `listSubdirectories()` utility** in `files.ts` for reuse

Adding a new skill now requires only: create `templates/skills/<name>/SKILL.md`. No code changes.

Adding a new agent requires only: add to `ALL_AGENTS` in `init.ts`. The update command inherits it automatically.

## Consequences

- Zero-maintenance extensibility for skills
- Single source of truth for agent and hook definitions
- No manifest files to maintain
- Runtime directory scanning adds negligible overhead (single `readdirSync` call)
- Skills directory names must follow convention (`dev-team-<name>`)
