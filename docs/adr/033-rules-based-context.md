# ADR-033: Rules-based context for shared files

Date: 2026-03-26
Status: accepted

## Context

Agents need shared context (project learnings, process rules) to make informed decisions. Previously, this was achieved through explicit "read `.dev-team/learnings.md`" and "read `.dev-team/process.md`" instructions in every agent definition and the SHARED.md protocol.

Claude Code rules (`.claude/rules/*.md`) are loaded automatically by all agents, including subagents and agent teams. Per official docs: "Rules are additive with CLAUDE.md. Neither subagents nor agent teams inherit the parent's conversation history — rules are the primary mechanism for shared behavioral context across agents."

This means explicit read instructions in agent definitions are redundant boilerplate. Moving shared context files to `.claude/rules/` eliminates this boilerplate and ensures consistent context loading across all agent invocation patterns.

## Decision

Move `process.md` and `learnings.md` from `.dev-team/` to `.claude/rules/`:

- `.dev-team/learnings.md` → `.claude/rules/dev-team-learnings.md`
- `.dev-team/process.md` → `.claude/rules/dev-team-process.md`

Agent definitions replace explicit read instructions with: "Shared context (learnings, process) is loaded automatically via `.claude/rules/`."

The `update` command includes a migration that moves files from old paths to new paths automatically.

Files that stay in `.dev-team/`:

- `agent-memory/` — per-agent calibration (not shared context)
- `metrics.md` — appendable log (not behavioral context)
- `config.json` — machine-readable config
- `agents/`, `hooks/`, `skills/` — managed templates

## Consequences

**Easier:**

- Agents get shared context automatically without explicit read instructions
- Agent definitions are simpler — less boilerplate
- New agent invocation patterns (agent teams, subagents) get context without code changes
- Consistent behavior regardless of how an agent is spawned

**Harder:**

- Existing installs need migration (handled by `update` command)
- `.claude/rules/` now contains dev-team managed files alongside user rules
- Files prefixed with `dev-team-` to avoid naming conflicts with user rules
