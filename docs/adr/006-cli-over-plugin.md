# ADR-006: CLI installer first, plugin later
Date: 2026-03-22
Status: accepted

## Context
Claude Code supports two distribution mechanisms:
- **Plugins**: Installed via marketplace, cached in `~/.claude/plugins/cache/` (read-only), auto-namespaced, auto-updated
- **CLI installer**: Copies files directly to `.dev-team/agents/`, `.dev-team/hooks/`, etc. (user-owned, editable)

Users need to be able to:
- Edit agent personas (tweak obsessions, change tools, adjust personality)
- Add custom agents that follow the same challenge protocol
- Remove agents they don't need
- Modify hooks to fit their workflow

## Decision
Build the CLI installer (`npx dev-team init`) as the primary distribution mechanism. Files are copied into the project and owned by the user.

Plugin distribution is a future addition — either as a managed "auto-update" mode or with a `dev-team-eject` command that copies files locally for editing.

## Consequences
- Users can customize everything immediately after install
- No marketplace dependency for initial adoption
- No automatic updates — users run `npx dev-team init` again to upgrade (with idempotent merge)
- Must handle existing files gracefully (overwrite prompts, marker-based CLAUDE.md merging)
- Plugin can be added later without changing the file structure
