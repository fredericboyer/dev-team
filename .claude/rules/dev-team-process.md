# Dev Team — Project Process
<!-- Project-specific. Not overwritten by dev-team update. -->

## Versioning

Semantic versioning (semver). Version source: `package.json`.
- **Patch** (1.5.x) — bug fixes, guard fixes, hotfixes
- **Minor** (1.x.0) — new features, skills, agents, ADRs, non-breaking changes
- **Major** (x.0.0) — breaking changes to template format, config schema, or CLI interface
- Bump with `npm version <version> --no-git-tag-version` to update both `package.json` and `package-lock.json` atomically. Do not edit `package-lock.json` manually.

## Branching

- `feat/123-description` — features, enhancements
- `fix/456-description` — bug fixes, hotfixes
- `chore/description` — releases, maintenance, docs
- Commits reference issues: `fixes #123` or `refs #123`

## Integration

- All merges via PR. No direct pushes to main.
- **Every piece of work starts with a GitHub Issue.** No exceptions.
- Link PRs to issues in the body (`Closes #NNN`) for auto-close on merge.
- **Always use `/merge` to merge PRs.** Do not use raw `gh pr merge` or check Copilot comments separately. The merge skill handles Copilot check run monitoring, auto-merge, CI verification, and post-merge actions. This applies to all PRs — including those created by background agents.
- **No human approval required for merge by design (ADR-041, ADR-042).** Quality is enforced through automated review bots and thread resolution (`required_review_thread_resolution` in GitHub branch protection rulesets), not approval count. Humans can still block PRs by opening review threads.
- Merge completed PRs promptly as they pass CI. Do not batch merges at the end of a session — stale branches accumulate conflicts.
- For sequential chains (issues touching the same files), merge each PR before spawning the next agent. Branching from stale main nullifies the sequencing benefit.

## Release

- Close the GitHub milestone after creating the release PR.
- Release publishing is automated via CI. After merging the release PR, push the git tag — the `release.yml` workflow handles npm publish and GitHub release creation automatically. Do NOT manually run `npm publish` or `gh release create`.
- Conway handles release PRs (version bump, changelog, milestone closure).

## Parallelization

- **Aggressively parallelize independent work.** When multiple issues touch independent files, work them simultaneously. Only sequence issues that have file conflicts.
- **Cap parallel agents at 4-6 per wave.** Higher concurrency causes worktree exhaustion and cross-branch contamination. v3.2.0 spawned 12 agents and multiple contaminated the main working directory.
- **Agent teams** (preferred for multi-issue batches): The main conversation loop acts as Drucker (team lead). Spawn implementation teammates via agent teams, each on its own branch. Never delegate to a Drucker subagent — the main loop IS Drucker.
- **Worktree subagents** (fallback when agent teams are unavailable): Use the Agent tool with `isolation: "worktree"` to spawn parallel workstreams in separate worktrees.
- **Worktree isolation for multi-branch work.** When agent teams work on multiple branches simultaneously, shared working directories cause cross-branch contamination (stray commits, reverted edits, lost work). Prefer worktree isolation when available.
- The main loop must stay interactive at all times. All implementation happens via background teammates or subagents.

**Agent teammate naming convention:** Use `{agent}-{role}[-{qualifier}]`:
- `{agent}` — dev-team agent name (lowercase): `voss`, `deming`, `szabo`, etc.
- `{role}` — action: `implement`, `review`, `research`, `audit`, `extract`
- `{qualifier}` — optional, for disambiguation (e.g., issue number, feature name)

| Role suffix | When used | Examples |
|-------------|-----------|---------|
| `-implement` | Implementing agent on a task branch | `voss-implement`, `deming-implement-auth` |
| `-review` | Reviewer in a review wave | `szabo-review`, `knuth-review` |
| `-research` | Turing research brief | `turing-research`, `turing-research-caching` |
| `-audit` | Full codebase audit pass | `szabo-audit`, `knuth-audit` |
| `-extract` | Borges memory extraction | `borges-extract` |

## Sequential execution

When issues are sequenced due to file conflicts, ensure each completed change is integrated into the shared codebase before starting the next. Working from a stale baseline causes integration conflicts.

## Orchestration validation loop

The orchestrator has a **continuous obligation** to monitor all active work. This is not opt-in — it runs at every orchestrator turn during any active workflow. v3.2.0 demonstrated the failure mode: spawn agents → respond to user → forget about agents until prompted.

**At every turn, the orchestrator must check:**

1. **PR pipeline** — for each open PR:
   - CI status (pass/fail/pending)
   - Unresolved review threads (via GraphQL `reviewThreads`)
   - If CI passes + threads exist: read, reply, resolve via `resolveReviewThread`
   - If all clear + BEHIND: update branch
   - If all clear + CLEAN: report ready for merge
   - Start reviews/merges immediately as each PR lands — don't batch

2. **Agent liveness** — for each in-progress task:
   - Verify a branch or PR exists within 4 minutes of spawn
   - If no progress after 2 minutes: send status ping
   - If no response after 3 minutes: terminate and re-spawn or do directly
   - Stuck agents will not recover on their own

3. **Task completion verification** — for each "completed" task:
   - Verify a PR was actually created (not just task marked done)
   - If no PR exists: reopen task, flag as failed delivery

4. **Work continuity** — check blocked tasks:
   - If all blockers completed: unblock and spawn next agent
   - If pending tasks have no owner: assign or do directly

**Safety net:** When agents are active, schedule a cron loop (every 2 minutes) as backup. The primary enforcement is the orchestrator's own turn discipline — the cron is a fallback for when it gets distracted.

## Dogfooding

- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Don't ask for approval to continue between tasks. Just do the work. Only pause for critical decisions.
- Follow through to completion without prompting. When auto-merge is set or CI is pending, monitor and complete the next step (tag, release, cleanup) without waiting for the user.
- Improvements must be project-agnostic and target `templates/`. Most `.dev-team/` files get overwritten by `dev-team update` — exceptions are `metrics.md` (preserved). Agent memory lives in `.claude/agent-memory/`, learnings and process in `.claude/rules/` — these are not overwritten. Project-specific conventions stay in local learnings or this process file.
- Dogfooding is the product loop: use dev-team on dev-team → surface friction → `/dev-team:retro` captures patterns → issues target `templates/` → next release improves the tool for everyone.

## Security

- Run `/security-status` at the beginning of every session and before releases.
- Every deferred finding must become a tracked GitHub issue with origin, finding, and assessment context.
