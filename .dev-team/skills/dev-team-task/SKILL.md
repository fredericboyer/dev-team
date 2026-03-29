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

## Phase checkpoints

At each phase boundary, emit a structured status line before proceeding. This gives the human visibility into long-running task loops.

**Single-issue mode (with pre-assessment):**
```
[dev-team:task] Phase 1/5: Pre-assessment — spawning Brooks...
[dev-team:task] Phase 2/5: Implementation — <agent> on <branch>...
[dev-team:task] Phase 3/5: Validation — checking diff, tests, relevance...
[dev-team:task] Phase 4/5: Review wave <N> — <agents> in parallel...
[dev-team:task] Phase 5/5: Borges — extracting memories...
[dev-team:task] Done — PR #NNN created, <N> DEFECTs remaining
```

**Single-issue mode (pre-assessment skipped — bug fixes, typos, config tweaks):**
```
[dev-team:task] Phase 1/4: Implementation — <agent> on <branch>...
[dev-team:task] Phase 2/4: Validation — checking diff, tests, relevance...
[dev-team:task] Phase 3/4: Review wave <N> — <agents> in parallel...
[dev-team:task] Phase 4/4: Borges — extracting memories...
[dev-team:task] Done — PR #NNN created, <N> DEFECTs remaining
```

**Parallel mode (multiple issues):**
```
[dev-team:task] Parallel mode — <N> branches implementing simultaneously
[dev-team:task] <branch>: implementation complete (waiting for <N> others)
[dev-team:task] All implementations complete — starting review wave
[dev-team:task] Review wave <N> complete — <N> DEFECTs across <N> branches
[dev-team:task] Done — <N> PRs created
```

Phase markers are consistent with agent-level progress reporting (ADR-026).

## Execution loop

Track iterations in conversation context (no state files). For each iteration:

1. The implementing agent works on the task.
   **Timeout**: If the implementing agent has not reported progress (status file, message, or commit) within 3 minutes, send a status ping. If no response within 1 additional minute, terminate the agent, assess what was completed, and either resume the work yourself or re-spawn a fresh agent with the remaining tasks.
2. **Validate implementation output** before spawning reviewers:
   - Non-empty diff: `git diff` shows actual changes
   - Tests pass: test command executed with exit code 0
   - Relevance: changed files relate to the stated issue
   - Clean working tree: no uncommitted debris
   - If validation fails, route back to implementer with specific failure reason. If it fails twice, escalate to human.
3. After validation passes, spawn review agents in parallel as background tasks. **Timeout**: If a reviewer has not reported progress within 3 minutes, send a status ping. If no response within 1 additional minute, terminate the reviewer and proceed with findings from the other reviewers.
4. Collect classified challenges from reviewers.
5. Route **all classified findings** to the implementing agent — not just `[DEFECT]`s. **Implementing agents must remain alive until all findings have been routed and acknowledged.** Do not shut down implementing agents when the review wave starts — they must receive findings directly and produce their own acknowledgments. If an implementer was terminated prematurely, re-spawn it with a compact context (findings + their original diff) for acknowledgment. The implementer must explicitly acknowledge each finding:

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
   The orchestrator verifies that **all** findings have an explicit outcome before proceeding to step 8 (exit check). Findings without an explicit outcome block the exit check — there is no automatic fallback.
6. After the implementer has acknowledged all findings, **compact the context** before the next iteration:
   - Produce a structured summary: all findings (agent, classification, file, status/outcome), files changed, outstanding items
   - New reviewers in subsequent waves receive: current diff + compact summary + agent definition
   - They do NOT receive raw conversation history from prior waves
7. Address defects in the next iteration.
8. If no `[DEFECT]` remains, output DONE to exit the loop.
9. If max iterations reached without convergence, report remaining defects and exit.

**Liveness invariant:** While any background agent is active, the orchestrator must not go more than 60 seconds without checking all active agents for progress. This applies regardless of what else the orchestrator is doing.

The convergence check happens in conversation context: count iterations, check for `[DEFECT]` findings, and decide whether to continue or exit.

**Integrate-as-you-go:** When orchestrating multiple issues, integrate completed work promptly rather than batching at the end. A stale working copy accumulates conflicts.

## Parallel mode

When multiple issues are being addressed in a single session, the task loop switches to parallel orchestration (see ADR-019). Drucker coordinates all phases in conversation context.

**Mode selection:** If agent teams are enabled (check `.dev-team/config.json` for `"agentTeams": true`), use team lead mode for batches of 3+ issues. Otherwise, use standard worktree subagent mode. For single issues, always use standard mode.

### Phase 0: Brooks pre-assessment (batch)
Spawn @dev-team-brooks once with all issues. Brooks identifies:
- **File independence**: which issues touch overlapping files (conflict groups that must run sequentially)
- **ADR needs** across the batch
- **Architectural interactions** between issues

