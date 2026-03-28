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
- Merge completed PRs promptly as they pass CI. Do not batch merges at the end of a session — stale branches accumulate conflicts.
- For sequential chains (issues touching the same files), merge each PR before spawning the next agent. Branching from stale main nullifies the sequencing benefit.

## Release

- Close the GitHub milestone after creating the release PR.
- Release publishing is automated via CI. After merging the release PR, push the git tag — the `release.yml` workflow handles npm publish and GitHub release creation automatically. Do NOT manually run `npm publish` or `gh release create`.
- Conway handles release PRs (version bump, changelog, milestone closure).

## Parallelization

- **Aggressively parallelize independent work.** When multiple issues touch independent files, work them simultaneously. Only sequence issues that have file conflicts.
- **Agent teams** (preferred for multi-issue batches): The main conversation loop acts as Drucker (team lead). Spawn implementation teammates via agent teams, each on its own branch. Never delegate to a Drucker subagent — the main loop IS Drucker.
- **Worktree subagents** (fallback when agent teams are unavailable): Use the Agent tool with `isolation: "worktree"` to spawn parallel workstreams in separate worktrees.
- **Worktree isolation for multi-branch work.** When agent teams work on multiple branches simultaneously, shared working directories cause cross-branch contamination (stray commits, reverted edits, lost work). Prefer worktree isolation when available. v1.7.0 experienced 3 stray commits and 1 agent re-spawn from this issue.
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

## Handling unresponsive agents

Background agents can get stuck without producing output. Apply this escalation pattern:
1. If an agent has not reported progress (status file, message, or commit) within **3 minutes**, send a status ping via `SendMessage`.
2. If no response within **1 additional minute**, terminate the agent.
3. Assess what was completed: check for partial output (status files, commits, branch changes).
4. Either re-spawn a fresh agent with the remaining work, or complete the work yourself.
5. Do not wait indefinitely — an unresponsive agent will not recover on its own.

## Dogfooding

- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Don't ask for approval to continue between tasks. Just do the work. Only pause for critical decisions.
- Follow through to completion without prompting. When auto-merge is set or CI is pending, monitor and complete the next step (tag, release, cleanup) without waiting for the user.
- Improvements must be project-agnostic and target `templates/`. Most `.dev-team/` files get overwritten by `dev-team update` — exceptions are `process.md`, `learnings.md`, `metrics.md`, and agent memory files (these are preserved). Project-specific conventions stay in local learnings or this process file.
- Dogfooding is the product loop: use dev-team on dev-team → surface friction → `/dev-team:retro` captures patterns → issues target `templates/` → next release improves the tool for everyone.

## Security

- Run `/security-status` at the beginning of every session and before releases.
- Every deferred finding must become a tracked GitHub issue with origin, finding, and assessment context.
