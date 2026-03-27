---
name: dev-team:scorecard
description: Audit process conformance after a task loop completes. Checks Borges ran, findings acknowledged, metrics recorded, reviews executed, memory updated, and issues closed.
user_invocable: false
---

Audit process conformance for: $ARGUMENTS

## Setup

1. Determine the task to audit:
   - If a PR number is given, use `gh pr view <number>` to get the branch, issue references, and merge status
   - If a branch name is given, use `git log` to find the associated issue number from commit messages
   - If an issue number is given, search for the PR that closes it
   - If no argument, audit the most recent completed task (last merged PR or last entry in `.dev-team/metrics.md`)

2. Collect context:
   - The issue number and PR number
   - The branch name
   - The list of agents that participated (from `.dev-team/metrics.md` entry or PR body)
   - Whether a Brooks pre-assessment flagged an ADR requirement

## Platform detection

Before issuing any `gh issue`, `gh pr`, or other platform-specific CLI commands, check `.dev-team/config.json` for the `platform` and `issueTracker` fields. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`, `"other"`), adapt issue tracker and PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI for the configured platform. The checks below assume GitHub by default.

## Scorecard checks

Run each check and record pass/fail with evidence.

### 1. Borges ran

**Check**: Read `.dev-team/metrics.md` and search for an entry matching the task's issue number, PR number, or branch name.

- **Pass**: Entry exists with the task reference
- **Fail**: No matching entry found

### 2. All findings acknowledged

**Check**: Read the metrics entry and/or PR conversation for the finding outcome log. Every classified finding (`[DEFECT]`, `[RISK]`, `[QUESTION]`, `[SUGGESTION]`) must have an explicit outcome: `fixed`, `accepted`, `deferred`, `overruled`, or `ignored`.

- **Pass**: All findings have an explicit outcome
- **Fail**: One or more findings have no recorded outcome (list them)

### 3. Metrics recorded

**Check**: The `.dev-team/metrics.md` entry includes calibration data: agents involved, findings per agent with classification, acceptance rate, and rounds to convergence.

- **Pass**: Entry contains all required fields (Agents, Findings, Acceptance rate, Rounds)
- **Fail**: Entry is missing required fields (list which ones)

### 4. Review wave executed

**Check**: The metrics entry shows at least one review round with classified findings from reviewer agents.

- **Pass**: At least one review wave with findings from 1+ reviewers
- **Fail**: No review wave recorded, or findings section is empty

### 5. Memory updated

**Check**: For each agent listed as a participant in the metrics entry, read `.dev-team/agent-memory/<agent>/MEMORY.md` and verify it contains at least one entry dated on or after the task completion date, or referencing the task's issue/PR number.

- **Pass**: All participating agents have a relevant memory entry
- **Fail**: One or more agents have no memory entry from this task (list them)

### 6. ADR written (conditional)

**Check**: If the PR body or commit messages mention "ADR" or "Write ADR-NNN", verify the corresponding file exists in `docs/adr/`.

- **Pass**: ADR file exists, or no ADR was required
- **Fail**: ADR was flagged as needed but the file does not exist
- **Skip**: No ADR requirement detected

### 7. Issue closed

**Check**: Use `gh issue view <number> --json state` to verify the referenced issue is closed.

- **Pass**: Issue state is "CLOSED"
- **Fail**: Issue is still open

## Report

Produce a structured scorecard:

```
## Process Scorecard: <issue/PR reference>

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Borges ran | PASS/FAIL | metrics.md entry found/missing |
| 2 | Findings acknowledged | PASS/FAIL | N/N findings with outcomes |
| 3 | Metrics recorded | PASS/FAIL | all fields present / missing: X, Y |
| 4 | Review wave executed | PASS/FAIL | N rounds, N reviewers |
| 5 | Memory updated | PASS/FAIL | N/N agents with entries |
| 6 | ADR written | PASS/FAIL/SKIP | ADR-NNN exists / not required |
| 7 | Issue closed | PASS/FAIL | issue #NNN state |

**Score: N/M** (skipped checks excluded from denominator)

### Recommended fixes
(Only if any checks failed — list specific actions to remediate each failure)
```

## Completion

After the scorecard is delivered:
1. If any checks failed, recommend specific remediation steps.
2. If all checks passed, acknowledge clean process conformance.
3. Do NOT spawn Borges — this is a read-only audit skill that does not produce findings requiring memory extraction.
