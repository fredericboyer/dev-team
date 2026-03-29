---
name: dev-team:task
description: Start an iterative task loop with adversarial review gates. Use when the user wants a task implemented with automatic quality convergence -- the loop continues until no [DEFECT] challenges remain or max iterations are reached.
disable-model-invocation: true
---

Start a task loop for: $ARGUMENTS

## Setup

1. Parse the task description and any flags:
   - `--max-iterations N` (default: 10)
   - `--reviewers` (default: @dev-team-szabo, @dev-team-knuth, @dev-team-brooks)

2. Determine the right implementing agent based on the task:
   - Backend/API/data work -> @dev-team-voss
   - Frontend/UI work -> @dev-team-mori
   - Test writing -> @dev-team-beck
   - Tooling/config -> @dev-team-deming
   - Documentation -> @dev-team-tufte
   - Release/versioning -> @dev-team-conway

3. **Architect pre-assessment** (skip for bug fixes, typo fixes, config tweaks):
   Spawn @dev-team-brooks to assess:
   - Does this task introduce a new pattern, tool, or convention?
   - Does it change module boundaries, dependency direction, or layer responsibilities?
   - Does it contradict or extend an existing ADR?

   Architect returns: `ADR needed: yes/no`. If yes: `topic: <X>, proposed title: ADR-NNN: <title>`.

   If an ADR is needed, include "Write ADR-NNN: <title>" in the implementation task. The implementing agent writes the ADR file. Architect reviews it post-implementation alongside code review.

   **Timeout**: If the pre-assessment agent has not reported progress (status file or message) within 3 minutes, send a status ping. If no response within 1 additional minute, terminate the agent and either perform the pre-assessment yourself or skip it with a note explaining why.

## Pre-implementation: best-practices research

Before the first iteration, the implementing agent should research current best practices relevant to the task — checking official documentation for the tools, frameworks, and platforms involved. This ensures decisions are based on current ecosystem recommendations, not stale assumptions. When current best practices conflict with established codebase conventions, prefer consistency and flag the newer approach as a `[SUGGESTION]` with a migration path.

## Four-step model

The task skill orchestrates four steps per branch. Each step has a clear entry condition, responsibility, and exit condition. Both single-issue and parallel modes use these same steps — the orchestration mode only changes *when* and *how many* branches run concurrently.

| Step | Responsibility | Entry condition | Exit condition |
|------|---------------|-----------------|----------------|
| **1. Implement** | Agent works on branch, validates output | Task assigned | Non-empty diff, tests pass, PR created |
| **2. Review** | Adversarial review, finding routing, defect fixing | PR exists | Zero `[DEFECT]`s, all findings acknowledged |
| **3. Merge** | Merge via `/merge` skill, CI verification | Review passed | PR merged |
| **4. Extract** | Borges memory extraction, metrics | All branches merged | Metrics recorded, memory updated |

## Phase checkpoints

At each phase boundary, emit a structured status line before proceeding. This gives the human visibility into long-running task loops.

**Single-issue mode:**
```
[dev-team:task] Step 1/4: Implement — <agent> on <branch>...
[dev-team:task] Step 2/4: Review — <agents> in parallel (round <N>)...
[dev-team:task] Step 3/4: Merge — /merge PR #NNN...
[dev-team:task] Step 4/4: Extract — spawning Borges...
[dev-team:task] Done — PR #NNN merged, <N> DEFECTs fixed
```

**Parallel mode (multiple issues):**
```
[dev-team:task] Parallel mode — <N> branches
[dev-team:task] <branch>: Step 1 complete — starting review
[dev-team:task] <branch>: Step 2 complete — merging
[dev-team:task] <branch>: Step 3 complete — merged
[dev-team:task] All branches merged — Step 4: extracting memories
[dev-team:task] Done — <N> PRs merged
```

Phase markers are consistent with agent-level progress reporting (ADR-026).

## Step 1: Implement

