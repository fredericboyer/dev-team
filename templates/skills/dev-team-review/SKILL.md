---
name: dev-team:review
description: Orchestrated multi-agent parallel review. Use to review a PR, branch, or set of changes with multiple specialist agents simultaneously. Spawns agents based on changed file patterns and produces a unified review summary.
disable-model-invocation: true
---

Run a multi-agent parallel review of: $ARGUMENTS

## Invocation modes

This skill supports two invocation modes:

- **Standalone** (user calls `/dev-team:review` directly): Full review lifecycle including the Completion section (finding outcome log + `/dev-team:extract`).
- **Embedded** (called by `/dev-team:task` during Step 2): Produce the review report and return findings to the caller. **Skip the Completion section entirely** — the task skill handles finding routing, iteration, and extraction in its own Steps 2 and 4. When called with the flag `--embedded`, operate in embedded mode.

In embedded mode, the review skill's output is consumed programmatically by the task skill. The report format is identical in both modes.

## Setup

1. Determine what to review:
   - If a PR number or branch is given, use `git diff` to get the changed files
   - If a directory or file pattern is given, review those files
   - If no argument, review all uncommitted changes (`git diff HEAD`)

2. Categorize changed files by domain to determine which agents to spawn. File-pattern-to-agent routing follows `.dev-team/hooks/agent-patterns.json` — the same patterns used by the post-change-review and review-gate hooks. Read that file to map changed files to the appropriate specialist agents.

3. **Always-on reviewers** (spawn regardless of file patterns):
   - **@dev-team-szabo** — always included (security review)
   - **@dev-team-knuth** — included for any non-test code changes (quality/coverage)
   - **@dev-team-brooks** — included for any non-test code changes (architecture)
   - **@dev-team-beck** — included for test-only changes (test quality)

## Pre-review validation

Before spawning reviewers, verify the changes are reviewable:
1. **Non-empty diff**: The diff contains actual changes to review. If empty, report "nothing to review" and stop.
2. **Tests pass**: If the project has a test command, confirm tests pass. Flag test failures in the review report header.

## Security preamble

Before starting the review, check for open security alerts using the project's security monitoring process (e.g., a `/security-status` skill or CLAUDE.md guidance). If no such process or tooling is available, note this explicitly in the review report and proceed with a manual review of security-sensitive changes. Flag any critical findings in the review report.

## Execution

1. Spawn each selected agent as a **parallel background subagent** using the Agent tool with `subagent_type: "general-purpose"`. Use the agent teammate naming convention: `{agent}-review` (e.g., `szabo-review`, `knuth-review`, `brooks-review`). **Timeout**: If a reviewer has not reported progress (status file or message) within 3 minutes, send a status ping. If no response within 1 additional minute, terminate the reviewer and proceed with findings from the other reviewers.

2. Each agent's prompt must include:
   - The agent's full definition (read from `.dev-team/agents/<agent>.md`)
   - The list of changed files relevant to their domain
   - Instruction to produce classified findings: `[DEFECT]`, `[RISK]`, `[QUESTION]`, `[SUGGESTION]`
   - Instruction to read the actual code — not just the diff — for full context

3. Wait for all agents to complete.

## Filter findings (judge pass)

Before producing the report, filter raw findings to maximize signal quality:
1. **Remove contradictions**: Drop findings that contradict existing ADRs (`docs/adr/`), learnings (`.claude/rules/dev-team-learnings.md`), or agent memory (`.dev-team/agent-memory/*/MEMORY.md`)
2. **Deduplicate**: When multiple agents flag the same issue, keep the most specific finding
3. **Consolidate suggestions**: Group `[SUGGESTION]`-level items into a single summary block
4. **Suppress generated file findings**: Skip findings on generated, vendored, or build artifacts
5. **Validate DEFECTs**: Each `[DEFECT]` must include a concrete scenario — downgrade to `[RISK]` if not
6. **Accept silence**: "No substantive findings" from a reviewer is a valid positive signal — do not request re-review

Log filtered findings in a "Filtered" section for calibration tracking.

## Report

Produce a unified review summary:

### Blocking findings ([DEFECT])

List all `[DEFECT]` findings from all agents. These must be resolved before merge.

Format each as:
```
**[DEFECT]** @agent-name — file:line
Description of the defect and why it blocks.
```

### Advisory findings

Group by severity:
- **[RISK]** — likely failure modes
- **[QUESTION]** — decisions needing justification
- **[SUGGESTION]** — specific improvements

### Filtered

List findings removed during the judge pass, with the reason for filtering:
```
**Filtered** @agent-name — reason (contradicts ADR-NNN / duplicate of above / no concrete scenario / generated file)
Original finding summary.
```

### Verdict

- **Approve** — No `[DEFECT]` findings. Advisory items noted.
- **Request changes** — `[DEFECT]` findings must be resolved.

State the verdict clearly. List what must be fixed for approval if requesting changes.

### Platform detection

Before issuing any `gh issue`, `gh pr`, or other platform-specific CLI commands, check `.dev-team/config.json` for the `platform` and `issueTracker` fields. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`, `"other"`), adapt issue tracker and PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI for the configured platform. If `platform` is absent from config.json, default to `"github"`. The steps in this skill assume GitHub by default.

### Completion

**Standalone mode only** (skip this section entirely when `--embedded` flag is present):

After the review report is delivered:
1. Format the **finding outcome log** with every finding's classification, source agent, and outcome (accepted/overruled/ignored), including reasoning for overrules. Then call `/dev-team:extract` with the formatted log.
2. If `/dev-team:extract` was not called, the review is INCOMPLETE.
3. `/dev-team:extract` handles Borges spawning, metrics verification, and memory formation gates. Do not report the review as complete until `/dev-team:extract` reports success.
4. Include Borges's recommendations in the final report.
