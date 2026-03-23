# ADR-009: Idempotent update command with auto-discovery
Date: 2026-03-22
Status: accepted

## Context
After initial installation via `npx dev-team init`, teams need a way to upgrade agents, hooks, and skills to newer versions without losing their customizations (agent memory, shared learnings, CLAUDE.md content).

Running `init` again prompts for everything and risks overwriting memory files.

## Decision
Add `npx dev-team update` that:
1. Reads `dev-team.json` preferences to know what's installed
2. Compares installed file content against package templates
3. Overwrites only files whose content has changed (agents, hooks, skills)
4. Auto-discovers new agents and hooks in templates not present in preferences
5. Never overwrites: agent memory files, shared learnings, CLAUDE.md content outside markers

Agent/hook maps are derived from `init.ts` exports (`ALL_AGENTS`, `QUALITY_HOOKS`) — single source of truth, no duplication. Skill directories are discovered at runtime via `listSubdirectories()`.

## Consequences
- Safe, repeatable upgrades that preserve team knowledge
- Adding a new agent/hook/skill to templates automatically makes it available on update
- No version migration logic yet (tracked as future work)
- Settings.json is merged additively — user-added hooks are never removed