Issues in the same conflict group execute sequentially. Independent issues proceed in parallel.

### Phase 1: Parallel implementation
Drucker spawns one implementing agent per independent issue, each on its own branch (`feat/<issue>-<description>`). Use the agent teammate naming convention: `{agent}-implement[-{qualifier}]` (e.g., `voss-implement`, `deming-implement-auth`, `tufte-implement-319`). Agents work concurrently without awareness of each other. Drucker tracks which issues are assigned to which agents and branches in conversation context.

**Sequential chains:** For sequential chains, verify the previous change is integrated before starting the next dependent task. Do not start multiple sequential agents from the same stale baseline — this causes integration conflicts that negate the sequencing benefit.

**Sequential chain gate:** When issues are sequenced due to file conflicts, verify the previous change is integrated into the shared codebase before starting the next dependent task. Do not spawn the next agent until integration is confirmed. This is a hard gate.

### Phase 2: Review as each PR lands
Review each branch **the moment its implementing agent finishes** — do not wait for all implementations to complete. As soon as an agent reports completion and passes validation (non-empty diff, tests pass, relevance, clean tree), immediately spawn review agents using the naming convention `{agent}-review` (e.g., `szabo-review`, `knuth-review`, `brooks-review`) for that branch. Each reviewer receives the diff for one specific branch and produces classified findings scoped to that branch.

This means reviews and implementations run concurrently: some branches are under review while others are still being implemented. For sequential chains, the first branch in a chain enters review while the next dependent branch is being implemented — though the next branch still waits for the predecessor to merge before starting.

If a branch's review finds zero `[DEFECT]` findings and all advisory findings are acknowledged, proceed immediately to merge (integrate-as-you-go). Do not wait for other branches to finish their reviews. A second-round review wave still applies if defects are found and fixed — but only for the affected branch.

### Phase 3: Finding routing (per-branch)
As each branch's review completes, route **all classified findings** — `[DEFECT]`, `[RISK]`, `[QUESTION]`, `[SUGGESTION]` — back to the original implementing agent for that branch. **Implementing agents must remain alive through their review cycle** — do not shut them down after implementation completes. Each agent must acknowledge every finding (address/defer/dispute) directly. If an implementer was terminated prematurely, re-spawn it with a compact context (findings + their original diff) for acknowledgment. Disputes follow the same protocol as single-issue mode: one-round escalation between implementer and reviewer, then human decides. A disputed finding blocks only the affected branch, not the entire batch. Only `[DEFECT]` findings block progress. Agents fix defects on their own branch. Before spawning a follow-up review round for a branch, **compact context**: produce a structured summary of all findings, their classification, and outcome (fixed/deferred/disputed/pending), plus files changed. New reviewers receive current diff + compact summary only — not full conversation history from prior rounds. Continue until no `[DEFECT]` findings remain on that branch or the per-branch iteration limit is reached. Branches that clear review proceed to merge immediately — they do not wait for other branches.

### Phase 4: Borges completion
Borges runs **once** across all branches after all per-branch reviews have cleared. Pass Borges the **finding outcome log** (see Completion step 3 for format) covering all branches. This ensures cross-branch coherence: memory files are consistent, learnings are not duplicated, metrics are recorded, and system improvement recommendations consider the full batch.

### Phase 5: Merge
Merge each branch via the project's merge skill (e.g., `/merge`) as soon as its review clears — not raw `gh pr merge` or other git commands. The merge skill handles automated review monitoring, CI verification, and post-merge actions. Do not batch merges at the end — each integration makes the next agent's baseline current, reducing rework. For sequential chains, merging promptly unblocks the next dependent issue with zero idle time.

### Convergence criteria
Parallel mode is complete when:
1. All branches have zero `[DEFECT]` findings, OR the per-branch iteration limit (default: 10) is reached
2. Borges has run across all branches

## Platform detection

