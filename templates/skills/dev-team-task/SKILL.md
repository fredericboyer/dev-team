---
name: dev-team-task
description: Start an iterative task loop with adversarial review gates. Use when the user wants a task implemented with automatic quality convergence -- the loop continues until no [DEFECT] challenges remain or max iterations are reached.
disable-model-invocation: true
---

Start a task loop for: $ARGUMENTS

## Setup

1. Parse the task description and any flags:
   - `--max-iterations N` (default: 10)
   - `--skip-research` — skip the research step for this invocation
   - `--skip-challenge` — skip the challenge step for this invocation
   - `--skip-review` — skip the review step for this invocation
   - Reviewer selection is handled by `dev-team-review` based on changed file patterns — no `--reviewers` flag needed

2. Agent selection, pre-assessment, and Definition of Done are handled by `dev-team-implement`. See that skill for details on agent routing, Brooks pre-assessment, and complexity classification.

## Config resolution

The task skill is a thin orchestrator. Each step is gated by a toggle in `.dev-team/config.json` under the `workflow` key. Read the config once at startup and merge with per-invocation flag overrides.

```json
{
  "workflow": {
    "research": true,
    "challenge": false,
    "implement": true,
    "review": true,
    "pr": true,
    "merge": true,
    "release": false,
    "learn": true
  }
}
```

### Toggle types

Two toggle types control step execution:

- **WorkflowToggle** (`boolean | "complex"`): Used by `research`, `challenge`, `review`, `learn`.
  - `true` — always run the step
  - `false` — always skip the step
  - `"complex"` — run only when Brooks pre-assessment classifies the task as COMPLEX

- **WorkflowSwitch** (`boolean`): Used by `implement`, `pr`, `merge`, `release`. Binary on/off.

### Per-invocation overrides

Flags like `--skip-research`, `--skip-challenge`, `--skip-review` override config for a single invocation. They force the corresponding toggle to `false` regardless of the config value. There are no flags to force a step on — use config for that.

### Dependency validation

Before executing the pipeline, validate step dependencies:
- `merge` requires `pr` (cannot merge without a PR)
- `release` requires `merge` (cannot release without merging)
- `challenge` set to `"complex"` requires that pre-assessment is not skipped (complexity classification comes from Brooks)

If a dependency is violated, warn the user and skip the dependent step.

## Eight-step composable pipeline

The task skill orchestrates eight steps per branch. Each step dispatches to a composable skill or agent. Steps are independently toggleable via config, subject to dependency constraints. Both single-issue and parallel modes use these same steps — the orchestration mode only changes *when* and *how many* branches run concurrently.

| Step | Skill / Agent | Config toggle | Default | Toggle type |
|------|--------------|---------------|---------|-------------|
| **0. Research** | `dev-team-research` | `workflow.research` | `true` | WorkflowToggle |
| **1. Challenge** | `dev-team-challenge` | `workflow.challenge` | `false` | WorkflowToggle |
| **2. Implement** | `dev-team-implement` | `workflow.implement` | `true` | WorkflowSwitch |
| **3. Review** | `dev-team-review` | `workflow.review` | `true` | WorkflowToggle |
| **4. PR** | `dev-team-pr` | `workflow.pr` | `true` | WorkflowSwitch |
| **5. Merge** | `dev-team-merge` | `workflow.merge` | `true` | WorkflowSwitch |
| **6. Release** | Conway: version bump, changelog, tag | `workflow.release` | `false` | WorkflowSwitch |
| **7. Learn** | `dev-team-extract` (Borges) | `workflow.learn` | `true` | WorkflowToggle |

## Phase checkpoints

At each phase boundary, emit a structured status line before proceeding. This gives the human visibility into long-running task loops.

**Single-issue mode:**
```
[dev-team-task] Step 0/7: Research — dev-team-research...
[dev-team-task] Step 1/7: Challenge — dev-team-challenge...
[dev-team-task] Step 2/7: Implement — <agent> on <branch>...
[dev-team-task] Step 3/7: Review — dev-team-review (round <N>)...
[dev-team-task] Step 4/7: PR — dev-team-pr...
[dev-team-task] Step 5/7: Merge — dev-team-merge PR #NNN...
[dev-team-task] Step 6/7: Release — Conway: version bump, changelog, tag...
[dev-team-task] Step 7/7: Learn — spawning Borges...
[dev-team-task] Done — PR #NNN merged, <N> DEFECTs fixed
```

**Parallel mode (multiple issues):**
```
[dev-team-task] Parallel mode — <N> branches
[dev-team-task] <branch>: Step 0 complete — research done
[dev-team-task] <branch>: Step 2 complete — starting review
[dev-team-task] <branch>: Step 3 complete — creating PR
[dev-team-task] <branch>: Step 5 complete — merged
[dev-team-task] All branches merged — Step 7: extracting memories
[dev-team-task] Done — <N> PRs merged
```

Skipped steps are omitted from the checkpoint output — do not emit a line for a step that was skipped. The step numbers in the output always reflect the pipeline position, not a renumbered sequence.

Phase markers are consistent with agent-level progress reporting (ADR-026).

