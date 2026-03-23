# ADR-016: Custom agent scaffolding via create-agent command
Date: 2026-03-22
Status: accepted

## Context
Teams need domain-specific agents beyond the built-in 10 (e.g., database specialist, performance engineer, compliance auditor). Creating an agent from scratch requires understanding the frontmatter format, body structure, memory template, and naming conventions.

## Decision
Add `npx dev-team create-agent <name>` that:

1. Sanitizes the name (lowercase, special chars → hyphens, adds `dev-team-` prefix)
2. Creates `.claude/agents/dev-team-<name>.md` with a template containing all required sections (frontmatter, how-you-work, focus areas, challenge style, challenge protocol, learning)
3. Creates `.claude/agent-memory/dev-team-<name>/MEMORY.md` with the standard memory template
4. Refuses to overwrite existing agents (exit 1)
5. Prints next steps pointing to `docs/custom-agents.md`

A comprehensive authoring guide (`docs/custom-agents.md`) provides format reference, a blank template, memory management best practices, and a worked example (database specialist "Codd").

## Consequences
- Low friction for team-specific agents — scaffold + customize vs. write from scratch
- Template enforces consistent structure across all agents (built-in and custom)
- The guide serves as documentation for the agent format itself
- Custom agents are first-class citizens — watch lists (ADR-011) and Lead (ADR-015) can reference them
- No validation that custom agent frontmatter is well-formed (tracked for future improvement)