Before issuing any `gh issue`, `gh pr`, or other platform-specific CLI commands, check `.dev-team/config.json` for the `platform` and `issueTracker` fields. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`, `"other"`), adapt issue tracker and PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI for the configured platform. If `platform` is absent from config.json, default to `"github"`. The steps in this skill assume GitHub by default.

## Security preamble

Before starting work, check for open security alerts using the project's security monitoring process (e.g., a `/security-status` skill or CLAUDE.md guidance). If no such process is defined, use whatever security tooling is available or proceed while noting that no automated security check is configured. Flag any critical findings before proceeding.

## Completion

When the loop exits:
1. **Deliver the work**: If changes are on a feature branch, create the PR. The PR body must include the platform's issue-closing keyword (e.g., `Closes #NNN` for GitHub, `Closes <PROJ>-NNN` for Jira/Linear — check `.dev-team/config.json` for `platform` and `issueTracker` settings). Ensure the PR is ready to merge: CI green, reviews passed, branch up to date. **Use the project's merge skill (e.g., `/merge`) for every PR. Do not use raw `gh pr merge` — the merge skill handles automated review monitoring, CI verification, and post-merge actions.** If no merge skill exists, ensure the PR is mergeable and report readiness. If merge fails (CI failures, merge conflicts, branch protection), report the blocker to the human rather than leaving work unattended.
2. **Clean up worktree**: If the work was done in a worktree, clean it up after the branch is pushed and the PR is created. Do not wait for merge to clean the worktree.
3. **Automated review check:** After creating a PR, check for automated review findings from the platform's review bot (if configured). If findings exist, route actionable ones to the implementing agent for fixes before proceeding to Borges. This prevents findings from piling up until merge time.
4. You MUST spawn **@dev-team-borges** as `borges-extract` (Librarian) as the final step. Format and pass Borges the **finding outcome log** using this structured format:

   **Single-branch format:**
   ```
   ## Finding Outcome Log
   Task: <issue number and title>
   Branch: <branch name>
   Review rounds: <N>
   Agents involved: <comma-separated list of all participating agents>

   ### Findings
   | # | Agent | Classification | File | Finding summary | Outcome | Reason |
   |---|-------|---------------|------|-----------------|---------|--------|
   | 1 | szabo | [DEFECT] | src/auth.ts | Missing input validation | fixed | Fixed in round 2 |
   | 2 | knuth | [RISK] | src/parser.ts | No boundary check for empty input | deferred | Tracked in #999 |
   | 3 | brooks | [SUGGESTION] | src/core.ts | Extract to shared utility | accepted | Refactored |
   | 4 | knuth | [QUESTION] | src/config.ts | Why not use env vars? | ignored | Out of scope for this task |

   ### Summary
   - Total findings: <N>
   - DEFECTs: <N> fixed, <N> overruled
   - Advisory (RISK/QUESTION/SUGGESTION): <N> accepted, <N> deferred, <N> overruled, <N> ignored
   - Rounds to convergence: <N>
   ```

   **Multi-branch format** (parallel mode):
   ```
   ## Finding Outcome Log
   Tasks: <comma-separated issue numbers and titles>
   Branches:
   - <branch-1>: <N> review rounds
   - <branch-2>: <N> review rounds
   Agents involved: <comma-separated list of all participating agents>

   ### Findings
   | # | Branch | Agent | Classification | File | Finding summary | Outcome | Reason |
   |---|--------|-------|---------------|------|-----------------|---------|--------|
   | 1 | feat/123-auth | szabo | [DEFECT] | src/auth.ts | Missing input validation | fixed | Fixed in round 2 |
   | 2 | feat/456-parser | knuth | [RISK] | src/parser.ts | No boundary check | deferred | Tracked in #999 |

   ### Summary
   - Total findings: <N> across <N> branches
   - DEFECTs: <N> fixed, <N> overruled
   - Advisory (RISK/QUESTION/SUGGESTION): <N> accepted, <N> deferred, <N> overruled, <N> ignored
   - Rounds to convergence: <per-branch breakdown or max>
   ```

   This log enables Borges to record calibration metrics. Borges will:
   - **Extract structured memory entries** from review findings and implementation decisions
   - **Reinforce accepted patterns** in the reviewer's memory (calibration feedback)
   - **Record overruled findings** with context so reviewers generate fewer false positives
   - **Generate calibration rules** when 3+ findings on the same tag are overruled
   - **Record metrics** to `.dev-team/metrics.md` (acceptance rates, rounds to convergence, per-agent stats)
   - Write entries to each participating agent's MEMORY.md using the structured format
   - Update shared learnings in `.claude/rules/dev-team-learnings.md`
   - Check cross-agent coherence
   - Report system improvement opportunities
5. **Borges completion gate (HARD CHECK)**: Before emitting "Done", verify BOTH conditions:
   - (a) Borges has been spawned **and completed** (not just spawned — wait for completion)
   - (b) Read `.dev-team/metrics.md` and verify it contains a new `Task: <issue or PR reference>` entry for the current task. A stale metrics file (no new entry) means Borges did not complete successfully.

   **If either check fails, the task is NOT complete.** If metrics.md has no new entry after Borges reports completion, flag this as a system failure and re-run Borges with explicit instruction to record metrics. Do not emit "Done" or report task completion until both conditions are satisfied. This is a gate, not advisory — skipping it means the task loop has not finished.
6. **Memory formation gate**: After Borges runs, verify that each participating agent's MEMORY.md contains at least one new structured entry from this task. Empty agent memory after a completed task is a system failure — Borges prevents this by automating extraction.
7. Summarize what was accomplished across all iterations.
8. Report any remaining `[RISK]` or `[SUGGESTION]` items, including Borges's recommendations.