The implementing agent works on the task on a feature branch.

**Timeout**: If the implementing agent has not reported progress (status file, message, or commit) within 3 minutes, send a status ping. If no response within 1 additional minute, terminate the agent, assess what was completed, and either resume the work yourself or re-spawn a fresh agent with the remaining tasks.

**Validation** — before exiting Step 1, verify:
- Non-empty diff: `git diff` shows actual changes
- Tests pass: test command executed with exit code 0
- Relevance: changed files relate to the stated issue
- Clean working tree: no uncommitted debris
- If validation fails, route back to implementer with specific failure reason. If it fails twice, escalate to human.

**Deliver the work**: Create the PR. The PR body must include the platform's issue-closing keyword (e.g., `Closes #NNN` for GitHub, `Closes <PROJ>-NNN` for Jira/Linear — check `.dev-team/config.json` for `platform` and `issueTracker` settings).

**Clean up worktree**: If the work was done in a worktree, clean it up after the branch is pushed and the PR is created. Do not wait for merge to clean the worktree.

## Step 2: Review

Spawn review agents in parallel as background tasks. Each reviewer receives the diff and produces classified findings.

**Timeout**: If a reviewer has not reported progress within 3 minutes, send a status ping. If no response within 1 additional minute, terminate the reviewer and proceed with findings from the other reviewers.

### Finding routing

Route **all classified findings** to the implementing agent — not just `[DEFECT]`s. **Implementing agents must remain alive until all findings have been routed and acknowledged.** If an implementer was terminated prematurely, re-spawn it with a compact context (findings + their original diff) for acknowledgment.

**For `[DEFECT]` findings** (these block progress):
- **Address** (`fixed`): fix the defect in the next iteration
- **Dispute** (`overruled`): disagree with the finding (triggers one-round escalation — reviewer responds, then human decides)
DEFECTs cannot be deferred or ignored — they must be fixed or explicitly overruled.

**For advisory findings** (`[RISK]`, `[QUESTION]`, `[SUGGESTION]`):
- **Address** (`accepted`): incorporate the finding
- **Defer** (`deferred`): accept but defer to a follow-up issue (must state reason and issue number)
- **Dispute** (`overruled`): disagree (same escalation as above)
- **Ignore** (`ignored`): explicitly decline to act (must state reason — e.g., out of scope, not applicable)
Advisory findings must be acknowledged but do not prevent the loop from exiting.

The orchestrator verifies that **all** findings have an explicit outcome before exiting Step 2. Findings without an explicit outcome block the exit — there is no automatic fallback.

### Iteration within Step 2

After the implementer has acknowledged all findings, **compact the context** before the next review round:
- Produce a structured summary: all findings (agent, classification, file, status/outcome), files changed, outstanding items
- New reviewers in subsequent rounds receive: current diff + compact summary + agent definition
- They do NOT receive raw conversation history from prior rounds

Continue iterating until no `[DEFECT]` remains or max iterations reached. If max iterations reached without convergence, report remaining defects and exit.

### Automated review check

After creating a PR, check for automated review findings from the platform's review bot (if configured). If findings exist, route actionable ones to the implementing agent for fixes before proceeding to Step 3.

## Step 3: Merge

**Use the project's merge skill (e.g., `/merge`) for every PR.** Do not use raw `gh pr merge` or other git commands — the merge skill handles automated review monitoring, CI verification, and post-merge actions. If no merge skill exists, ensure the PR is mergeable and report readiness. If merge fails (CI failures, merge conflicts, branch protection), report the blocker to the human rather than leaving work unattended.

## Step 4: Extract

Format the **finding outcome log** from all review rounds (use single-branch or multi-branch format as appropriate — see `/dev-team:extract` for the log schema). Then call `/dev-team:extract` with the formatted log.

`/dev-team:extract` handles Borges spawning, metrics verification, and memory formation gates. Do not emit "Done" or report task completion until `/dev-team:extract` reports success. If it reports failure, follow its guidance to retry.

