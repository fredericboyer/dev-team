---
name: dev-team:review
description: Orchestrated multi-agent parallel review. Use to review a PR, branch, or set of changes with multiple specialist agents simultaneously. Spawns agents based on changed file patterns and produces a unified review summary.
---

Run a multi-agent parallel review of: $ARGUMENTS

## Setup

1. Determine what to review:
   - If a PR number or branch is given, use `git diff` to get the changed files
   - If a directory or file pattern is given, review those files
   - If no argument, review all uncommitted changes (`git diff HEAD`)

2. Categorize changed files by domain to determine which agents to spawn:

| File pattern | Agent | Reason |
|---|---|---|
| `auth`, `login`, `password`, `token`, `session`, `crypto`, `secret`, `permission`, `oauth`, `jwt`, `cors`, `csrf` | @dev-team-szabo | Security surface |
| `/api/`, `/routes/`, `schema`, `.graphql`, `.proto`, `openapi` | @dev-team-mori | API/UI contract |
| `docker`, `.env`, `config`, `migration`, `database`, `.sql`, `deploy` | @dev-team-voss | Infrastructure |
| `.github/workflows`, `.dev-team/`, `tsconfig`, `eslint`, `prettier`, `package.json` | @dev-team-deming | Tooling |
| `readme`, `changelog`, `.md`, `/docs/` | @dev-team-tufte | Documentation |
| `/adr/`, `architecture`, `/core/`, `/domain/` | @dev-team-brooks | Architecture |
| `package.json`, `version`, `changelog`, release workflows | @dev-team-conway | Release artifacts |
| Any `.js`, `.ts`, `.py`, `.go`, `.java`, `.rs` (non-test) | @dev-team-knuth | Quality/coverage |

3. Always include @dev-team-szabo and @dev-team-knuth — they review all code changes.

## Pre-review validation

Before spawning reviewers, verify the changes are reviewable:
1. **Non-empty diff**: The diff contains actual changes to review. If empty, report "nothing to review" and stop.
2. **Tests pass**: If the project has a test command, confirm tests pass. Flag test failures in the review report header.

## Execution

1. Spawn each selected agent as a **parallel background subagent** using the Agent tool with `subagent_type: "general-purpose"`.

2. Each agent's prompt must include:
   - The agent's full definition (read from `.dev-team/agents/<agent>.md`)
   - The list of changed files relevant to their domain
   - Instruction to produce classified findings: `[DEFECT]`, `[RISK]`, `[QUESTION]`, `[SUGGESTION]`
   - Instruction to read the actual code — not just the diff — for full context

3. Wait for all agents to complete.

## Filter findings (judge pass)

Before producing the report, filter raw findings to maximize signal quality:
1. **Remove contradictions**: Drop findings that contradict existing ADRs (`docs/adr/`), learnings (`.dev-team/learnings.md`), or agent memory (`.dev-team/agent-memory/*/MEMORY.md`)
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

### Security preamble

Before starting the review, check for open security alerts: run `/dev-team:security-status` if available, or use the project's security monitoring tools. Flag any critical findings in the review report.

### Completion

After the review report is delivered:
1. You MUST spawn **@dev-team-borges** (Librarian) as the final step. Pass Borges the **finding outcome log**: every finding with its classification, source agent, and outcome (accepted/overruled/ignored), including reasoning for overrules. Borges will:
   - **Extract structured memory entries** from the review findings (each classified finding becomes a memory entry for the reviewer who produced it)
   - **Reinforce accepted patterns** and **record overruled findings** for reviewer calibration
   - **Generate calibration rules** when 3+ findings on the same tag are overruled
   - **Record metrics** to `.dev-team/metrics.md`
   - Write entries to each participating agent's MEMORY.md using the structured format
   - Update shared learnings in `.dev-team/learnings.md`
   - Check cross-agent coherence
2. If Borges was not spawned, the review is INCOMPLETE.
3. **Memory formation gate**: After Borges runs, verify that each participating reviewer's MEMORY.md contains at least one new structured entry from this review.
4. Include Borges's recommendations in the final report.