## Step 0: Research

**Entry condition:** Task parsed, config resolved.
**Exit condition:** Research brief produced, or step skipped.

When `workflow.research` is enabled (or `"complex"` and task is COMPLEX), call `dev-team-research` with the task description. The research skill spawns Turing to investigate the problem space and produce a structured research brief with citations.

The research brief feeds into subsequent steps: it informs the challenge (Step 1), shapes the implementation approach (Step 2), and provides context for reviewers (Step 3).

Skip if `--skip-research` flag is set or `workflow.research` is `false`.

## Step 1: Challenge

**Entry condition:** Research complete (or skipped).
**Exit condition:** Challenge report produced and acknowledged, or step skipped.

When `workflow.challenge` is enabled (or `"complex"` and task is COMPLEX), call `dev-team-challenge` with the task description and any research brief from Step 0. The challenge skill critically examines the proposed approach before implementation begins.

If the challenge produces blocking concerns, present them to the human for a decision before proceeding to implementation. Advisory concerns are noted and passed to the implementing agent as context.

Skip if `--skip-challenge` flag is set or `workflow.challenge` is `false`.

## Step 2: Implement

**Entry condition:** Challenge complete (or skipped), no unresolved blocking concerns from Step 1.
**Exit condition:** Non-empty diff, tests pass.

Call `dev-team-implement` with the task description. The implement skill handles agent selection, Brooks pre-assessment, Definition of Done negotiation, best-practices research, implementation, and validation.

For SIMPLE tasks (or when `--skip-assessment` is appropriate), pass that flag through.

The implement skill returns: branch name, files changed, complexity classification, and whether an ADR was written. Use the complexity classification to determine review intensity in Step 3.

**Note:** The implement skill does NOT create a PR — PR creation is a separate step (Step 4) that runs after review passes.

## Step 3: Review

**Entry condition:** Implementation complete, non-empty diff exists on the branch.
**Exit condition:** Zero `[DEFECT]`s, all findings acknowledged.

**Review intensity** is determined by the complexity classification from Brooks' pre-assessment:

- **SIMPLE tasks -> LIGHT review**: Call `dev-team-review --light`. LIGHT reviews are advisory only — all findings (including `[DEFECT]`) are treated as advisory. A single reviewer is spawned. The review serves as a quality signal but does not block progress.
- **COMPLEX tasks -> FULL review**: Call `dev-team-review`. Full reviewer set, blocking `[DEFECT]` semantics, standard iteration loop.
- **If pre-assessment was skipped** (bug fixes, typo fixes, config tweaks): default to LIGHT review.

Call `dev-team-review [--light]` with the current branch as the argument. Reviews examine the local diff — no PR is required at this point. The review skill handles:
- Agent selection based on changed file patterns (full set for FULL review, single reviewer for LIGHT)
- Spawning reviewers in parallel as background tasks
- Timeout handling for unresponsive reviewers
- The judge pass (filter/deduplicate/validate findings)
- Producing a structured report with classified findings

Receive the review report and proceed to finding routing below.

Skip if `--skip-review` flag is set or `workflow.review` is `false`.

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

The orchestrator verifies that **all** findings have an explicit outcome before exiting Step 3. Findings without an explicit outcome block the exit — there is no automatic fallback.

### Iteration within Step 3

After the implementer has acknowledged all findings, **compact the context** before the next review round:
- Produce a structured summary: all findings (agent, classification, file, status/outcome), files changed, outstanding items
- This compact summary is available in the task skill's context for continuity across rounds

Call `dev-team-review` again for the next round, passing the compact summary as part of the arguments so that reviewers have prior-round context (which findings were raised, how they were resolved, and what remains outstanding). The review skill spawns fresh reviewers each round — they receive the current diff, the compact summary, and their agent definition. They do NOT receive raw conversation history from prior rounds.

Continue iterating until no `[DEFECT]` remains or max iterations reached. If max iterations reached without convergence, report remaining defects and exit.

### Context management in long review loops

The task skill's iteration model uses two strategies to manage context growth:

1. **Fresh reviewers per round**: Each `dev-team-review` call spawns new reviewer agents. They receive only the current diff and the compact summary — not raw conversation history from prior rounds. This provides a natural context reset that prevents reviewers from anchoring on stale findings.

2. **Compact summaries between rounds**: After each round, the orchestrator produces a structured summary (findings, outcomes, files changed, outstanding items). This compressed representation replaces verbose raw findings in subsequent rounds.

**Long-running loops (3+ review rounds):** If a task has gone through 3 or more review rounds without convergence, consider spawning a **fresh implementing agent** with a compact handoff. The handoff should include: the original task description, the current diff, all outstanding findings with their classifications, and a summary of what has been tried. A fresh agent avoids context fatigue and may find simpler solutions to persistent defects.

## Step 4: PR

**Entry condition:** Review passed (zero `[DEFECT]`s) or review skipped.
**Exit condition:** PR created and URL available.

Call `dev-team-pr` with the current branch. The PR skill reads project config for PR conventions (labels, draft mode, template) and creates a well-formatted PR.

