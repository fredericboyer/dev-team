# ADR-025: Project-specific customization in .claude/
Date: 2026-03-25
Status: accepted
Supersedes: parts of ADR-003, ADR-006

## Context

dev-team installs its product files (agents, hooks, skills, memory) into `.dev-team/`. Claude Code's own configuration lives in `.claude/` (settings.json, hooks/, skills/). Initially, all hooks were installed to `.dev-team/hooks/` and referenced from `.claude/settings.json`, with no distinction between product hooks and project-specific hooks.

ADR-003 (cross-platform Node.js hooks) established that hooks live in `.dev-team/hooks/`. ADR-006 (CLI over plugin) established that all files are user-owned and editable. However, as projects adopted dev-team, a need emerged for project-specific hooks and skills that should NOT be overwritten by `dev-team update`.

Examples: a Copilot merge gate hook (project-specific GitHub integration), custom deployment skills, team-specific review workflows. These are project customizations, not product features.

## Decision

Establish a clear two-directory convention:

- **`.dev-team/`** — Product install. Contains agents, framework hooks, framework skills, agent memory, and learnings. Managed by `dev-team init` and `dev-team update`. Files here may be overwritten on update (except memory and learnings).

- **`.claude/`** — Project customization. Contains `settings.json` (hook config, merged additively), plus project-specific hooks in `.claude/hooks/` and project-specific workflow skills in `.claude/skills/`. Files here are never overwritten by `dev-team update`.

Project-specific hooks are registered in `.claude/settings.json` alongside product hooks. The settings merge is additive — `dev-team update` adds new product hook entries but never removes user-added entries.

## Consequences

- Clear ownership boundary: `.dev-team/` = product, `.claude/` = project
- Project-specific customizations survive `dev-team update` without backup/restore
- Teams can add hooks and skills in `.claude/` with confidence they won't be overwritten
- Template CLAUDE.md documents this convention for all installed projects
- `.claude/settings.json` is the shared junction point — both product and project hooks are registered there
