---
name: dev-team-task
description: Start an iterative task loop with adversarial review gates. Use when the user wants a task implemented with automatic quality convergence -- the loop continues until no [DEFECT] challenges remain or max iterations are reached.
disable-model-invocation: true
---

Start a task loop for: $ARGUMENTS

## Setup

1. Parse the task description and any flags:
   - `--max-iterations N` (default: 10)
   - Reviewer selection is handled by `/dev-team:review` based on changed file patterns — no `--reviewers` flag needed

2. Agent selection, pre-assessment, and Definition of Done are handled by `/dev-team:implement`. See that skill for details on agent routing, Brooks pre-assessment, and complexity classification.

## Four-step model

The task skill orchestrates four steps per branch. Each step has a clear entry condition, responsibility, and exit condition. Both single-issue and parallel modes use these same steps — the orchestration mode only changes *when* and *how many* branches run concurrently.

| Step | Responsibility | Entry condition | Exit condition |
|------|---------------|-----------------|----------------|
| **1. Implement** | Agent works on branch, validates output | Task assigned | Non-empty diff, tests pass, PR created |
| **2. Review** | Adversarial review, finding routing, defect fixing | PR exists | Zero `[DEFECT]`s, all findings acknowledged |
| **3. Merge** | Merge via `/dev-team:merge` skill, CI verification | Review passed | PR merged |
| **4. Extract** | Borges memory extraction, metrics | All branches merged | Metrics recorded, memory updated |

## Phase checkpoints

At each phase boundary, emit a structured status line before proceeding. This gives the human visibility into long-running task loops.

**Single-issue mode:**
```
[dev-team:task] Step 1/4: Implement — <agent> on <branch>...
[dev-team:task] Step 2/4: Review — /dev-team:review (round <N>)...
[dev-team:task] Step 3/4: Merge — /dev-team:merge PR #NNN...
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

Call `/dev-team:implement` with the task description. The implement skill handles agent selection, Brooks pre-assessment, Definition of Done negotiation, best-practices research, implementation, validation, and PR creation.

For SIMPLE tasks (or when `--skip-assessment` is appropriate), pass that flag through.

The implement skill returns: branch name, PR number, files changed, complexity classification, and whether an ADR was written. Use the complexity classification to determine review intensity in Step 2.

## Step 2: Review

**Review intensity** is determined by the complexity classification from Brooks' pre-assessment:

- **SIMPLE tasks -> LIGHT review**: Call `/dev-team:review --light`. LIGHT reviews are advisory only — all findings (including `[DEFECT]`) are treated as advisory. A single reviewer is spawned. The review serves as a quality signal but does not block progress.
- **COMPLEX tasks -> FULL review**: Call `/dev-team:review`. Full reviewer set, blocking `[DEFECT]` semantics, standard iteration loop.
- **If pre-assessment was skipped** (bug fixes, typo fixes, config tweaks): default to LIGHT review.

Call `/dev-team:review [--light]` with the current branch or PR as the argument. The review skill handles:
- Agent selection based on changed file patterns (full set for FULL review, single reviewer for LIGHT)
- Spawning reviewers in parallel as background tasks
- Timeout handling for unresponsive reviewers
- The judge pass (filter/deduplicate/validate findings)
- Producing a structured report with classified findings

Receive the review report and proceed to finding routing below.

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
- This compact summary is available in the task skill's context for continuity across rounds

Call `/dev-team:review` again for the next round, passing the compact summary as part of the arguments so that reviewers have prior-round context (which findings were raised, how they were resolved, and what remains outstanding). The review skill spawns fresh reviewers each round — they receive the current diff, the compact summary, and their agent definition. They do NOT receive raw conversation history from prior rounds.

Continue iterating until no `[DEFECT]` remains or max iterations reached. If max iterations reached without convergence, report remaining defects and exit.

### Context management in long review loops

The task skill's iteration model uses two strategies to manage context growth:

1. **Fresh reviewers per round**: Each `/dev-team:review` call spawns new reviewer agents. They receive only the current diff and the compact summary — not raw conversation history from prior rounds. This provides a natural context reset that prevents reviewers from anchoring on stale findings.

2. **Compact summaries between rounds**: After each round, the orchestrator produces a structured summary (findings, outcomes, files changed, outstanding items). This compressed representation replaces verbose raw findings in subsequent rounds.

**Long-running loops (3+ review rounds):** If a task has gone through 3 or more review rounds without convergence, consider spawning a **fresh implementing agent** with a compact handoff. The handoff should include: the original task description, the current diff, all outstanding findings with their classifications, and a summary of what has been tried. A fresh agent avoids context fatigue and may find simpler solutions to persistent defects.

### Automated review check

After creating a PR, check for automated review findings from the platform's review bot (if configured). If findings exist, route actionable ones to the implementing agent for fixes before proceeding to Step 3.

## Step 3: Merge

**Use the project's merge skill (e.g., `/dev-team:merge`) for every PR.** Do not use raw `gh pr merge` or other git commands — the merge skill handles automated review monitoring, CI verification, and post-merge actions. If no merge skill exists, ensure the PR is mergeable and report readiness. If merge fails (CI failures, merge conflicts, branch protection), report the blocker to the human rather than leaving work unattended.

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
- **Complexity classification** for each issue: SIMPLE or COMPLEX (determines review intensity and Definition of Done requirement per branch)

Issues in the same conflict group execute sequentially. Independent issues proceed in parallel.

### Step 1 (parallel): Implementation
Drucker spawns one implementing agent per independent issue, each on its own branch (`feat/<issue>-<description>`). Use the agent teammate naming convention: `{agent}-implement[-{qualifier}]` (e.g., `voss-implement`, `deming-implement-auth`, `tufte-implement-319`). Agents work concurrently without awareness of each other. Drucker tracks which issues are assigned to which agents and branches in conversation context.

**Sequential chains:** For sequential chains, verify the previous change is integrated before starting the next dependent task. Do not start multiple sequential agents from the same stale baseline — this causes integration conflicts that negate the sequencing benefit.

**Sequential chain gate:** When issues are sequenced due to file conflicts, verify the previous change is integrated into the shared codebase before starting the next dependent task. Do not spawn the next agent until integration is confirmed. This is a hard gate.

### Steps 2–3 (per-branch, as each PR lands)
Review each branch **the moment its implementing agent finishes** — do not wait for all implementations to complete. As soon as an agent reports completion and passes Step 1 validation (non-empty diff, tests pass, relevance, clean tree), immediately call `/dev-team:review [--light]` for that branch (using `--light` for SIMPLE branches, omitting it for COMPLEX branches).

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
