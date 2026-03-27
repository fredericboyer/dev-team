---
name: dev-team:retro
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
   - `.dev-team/metrics.md` (if it exists — calibration metrics log)

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

## Phase 1b: Process file audit (`.dev-team/process.md`)

Check `.dev-team/process.md` for:

### Staleness
- References to agent names, hook scripts, or workflow steps that no longer exist
- Orchestration rules that describe removed or renamed commands
- References to old file paths, deprecated tools, or outdated conventions

### Contradictions
- Rules that conflict with `.dev-team/learnings.md` (e.g., process says "sequential reviews" but learnings say "parallel reviews")
- Instructions that contradict the project's `CLAUDE.md`
- Workflow descriptions that disagree with actual hook or agent behavior

### Completeness
- Workflow rules documented in `.dev-team/learnings.md` that describe process but are missing from `process.md`
- Orchestration patterns that agents follow in practice but are not documented here
- Missing sections that a new agent or developer would need to understand the workflow

### Accuracy
- Verify orchestration claims against actual agent definitions in `.dev-team/agents/`
- Verify hook trigger descriptions against actual hook scripts in `.dev-team/hooks/`
- Verify naming conventions and parallel execution rules against observed behavior in recent git history

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

### Memory promotion opportunities
- Scan each agent's `MEMORY.md` for entries that describe project-wide patterns, conventions, or rules rather than agent-specific calibration
- Examples of promotable entries: "all API endpoints require rate limiting" (Szabo), "we always use transactions for multi-table writes" (Voss), "components must support keyboard navigation" (Mori)
- Examples of non-promotable entries: "I tend to over-flag SQL injection in parameterized queries" (agent-specific calibration), "coverage is weak in the parser module" (agent-specific observation)
- Flag entries that would benefit other agents if promoted to `.dev-team/learnings.md`
- Classify each as `[SUGGESTION]` with the specific entry text and recommended shared learning wording
- After an entry is promoted to shared learnings, the original agent memory entry should be removed or replaced with a cross-reference to avoid the duplication that the Staleness check flags

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

### Instruction surface health
- Count lines in the CLAUDE.md managed section (between `<!-- dev-team:begin -->` and `<!-- dev-team:end -->` markers) — flag as `[RISK]` if over 100 lines
- Scan `.dev-team/learnings.md` for entries that describe information discoverable from code or config files (e.g., tech stack, project structure, framework choices) — flag each for removal
- Report a "discoverable content ratio": number of flagged entries / total entries

## Phase 4: Calibration metrics audit (`.dev-team/metrics.md`)

If `.dev-team/metrics.md` exists and contains entries, analyze:

### Acceptance rates per agent
- Calculate rolling acceptance rate (last 10 entries) for each reviewer agent
- Flag agents with acceptance rate below 50% — they may be generating more noise than signal
- Identify trend direction: improving, stable, or degrading

### Signal quality
- Are DEFECT findings being overruled frequently? This suggests over-flagging
- Are SUGGESTION findings dominating? This suggests agents are not calibrated to the project's conventions
- Are review rounds consistently high (3+)? This suggests systemic quality issues or miscalibrated reviewers

### Deferred findings follow-through
- Scan all entries for findings with outcome `deferred` — these are findings accepted but deferred to a follow-up issue
- For each deferred finding, extract the tracking reference from the Reason column (e.g., "Tracked in #999")
- **Issue tracker detection:** Check `.dev-team/config.json` or `CLAUDE.md` for the project's issue tracker type (GitHub Issues, Jira, Linear, or None). The verification steps below assume GitHub Issues — if the project uses a different tracker, perform the equivalent lookup in that system (e.g., Jira JQL search, Linear API query). If no external tracker is configured, flag all deferred findings for manual audit instead.
- If the Reason column contains an issue reference (e.g., "Tracked in #999"), strip the `#` prefix before passing to the CLI — `"Tracked in #999"` means run `gh issue view 999`, not `gh issue view #999`
- Verify the issue exists and is tracked: use `gh issue list --state all --search "<issue number or summary>"` so that both open and closed issues count as valid tracking (a deferred finding whose issue was already resolved should not be flagged as untracked)
- If the Reason column does NOT contain an issue number, search for a matching issue using `gh issue list --state all --search "<finding summary>"` and check if any issue (open or closed) corresponds to the deferred finding
- Flag each deferred finding with no corresponding issue as:
  ```
  **[RISK]** Metrics — Deferred finding has no tracking issue: "<finding summary>" (from <agent>, <date>)
  The review process accepted this deferral on the promise of a follow-up issue, but none was created. The finding is untracked.
  ```
- Report the conversion rate in the executive summary: "N/M deferred findings have tracking issues"

### Delegation patterns
- Which implementing agents are used most frequently?
- Are reviewers consistently finding issues in specific domains? This may indicate an implementing agent needs calibration

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
| Process | healthy / needs attention / unhealthy | count by severity |
| Agent Memory | healthy / needs attention / unhealthy | count by severity |
| CLAUDE.md | healthy / needs attention / unhealthy | count by severity |
| Metrics | healthy / needs attention / unhealthy | count by severity |
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
- **On request** — `/dev-team:retro`
