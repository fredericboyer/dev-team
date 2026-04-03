## Research brief: Git Checkpoint Tags for Parallel Work Recovery

### Question

Should dev-team tag known-good states in git for recovery during parallel multi-branch work? If so, when, how, and is the complexity justified over the current branch-based recovery model?

### Origin

[Harness best practices gap analysis (#669)](669-harness-best-practices-2026-04-03.md), Gap 3 (Section 9a): "The guide recommends tagging known-good states for recovery. dev-team relies on PR workflow for recovery (discard branch, re-implement) but doesn't tag successful states."

Source recommendation: [Best Practices for Building an Agent Harness, Section 9](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) — "Tag known-good states. Use `git reset` to recover from broken builds."

### Current Recovery Model

dev-team's current recovery approach for parallel work:

1. **Branch-based recovery**: Each agent works on an isolated branch (worktree). If work fails, the branch is discarded and the agent re-implements from main.
2. **PR as quality gate**: Merges only happen after CI passes + review threads resolved + Mergify conditions met. Main is always in a known-good state post-merge.
3. **Re-implementation over rollback**: When an agent produces bad output, the standard response is to delete the branch and re-spawn — not to roll back to a prior state.

Recovery scenarios that have occurred in practice:
- **v3.2.0**: 12 parallel agents, multiple contaminated main working directory. Recovery was manual intervention, not rollback.
- **v3.3.0**: oxfmt config branch contaminated by cross-branch work; redone in worktree. Recovery was re-implementation.
- **v1.7.0**: Stray commits on wrong branches (#447->#438, #436->#446, #440->#434). Recovery was cherry-pick and force-push correction.

### Evaluation: Checkpoint Tag Strategies

#### Strategy A: Tag main after each successful PR merge

**Convention**: `checkpoint/{task-id}/post-{issue}` (e.g., `checkpoint/v3.4.0/post-691`)

**When**: Immediately after merge confirmed in Step 4 of the merge skill.

**Pros**:
- Provides exact rollback points if a later merge in a batch introduces regressions
- Cheap: one `git tag` command per merge
- Useful for multi-PR release trains where a late merge breaks integration

**Cons**:
- Tags accumulate (10-15 per release batch) and require cleanup
- Main is already protected by branch protection + CI — a bad merge that passes CI is rare
- Rollback on main requires force-push or revert commit, both of which are disruptive
- `git revert` of a squash-merge is simpler and doesn't need a tag to identify the target

**Assessment**: Low value. Main is already guarded by CI + Mergify. The scenario where you'd need to roll back main to a tagged state (bad merge that passed CI) is rare, and `git revert HEAD~N` or `git revert <merge-sha>` achieves the same result without pre-placed tags. The merge commit SHAs themselves serve as recovery points.

#### Strategy B: Tag after each successful review round (on feature branches)

**Convention**: `checkpoint/{branch}/review-{round}` (e.g., `checkpoint/feat/691-checkpoint-tags/review-1`)

**When**: After review findings are addressed and CI passes, before the next review round.

**Pros**:
- Allows rolling back a feature branch to its last reviewed-good state if a subsequent change introduces regressions
- Useful for COMPLEX tasks with multiple review rounds

**Cons**:
- Heavy: creates N tags per branch per review round
- Feature branches are disposable by design — the recovery model is re-implementation, not rollback
- Agents operate in fresh context windows per review round anyway, so "rolling back" an agent's work isn't meaningful
- Tag cleanup complexity (must clean up on merge, on branch delete, and on abandoned branches)

**Assessment**: Not recommended. Feature branches are ephemeral and disposable. The cost of tagging, tracking, and cleaning up per-round tags exceeds the cost of re-implementing from the last merge on main.

#### Strategy C: Tag main before starting a parallel batch

**Convention**: `batch-start/{task-id}` (e.g., `batch-start/v3.4.0`)

**When**: Before spawning the first parallel agent in a multi-issue batch.

**Pros**:
- Single tag per batch (minimal overhead)
- Provides a clean rollback point if the entire batch goes wrong
- Simple cleanup: delete after batch succeeds

**Cons**:
- Rolling back an entire batch requires reverting all merged PRs — this is drastic and rare
- The orchestrator already sequences merges; if one fails, subsequent merges are blocked
- `git log main..batch-start/v3.4.0` gives the same information as checking the merge history

**Assessment**: Marginal value. The scenario (entire batch goes wrong, need to reset main) hasn't occurred. Individual PR reverts are more surgical. However, the cost is near-zero (one tag), so this is defensible as a documentation marker even if never used for rollback.

### Cost-Benefit Analysis

| Factor | Branch-based (current) | Checkpoint tags (proposed) |
|--------|----------------------|---------------------------|
| Recovery granularity | Per-branch (discard + re-implement) | Per-merge or per-batch |
| Recovery cost | Re-implementation time (~minutes per agent) | `git revert` or `git reset` (~seconds) |
| Overhead | None | Tag creation, naming convention, cleanup |
| Failure scenarios addressed | Agent produces bad code, cross-branch contamination | Bad merge passes CI, need to undo batch |
| Historical frequency | Common (v1.7.0, v3.2.0, v3.3.0) | Never occurred |
| Main branch safety | CI + Mergify + review threads | Same + tags |

**Key insight**: The recovery scenarios dev-team actually experiences (contaminated worktrees, stray commits, bad agent output) are all pre-merge problems. Tags on main address post-merge problems — which dev-team's CI pipeline has so far prevented.

### Merge Skill Changes (if implementing)

If Strategy C (batch-start tags) were adopted, the changes would be minimal:

1. **Task skill** (`templates/skills/dev-team-task/SKILL.md`): Add a step before spawning parallel agents:
   ```bash
   git tag "batch-start/$(date +%Y%m%d-%H%M)" main
   git push origin "batch-start/$(date +%Y%m%d-%H%M)"
   ```

2. **Task skill post-batch**: After all PRs merged successfully:
   ```bash
   git tag -d "batch-start/..."
   git push origin --delete "batch-start/..."
   ```

3. **No merge skill changes needed** — the merge skill operates per-PR and doesn't need awareness of batch-level tags.

Estimated implementation: ~10 lines added to the task skill. No new files, no architectural changes.

### Recommendation

**Do not implement checkpoint tags at this time.** The cost-benefit analysis shows:

1. **The problem is pre-merge, not post-merge.** Historical recovery scenarios (v1.7.0, v3.2.0, v3.3.0) all involved pre-merge contamination — not bad merges on main. Tags address the wrong failure mode.

2. **Existing mechanisms are sufficient.** CI + Mergify + review thread resolution protect main. Individual merge SHAs serve as implicit checkpoints. `git revert <sha>` provides surgical rollback without pre-placed tags.

3. **Re-implementation is the right recovery model for AI agents.** Unlike human developers who lose hours of work on rollback, agent re-implementation is cheap (~minutes). The "discard and redo" model aligns with the ephemeral nature of agent work sessions.

4. **Tag hygiene adds operational burden.** Naming conventions, cleanup on success, cleanup on abandonment, and avoiding tag namespace pollution (dev-team already uses `v*` tags for releases) create ongoing maintenance with no demonstrated payoff.

**If revisited**: The trigger should be a post-merge regression that CI missed, where having a tagged rollback point would have saved meaningful time. Until that scenario occurs, the current model is adequate.

### Sources

| Claim | Source | Verified |
|-------|--------|----------|
| Harness guide recommends tagging known-good states | [Harness guide, Section 9](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| v3.2.0 contamination incident | `.claude/rules/dev-team-learnings.md` (Cap parallel agents entry) | yes |
| v3.3.0 oxfmt contamination | `.claude/rules/dev-team-learnings.md` (Agent teams contamination entry) | yes |
| v1.7.0 stray commits | `.claude/rules/dev-team-learnings.md` (Agent teams contamination entry) | yes |
| Mergify enforces review threads | `.claude/rules/dev-team-learnings.md` (Never merge with unresolved threads entry) | yes |
| Merge skill post-merge steps | `.claude/skills/dev-team-merge/SKILL.md`, Step 4 | yes |
| Release tags use `v*` convention | `git tag --sort=-version:refname` (v3.3.0, v3.2.0, etc.) | yes |

### Suggested issues

- **Title**: Monitor for post-merge regression scenario to re-evaluate checkpoint tags
  **Severity**: P3
  **Scope**: S
  **Details**: The recommendation against checkpoint tags is conditional on the absence of post-merge regressions that CI missed. If such a scenario occurs, re-evaluate Strategy A (tag after each merge) or Strategy C (tag before batch). Track as a watch item rather than an implementation task.
