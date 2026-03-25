# ADR-024: Remove workflow-skills from templates
Date: 2026-03-25
Status: accepted
Supersedes: parts of ADR-009, ADR-010, ADR-014

## Context

dev-team originally shipped two workflow skills (`/dev-team:merge` and `/dev-team:security-status`) as part of the install templates. These skills assumed a specific GitHub-centric workflow (Copilot review gating, GitHub security features) that does not apply to all projects.

ADR-009 (idempotent update) treated all skills uniformly — the update command overwrote workflow skills alongside framework skills. ADR-010 (preset bundles) included workflow skills in preset definitions. ADR-014 (runtime auto-discovery) discovered all skills from `templates/skills/` without distinguishing framework from workflow.

In practice, workflow skills needed project-specific configuration (merge strategies, platform-specific API calls, security tool integration) that varied between projects. Shipping them as templates created friction: users had to edit shipped files, and `dev-team update` would overwrite their customizations.

## Decision

Remove workflow skills (`merge`, `security-status`) from `templates/skills/`. They are no longer installed by `dev-team init` or updated by `dev-team update`.

Projects that need these skills install them to `.claude/skills/` as project-specific customizations. The template CLAUDE.md documents this separation: `.dev-team/skills/` contains framework skills (shipped, updated), `.claude/skills/` contains project-specific workflow skills (user-owned, never overwritten).

Framework skills (challenge, task, review, audit, assess) remain in templates and are managed by dev-team.

## Consequences

- Framework skills are cleanly separated from project-specific workflow
- `dev-team update` no longer risks overwriting project workflow customizations
- Projects must explicitly install workflow skills they need (documented in template CLAUDE.md)
- Preset bundles no longer include workflow skills — they only configure agents and hooks
- Auto-discovery in `templates/skills/` now only finds framework skills
