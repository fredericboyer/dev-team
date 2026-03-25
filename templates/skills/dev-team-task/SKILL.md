---
name: dev-team:task
description: Start an iterative task loop with adversarial review gates. Use when the user wants a task implemented with automatic quality convergence -- the loop continues until no [DEFECT] challenges remain or max iterations are reached.
---

Start a task loop for: $ARGUMENTS

## Setup

1. Parse the task description and any flags:
   - `--max-iterations N` (default: 10)
   - `--reviewers` (default: @dev-team-szabo, @dev-team-knuth)

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

## Pre-implementation: best-practices research

Before the first iteration, the implementing agent should research current best practices relevant to the task — checking official documentation for the tools, frameworks, and platforms involved. This ensures decisions are based on current ecosystem recommendations, not stale assumptions. When current best practices conflict with established codebase conventions, prefer consistency and flag the newer approach as a `[SUGGESTION]` with a migration path.

## Execution loop

Track iterations in conversation context (no state files). For each iteration:

1. The implementing agent works on the task.
2. **Validate implementation output** before spawning reviewers:
   - Non-empty diff: `git diff` shows actual changes
   - Tests pass: test command executed with exit code 0
   - Relevance: changed files relate to the stated issue
   - Clean working tree: no uncommitted debris
   - If validation fails, route back to implementer with specific failure reason. If it fails twice, escalate to human.
3. After validation passes, spawn review agents in parallel as background tasks.
4. Collect classified challenges from reviewers.
5. If any `[DEFECT]` challenges exist, address them in the next iteration.
6. If no `[DEFECT]` remains, output DONE to exit the loop.
7. If max iterations reached without convergence, report remaining defects and exit.

The convergence check happens in conversation context: count iterations, check for `[DEFECT]` findings, and decide whether to continue or exit.

## Parallel mode

When multiple issues are being addressed in a single session, the task loop switches to parallel orchestration (see ADR-019). Drucker coordinates all phases in conversation context.

### Phase 0: Brooks pre-assessment (batch)
Spawn @dev-team-brooks once with all issues. Brooks identifies:
- **File independence**: which issues touch overlapping files (conflict groups that must run sequentially)
- **ADR needs** across the batch
- **Architectural interactions** between issues

Issues in the same conflict group execute sequentially. Independent issues proceed in parallel.

### Phase 1: Parallel implementation
Drucker spawns one implementing agent per independent issue, each on its own branch (`feat/<issue>-<description>`). Agents work concurrently without awareness of each other. Drucker tracks which issues are assigned to which agents and branches in conversation context.

### Phase 2: Review wave
Reviews do **not** start until **all** implementation agents have completed (Agent tool provides completion notifications as the sync barrier). Once all are done, spawn review agents (Szabo + Knuth, plus conditional reviewers) in parallel across all branches simultaneously. Each reviewer receives the diff for one specific branch and produces classified findings scoped to that branch.

### Phase 3: Defect routing
Collect all findings. Route `[DEFECT]` items back to the original implementing agent for each branch. Agents fix defects on their own branch. After fixes, another review wave runs. Continue until no `[DEFECT]` findings remain or the per-branch iteration limit is reached.

### Phase 4: Borges completion
Borges runs **once** across all branches after the final review wave clears. This ensures cross-branch coherence: memory files are consistent, learnings are not duplicated, and system improvement recommendations consider the full batch.

### Convergence criteria
Parallel mode is complete when:
1. All branches have zero `[DEFECT]` findings, OR the per-branch iteration limit (default: 10) is reached
2. Borges has run across all branches

## Security preamble

Before starting work, check for open security alerts: run `/dev-team:security-status` if available, or use the project's security monitoring tools. Flag any critical findings before proceeding.

## Completion

When the loop exits:
1. **Deliver the work**: If changes are on a feature branch, create the PR (body must include `Closes #<issue>`). Ensure the PR is ready to merge: CI green, reviews passed, branch up to date. Then follow the project's merge workflow — use `/dev-team:merge` if the project has it configured, otherwise report readiness. If merge fails (CI failures, merge conflicts, branch protection), report the blocker to the human rather than leaving work unattended.
2. **Clean up worktree**: If the work was done in a worktree, clean it up after the branch is pushed and the PR is created. Do not wait for merge to clean the worktree.
3. You MUST spawn **@dev-team-borges** (Librarian) as the final step. Borges will:
   - **Extract structured memory entries** from review findings and implementation decisions
   - Write entries to each participating agent's MEMORY.md using the structured format
   - Update shared learnings in `.dev-team/learnings.md`
   - Check cross-agent coherence
   - Report system improvement opportunities
4. If Borges was not spawned, the task is INCOMPLETE.
5. **Memory formation gate**: After Borges runs, verify that each participating agent's MEMORY.md contains at least one new structured entry from this task. Empty agent memory after a completed task is a system failure — Borges prevents this by automating extraction.
6. Summarize what was accomplished across all iterations.
7. Report any remaining `[RISK]` or `[SUGGESTION]` items, including Borges's recommendations.