Summarize what was accomplished across all iterations. Report any remaining `[RISK]` or `[SUGGESTION]` items, including Borges's recommendations.

## Orchestration: single-issue mode

For a single issue, run Steps 1 → 2 → 3 → 4 sequentially on one branch.

**Liveness invariant:** While any background agent is active, the orchestrator must not go more than 60 seconds without checking all active agents for progress. This applies regardless of what else the orchestrator is doing.

## Orchestration: parallel mode

When multiple issues are being addressed in a single session, the task loop switches to parallel orchestration (see ADR-019). Drucker coordinates all steps in conversation context.

**Mode selection:** If agent teams are enabled (check `.dev-team/config.json` for `"agentTeams": true`), use team lead mode for batches of 3+ issues. Otherwise, use standard worktree subagent mode. For single issues, always use standard mode.

### Phase 0: Brooks pre-assessment (batch)
Spawn @dev-team-brooks once with all issues. Brooks identifies:
- **File independence**: which issues touch overlapping files (conflict groups that must run sequentially)
- **ADR needs** across the batch
- **Architectural interactions** between issues

Issues in the same conflict group execute sequentially. Independent issues proceed in parallel.

### Step 1 (parallel): Implementation
Drucker spawns one implementing agent per independent issue, each on its own branch (`feat/<issue>-<description>`). Use the agent teammate naming convention: `{agent}-implement[-{qualifier}]` (e.g., `voss-implement`, `deming-implement-auth`, `tufte-implement-319`). Agents work concurrently without awareness of each other. Drucker tracks which issues are assigned to which agents and branches in conversation context.

**Sequential chains:** For sequential chains, verify the previous change is integrated before starting the next dependent task. Do not start multiple sequential agents from the same stale baseline — this causes integration conflicts that negate the sequencing benefit.

**Sequential chain gate:** When issues are sequenced due to file conflicts, verify the previous change is integrated into the shared codebase before starting the next dependent task. Do not spawn the next agent until integration is confirmed. This is a hard gate.

### Steps 2–3 (per-branch, as each PR lands)
Review each branch **the moment its implementing agent finishes** — do not wait for all implementations to complete. As soon as an agent reports completion and passes Step 1 validation (non-empty diff, tests pass, relevance, clean tree), immediately run Step 2 (review) for that branch.

This means reviews and implementations run concurrently: some branches are under review while others are still being implemented. For sequential chains, the first branch in a chain enters review while the next dependent branch is being implemented — though the next branch still waits for the predecessor to merge before starting.

If a branch's review finds zero `[DEFECT]` findings and all advisory findings are acknowledged, proceed immediately to Step 3 (merge). Do not wait for other branches to finish their reviews. Branches that clear review proceed to merge immediately — they do not wait for other branches.

Finding routing follows the same rules as Step 2 above. Disputes block only the affected branch, not the entire batch.

### Step 4 (once, after all branches)
Borges runs **once** across all branches after all per-branch reviews have cleared and all branches are merged. Pass Borges the multi-branch finding outcome log. This ensures cross-branch coherence.

### Convergence criteria
Parallel mode is complete when:
1. All branches have zero `[DEFECT]` findings, OR the per-branch iteration limit (default: 10) is reached
2. All branches are merged
3. Borges has run across all branches

## Platform detection

Before issuing any `gh issue`, `gh pr`, or other platform-specific CLI commands, check `.dev-team/config.json` for the `platform` and `issueTracker` fields. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`, `"other"`), adapt issue tracker and PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI for the configured platform. If `platform` is absent from config.json, default to `"github"`. The steps in this skill assume GitHub by default.

## Security preamble

Before starting work, check for open security alerts using the project's security monitoring process (e.g., a `/security-status` skill or CLAUDE.md guidance). If no such process is defined, use whatever security tooling is available or proceed while noting that no automated security check is configured. Flag any critical findings before proceeding.
