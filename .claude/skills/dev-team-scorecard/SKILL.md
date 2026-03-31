---
name: dev-team:scorecard
description: Audit process conformance after a workflow completes (task, review, or audit). Checks Borges ran, findings acknowledged, metrics recorded, review executed, memory updated, and conditionally checks ADR written and issue closed.
user_invocable: false
---

Audit process conformance for: $ARGUMENTS

## Setup

1. Determine the workflow to audit:
   - If a PR number is given, use `gh pr view <number>` to get the branch, issue references, and merge status
   - If a branch name is given, use `git log` to find the associated issue number from commit messages
   - If an issue number is given, search for the PR that closes it
   - If no argument, audit the most recent completed workflow (last merged PR or last entry in `.dev-team/metrics.md`)

2. Detect the workflow type from the metrics entry or PR body:
   - **task** — iterative task loop (`/dev-team:task`): implementation + review waves + convergence
   - **review** — multi-agent review (`/dev-team:review`): review-only, no implementation phase
   - **audit** — codebase audit (`/dev-team:audit`): parallel audit agents, no implementation phase

3. Collect context:
   - The issue number and PR number (if applicable)
   - The branch name (if applicable)
   - The workflow type detected above
   - The list of agents that participated (from `.dev-team/metrics.md` entry or PR body)
   - Whether a Brooks pre-assessment flagged an ADR requirement (task workflows only)

4. Read `.claude/rules/dev-team-process.md` for project-specific process expectations (integration rules, release steps, review requirements). Use these to calibrate pass/fail thresholds.

## Platform detection

Before issuing any `gh issue`, `gh pr`, or other platform-specific CLI commands, check `.dev-team/config.json` for the `platform` and `issueTracker` fields. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`, `"other"`), adapt issue tracker and PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI for the configured platform. The checks below assume GitHub by default.

## Scorecard checks

Run each check and record pass/fail with evidence.

### 1. Borges ran (via `/dev-team:extract`)

**Check**: Borges memory extraction is invoked via `/dev-team:extract` at the end of orchestration workflows (`/dev-team:task`, `/dev-team:review`, `/dev-team:audit`, `/dev-team:retro`). The verification artifact is a `.dev-team/metrics.md` entry. Read `.dev-team/metrics.md` and search for an entry matching the workflow's issue number, PR number, or branch name.

- **Pass**: Entry exists with the workflow reference
- **Fail**: No matching entry found (Borges was not invoked, or `/dev-team:extract` was skipped)

### 2. All findings acknowledged

**Check**: Read the metrics entry and/or PR conversation for the finding outcome log. Every classified finding (`[DEFECT]`, `[RISK]`, `[QUESTION]`, `[SUGGESTION]`) must have an explicit outcome: `fixed`, `accepted`, `deferred`, `overruled`, or `ignored`.

- **Pass**: All findings have an explicit outcome
- **Fail**: One or more findings have no recorded outcome (list them)

### 3. Metrics recorded

**Check**: The `.dev-team/metrics.md` entry includes calibration data: agents involved, findings per agent with classification, acceptance rate, and rounds to convergence.

- **Pass**: Entry contains all required fields (Agents, Findings, Acceptance rate, Rounds)
- **Fail**: Entry is missing required fields (list which ones)

### 4. Review executed

**Check**: The metrics entry shows at least one review round with classified findings from reviewer agents.

- **Pass**: At least one review round with findings from 1+ reviewers
- **Fail**: No review recorded, or findings section is empty

### 5. Memory updated

**Check**: For each agent listed as a participant in the metrics entry, read `.claude/agent-memory/<agent>/MEMORY.md` and verify it contains at least one entry dated on or after the workflow completion date, or referencing the workflow's issue/PR number.

- **Pass**: All participating agents have a relevant memory entry
- **Fail**: One or more agents have no memory entry from this workflow (list them)

### 6. ADR written (conditional)

**Applies to**: task workflows only. Skip for review and audit workflows.

**Check**: If the PR body or commit messages mention "ADR" or "Write ADR-NNN", verify the corresponding file exists in `docs/adr/`.

- **Pass**: ADR file exists, or no ADR was required
- **Fail**: ADR was flagged as needed but the file does not exist
- **Skip**: No ADR requirement detected, or workflow type is review/audit

### 7. Issue closed (conditional)

**Applies to**: task workflows only. Skip for review and audit workflows (which may not have an associated issue).

**Check**: If an issue number is associated with the workflow, verify it is closed.

- **Pass**: Issue state is "CLOSED"
- **Fail**: Issue is still open
- **Skip**: No issue associated, or workflow type is review/audit

## Report

Produce a structured scorecard:

```
## Process Scorecard: <issue/PR/workflow reference>
**Workflow type**: task / review / audit

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Borges ran | PASS/FAIL | metrics.md entry found/missing |
| 2 | Findings acknowledged | PASS/FAIL | N/N findings with outcomes |
| 3 | Metrics recorded | PASS/FAIL | all fields present / missing: X, Y |
| 4 | Review executed | PASS/FAIL | N rounds, N reviewers |
| 5 | Memory updated | PASS/FAIL | N/N agents with entries |
| 6 | ADR written | PASS/FAIL/SKIP | ADR-NNN exists / not required / not applicable |
| 7 | Issue closed | PASS/FAIL/SKIP | issue #NNN state / not applicable |

**Score: N/M** (skipped checks excluded from denominator)

### Recommended fixes
(Only if any checks failed — list specific actions to remediate each failure)
```

## Completion

After the scorecard is delivered:
1. If any checks failed, recommend specific remediation steps.
2. If all checks passed, acknowledge clean process conformance.
3. Do NOT spawn Borges — this is a read-only audit skill that does not produce findings requiring memory extraction.