The PR body includes the review summary from Step 3 (if review was run), linking findings and their outcomes.

### Automated review check

After creating a PR, check for automated review findings from the platform's review bot (if configured). If findings exist, route actionable ones to the implementing agent for fixes before proceeding to Step 5.

## Step 5: Merge

**Entry condition:** PR exists and is mergeable.
**Exit condition:** PR merged.

**Use the project's merge skill (e.g., `dev-team-merge`) for every PR.** Do not use raw `gh pr merge` or other git commands — the merge skill handles automated review monitoring, CI verification, and post-merge actions. If no merge skill exists, ensure the PR is mergeable and report readiness. If merge fails (CI failures, merge conflicts, branch protection), report the blocker to the human rather than leaving work unattended.

## Step 6: Release

**Entry condition:** PR merged, `workflow.release` is `true`.
**Exit condition:** Version bumped, changelog updated, release tag created — or step skipped.

When `workflow.release` is enabled, spawn @dev-team-conway after merge to handle the release process:
- Read `versioning.scheme` from `.dev-team/config.json` (default: `"semver"`)
- Determine the appropriate version bump based on the changes (patch/minor/major)
- Update version in project manifest files
- Update changelog
- Create a release PR

Conway does NOT run `npm publish` or equivalent — CI handles publishing after the release tag is pushed. This step only prepares the release artifacts.

Skip if `workflow.release` is `false` (the default).

## Step 7: Learn

**Entry condition:** All branches merged (and release completed, if enabled).
**Exit condition:** Borges extraction complete, metrics recorded.

Format the **finding outcome log** from all review rounds (use single-branch or multi-branch format as appropriate — see `dev-team-extract` for the log schema). Then call `dev-team-extract` with the formatted log.

`dev-team-extract` handles Borges spawning, metrics verification, and memory formation gates. Do not emit "Done" or report task completion until `dev-team-extract` reports success. If it reports failure, follow its guidance to retry.

Summarize what was accomplished across all iterations. Report any remaining `[RISK]` or `[SUGGESTION]` items, including Borges's recommendations.

Skip if `workflow.learn` is `false`.

## Orchestration: single-issue mode

For a single issue, run Steps 0 through 7 sequentially on one branch, skipping any steps whose config toggle is disabled.

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

### Steps 0-2 (parallel): Research, Challenge, Implementation
For each independent issue, run Steps 0 through 2 as a unit. Research and challenge (if enabled) run before implementation on each branch. Drucker spawns one implementing agent per independent issue, each on its own branch (`feat/<issue>-<description>`). Use the agent teammate naming convention: `{agent}-implement[-{qualifier}]` (e.g., `voss-implement`, `deming-implement-auth`, `tufte-implement-319`). Agents work concurrently without awareness of each other. Drucker tracks which issues are assigned to which agents and branches in conversation context.

**Sequential chains:** For sequential chains, verify the previous change is integrated before starting the next dependent task. Do not start multiple sequential agents from the same stale baseline — this causes integration conflicts that negate the sequencing benefit.

**Sequential chain gate:** When issues are sequenced due to file conflicts, verify the previous change is integrated into the shared codebase before starting the next dependent task. Do not spawn the next agent until integration is confirmed. This is a hard gate.

### Steps 3-5 (per-branch, as each implementation lands)
Review each branch **the moment its implementing agent finishes** — do not wait for all implementations to complete. As soon as an agent reports completion and passes Step 2 validation (non-empty diff, tests pass, relevance, clean tree), immediately call `dev-team-review [--light]` for that branch (using `--light` for SIMPLE branches, omitting it for COMPLEX branches).

This means reviews and implementations run concurrently: some branches are under review while others are still being implemented. For sequential chains, the first branch in a chain enters review while the next dependent branch is being implemented — though the next branch still waits for the predecessor to merge before starting.

If a branch's review finds zero `[DEFECT]` findings and all advisory findings are acknowledged, proceed immediately to Step 4 (PR) and then Step 5 (merge). Do not wait for other branches to finish their reviews. Branches that clear review proceed to PR and merge immediately — they do not wait for other branches.

Finding routing follows the same rules as Step 3 above. Disputes block only the affected branch, not the entire batch.

### Step 6 (once, after all branches, if enabled)
Release runs **once** after all branches are merged, if `workflow.release` is `true`. Conway processes the cumulative changes across all branches.

### Step 7 (once, after all branches)
Borges runs **once** across all branches after all per-branch reviews have cleared and all branches are merged (and release completed, if enabled). Pass Borges the multi-branch finding outcome log. This ensures cross-branch coherence.

### Convergence criteria
Parallel mode is complete when:
1. All branches have zero `[DEFECT]` findings, OR the per-branch iteration limit (default: 10) is reached
2. All branches are merged
3. Release completed (if enabled)
4. Borges has run across all branches

## Platform detection

Before issuing any `gh issue`, `gh pr`, or other platform-specific CLI commands, check `.dev-team/config.json` for the `platform` and `issueTracker` fields. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`, `"other"`), adapt issue tracker and PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI for the configured platform. If `platform` is absent from config.json, default to `"github"`. The steps in this skill assume GitHub by default.
