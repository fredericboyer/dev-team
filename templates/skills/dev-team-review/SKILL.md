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
| `auth`, `login`, `password`, `token`, `session`, `crypto`, `encrypt`, `decrypt`, `secret`, `permission`, `rbac`, `acl`, `oauth`, `jwt`, `cors`, `csrf`, `sanitiz`, `escap` | @dev-team-szabo | Security surface |
| `/api/`, `/route/`, `/routes/`, `/endpoint/`, `/endpoints/`, `schema`, `.graphql`, `.proto`, `openapi`, `swagger` | @dev-team-mori | API/UI contract |
| `docker`, `Dockerfile`, `docker-compose`, `.dockerignore`, `.env.example`, `env.template`, `deploy`, `terraform/`, `.tf`, `.tfvars`, `pulumi/`, `cloudformation/`, `helm`, `k8s`, `kubernetes`, `health-check`, `healthcheck`, `monitoring.yml`, `monitoring.yaml`, `monitoring.json`, `observability`, `otel`, `alerting.yml`, `alerting.yaml`, `alerting.json`, `logging.yml`, `logging.yaml`, `logging.json`, `.github/workflows`, `.gitlab-ci`, `jenkinsfile` | @dev-team-hamilton | Infrastructure |
| `.env`, `config`, `migration`, `database`, `.sql` | @dev-team-voss | Backend/data layer |
| `.github/workflows`, `.claude/`, `tsconfig`, `eslint`, `prettier`, `jest.config`, `vitest`, `.husky`, `package.json` | @dev-team-deming | Tooling |
| `readme`, `changelog`, `.md`, `.mdx`, `/docs/`, `api-doc`, `jsdoc`, `typedoc` | @dev-team-tufte | Documentation |
| `/adr/`, `architecture`, `/modules/`, `/layers/`, `/core/`, `/domain/`, `/shared/`, `/lib/`, `/plugins/`, `/middleware/`, `tsconfig`, `webpack`, `vite`, `rollup`, `esbuild` | @dev-team-brooks | Architecture |
| `package.json`, `pyproject.toml`, `cargo.toml`, `version`, `changelog`, `.npmrc`, `.npmignore`, `release.config`, `lerna.json`, release/publish/deploy workflows | @dev-team-conway | Release artifacts |
| `/components/`, `/pages/`, `/views/`, `/layouts/`, `/ui/`, `.css`, `.scss`, `.sass`, `.less`, `.jsx`, `.tsx`, `tailwind`, `styled` | @dev-team-rams | Design system compliance |
| `*.test.*`, `*.spec.*`, `__tests__/`, `/test/`, `/tests/` (code files only) | @dev-team-beck | Test quality |
| Any `.js`, `.ts`, `.py`, `.go`, `.java`, `.rs` (non-test) | @dev-team-knuth | Quality/coverage |

3. Always include @dev-team-szabo. For non-test code changes, also always include @dev-team-knuth and @dev-team-brooks; for test-only changes, ensure @dev-team-beck is included.

## Pre-review validation

Before spawning reviewers, verify the changes are reviewable:
1. **Non-empty diff**: The diff contains actual changes to review. If empty, report "nothing to review" and stop.
2. **Tests pass**: If the project has a test command, confirm tests pass. Flag test failures in the review report header.

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

Before starting the review, check for open security alerts using the project's security monitoring process (e.g., a `/security-status` skill or CLAUDE.md guidance). If no such process or tooling is available, note this explicitly in the review report and proceed with a manual review of security-sensitive changes. Flag any critical findings in the review report.

### Completion

After the review report is delivered:
1. You MUST spawn **@dev-team-borges** as `borges-extract` (Librarian) as the final step. Pass Borges the **finding outcome log**: every finding with its classification, source agent, and outcome (accepted/overruled/ignored), including reasoning for overrules. Borges will:
   - **Extract structured memory entries** from the review findings (each classified finding becomes a memory entry for the reviewer who produced it)
   - **Reinforce accepted patterns** and **record overruled findings** for reviewer calibration
   - **Generate calibration rules** when 3+ findings on the same tag are overruled
   - **Record metrics** to `.dev-team/metrics.md`
   - Write entries to each participating agent's MEMORY.md using the structured format
   - Update shared learnings in `.dev-team/learnings.md`
   - Check cross-agent coherence
2. If Borges was not spawned, the review is INCOMPLETE.
3. **Metrics completion gate**: Read `.dev-team/metrics.md` and verify it contains a new entry with the current review's PR number or branch name. A stale metrics file (no new entry) means Borges did not complete successfully. If metrics.md has no new entry after Borges reports completion, flag this as a system failure and re-run Borges with explicit instruction to record metrics.
4. **Memory formation gate**: After Borges runs, verify that each participating reviewer's MEMORY.md contains at least one new structured entry from this review.
5. Include Borges's recommendations in the final report.
