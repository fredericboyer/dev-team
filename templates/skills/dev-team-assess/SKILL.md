---
name: dev-team:assess
description: Audit the health of your project's dev-team knowledge base — learnings, agent memory, and CLAUDE.md. Finds stale entries, contradictions, enforcement gaps, and promotion opportunities. Use periodically or after major changes.
---

Assess the health of the dev-team knowledge base for: $ARGUMENTS

## Scope

This skill audits **only update-safe files** — files that survive `dev-team update`:

- `.dev-team/learnings.md` — shared project learnings
- `.dev-team/agent-memory/*/MEMORY.md` — per-agent calibration memory
- Project `CLAUDE.md` — project instructions (content outside `<!-- dev-team:begin/end -->` markers)

**NEVER modify** agent definitions (`.dev-team/agents/`), hook scripts (`.dev-team/hooks/`), skill definitions (`.dev-team/skills/`), or settings (`.claude/settings.json`). These are managed by templates and get overwritten on `dev-team update`.

## Setup

1. Read the following files to build a complete picture:
   - `.dev-team/learnings.md`
   - All `.dev-team/agent-memory/*/MEMORY.md` files (use Glob to discover them)
   - The project's `CLAUDE.md` (root of repo)
   - `.dev-team/config.json` (to know which agents are installed)

2. If `$ARGUMENTS` specifies a focus area (e.g., "learnings", "memory", "claude.md"), scope the audit to that area only. Otherwise, audit all three.

## Phase 1: Learnings audit (`.dev-team/learnings.md`)

Check for:

### Staleness
- Entries that reference removed files, deprecated patterns, or old tool versions
- Entries contradicted by current code (e.g., "We use Express" when the codebase uses Fastify)
- Date-stamped entries older than 6 months without recent revalidation

### Contradictions
- Entries that contradict each other (e.g., one says "always use snake_case" and another says "we adopted camelCase")
- Entries that contradict the project's `CLAUDE.md` instructions
- Entries that contradict agent memory files

### Enforcement gaps
- Learnings that state a rule but have no corresponding hook, linter rule, or agent check to enforce it
- Learnings about process that are not reflected in `CLAUDE.md`

### Promotion opportunities
- Learnings that are mature enough to become formal project instructions in `CLAUDE.md`
- Learnings that should be elevated to an ADR in `docs/adr/`
- Learnings that are really agent-specific calibration and should move to the appropriate agent's `MEMORY.md`

## Phase 2: Agent memory audit (`.dev-team/agent-memory/*/MEMORY.md`)

Check each agent's memory file for:

### Empty or boilerplate files
- Memory files that are empty or contain only the initial template header
- Agents that have been active (based on learnings references or git history) but have no memory entries

### Staleness
- Memory entries that reference files, patterns, or decisions that no longer exist
- Calibration notes about overruled findings when the underlying code has since changed
- Entries that duplicate what is already in `.dev-team/learnings.md` (should be deduplicated)

### Inconsistencies
- Agent memory that contradicts `.dev-team/learnings.md`
- Agent memory that contradicts another agent's memory (e.g., Szabo says "auth uses sessions" but Voss says "auth uses JWT")
- Agent memory that contradicts `CLAUDE.md`

### Coverage gaps
- Installed agents (from `config.json`) with no meaningful memory — suggests the agent has not been calibrated
- Agents referenced in learnings but missing a memory file

## Phase 3: CLAUDE.md audit

Check the project's `CLAUDE.md` for:

### Accuracy
- Instructions that do not match actual project behavior (verify claims against code)
- Workflow descriptions that reference tools, commands, or patterns not present in the repo
- Agent descriptions or hook triggers that are outdated

### Completeness
- Important patterns from `.dev-team/learnings.md` that should be in `CLAUDE.md` but are not
- Missing sections that a new developer would need (build commands, test commands, architecture overview)
- Installed agents or hooks not mentioned in `CLAUDE.md`

### Staleness
- Content outside the `<!-- dev-team:begin/end -->` markers that references old patterns
- References to removed dependencies, deprecated APIs, or old file paths

### Learnings promotion
- Mature learnings that have been stable for multiple sessions and should be promoted to `CLAUDE.md` instructions

## Report

Produce a structured health report:

### Executive summary

One paragraph: overall knowledge base health, number of issues found by severity.

### Findings by area

For each area (learnings, agent memory, CLAUDE.md), list findings using classified severity:

```
**[DEFECT]** area — description
Concrete impact: what goes wrong if this is not fixed.
Suggested fix: specific action to take.
```

```
**[RISK]** area — description
Why this matters and what could go wrong.
```

```
**[SUGGESTION]** area — description
Specific improvement with expected benefit.
```

### Cross-cutting issues

Issues that span multiple files:
- Contradictions between learnings and agent memory
- Information that exists in the wrong file
- Patterns documented in multiple places with divergent descriptions

### Recommended actions

Numbered list of concrete actions, ordered by priority:

1. **Fix [DEFECT] items** — these represent actively wrong information
2. **Address [RISK] items** — these will cause problems soon
3. **Consider [SUGGESTION] items** — these improve overall health

For each action, specify which file to edit and what change to make.

### Health score

Provide a simple health score:

| Area | Status | Issues |
|------|--------|--------|
| Learnings | healthy / needs attention / unhealthy | count by severity |
| Agent Memory | healthy / needs attention / unhealthy | count by severity |
| CLAUDE.md | healthy / needs attention / unhealthy | count by severity |
| **Overall** | **status** | **total** |

Thresholds:
- **Healthy**: 0 defects, 0-2 risks
- **Needs attention**: 0 defects, 3+ risks OR 1 defect
- **Unhealthy**: 2+ defects

## Completion

After the health report is delivered:
1. Spawn **@dev-team-borges** (Librarian) to review memory freshness and capture any learnings from the assessment findings. This is mandatory.
2. Include Borges's recommendations in the final report.

## When to run

- **Periodically** — monthly or after a burst of activity
- **After major refactors** — code changes may invalidate learnings
- **Before onboarding** — ensure the knowledge base is accurate for new team members
- **After resolving many review findings** — learnings and memory may need cleanup
- **On request** — `/dev-team:assess`
