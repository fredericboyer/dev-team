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
1. **Remove contradictions**: Drop findings that contradict existing ADRs, learnings, or agent memory
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

### Verdict

- **Approve** — No `[DEFECT]` findings. Advisory items noted.
- **Request changes** — `[DEFECT]` findings must be resolved.

State the verdict clearly. List what must be fixed for approval if requesting changes.

### Security preamble

Before starting the review, check for open security alerts: run `/dev-team:security-status` if available, or check `gh api repos/{owner}/{repo}/code-scanning/alerts?state=open` and `gh api repos/{owner}/{repo}/dependabot/alerts?state=open`. Flag any critical findings in the review report.

### Completion

After the review report is delivered:
1. You MUST spawn **@dev-team-borges** (Librarian) as the final step to review memory freshness and capture any learnings from the review findings. Do NOT skip this.
2. If Borges was not spawned, the review is INCOMPLETE.
3. **Borges memory gate**: If Borges reports that any participating agent's MEMORY.md is empty or contains only boilerplate, this is a **[DEFECT]** that blocks review completion. The agent must write substantive learnings before the review can be marked done.
4. Include Borges's recommendations in the final report.
