# Dev Team — Project Process
<!-- Project-specific. Not overwritten by dev-team update. -->
<!-- Customize the sections below for your project's workflow. -->

## Versioning
<!-- How does this project version releases? -->

Follow semantic versioning (semver). Read the project's manifest file for the current version.
- **Patch** — bug fixes, hotfixes
- **Minor** — new features, non-breaking changes
- **Major** — breaking changes

### Version targeting

Every issue must target the right milestone or iteration based on its scope. This applies at all points — batch pre-assessment, ad-hoc issue creation mid-session, or backlog grooming. If obvious, just assign. Flag ambiguous cases to the human (e.g., a change that could be considered breaking).

## Branching
<!-- What branch naming convention does this project use? -->

Use descriptive branch names that reference the issue being worked on.

## Integration
<!-- How are changes integrated? PRs? Direct commits? Review requirements? -->

All changes via pull request. Link the deliverable to the originating issue so it auto-closes on merge. Include the issue-closing keyword appropriate for your platform (e.g., `Closes #NNN` for GitHub, `Closes <PROJ>-NNN` for Jira/Linear).

Ensure CI is green and reviews have passed before merging. If the project provides merge automation (a `/merge` skill or similar), use it; otherwise, confirm the deliverable is in a mergeable state and report readiness.

## Release
<!-- How are releases cut? Manual or automated? Who approves? -->

The release engineer (Conway) handles release readiness validation, version bumps, changelogs, and release deliverables.

### Changelog format

Use a structured changelog grouped by: Added, Changed, Deprecated, Removed, Fixed, Security. Within each category, order entries by theme rather than commit order. Link entries to issues or PRs where available.

### Release steps

1. Inventory changes since the last release — commits merged, breaking changes, dependency updates.
2. Draft the changelog with all user-facing changes documented.
3. Bump the version in the project's manifest file(s) according to semver.
4. Create the release deliverable (PR, tag, or equivalent) and link it to the milestone.
5. Verify CI passes on the release branch.
6. Close the associated milestone or iteration if one exists.

## Orchestration

See below for dev-team agent orchestration details.

### Parallel execution

When working on multiple independent issues, combine agent teams with worktree isolation:

- **Implementing agents** must use both `team_name` and `isolation: "worktree"` to prevent branch conflicts between parallel teammates.
- **Review/read-only agents** should assess whether they need access to an implementer's worktree (to run tests or read changed files in context), or should work in their own isolation for independent analysis.

**Agent teammate naming convention:** Use `{agent}-{role}[-{qualifier}]`:
- `{agent}` — dev-team agent name (lowercase): `hopper`, `deming`, `szabo`, etc.
- `{role}` — action: `implement`, `review`, `research`, `audit`, `extract`
- `{qualifier}` — optional, for disambiguation (e.g., issue number, feature name)

| Role suffix | When used | Examples |
|-------------|-----------|---------|
| `-implement` | Implementing agent on a task branch | `hopper-implement`, `deming-implement-auth` |
| `-review` | Reviewer in a review wave | `szabo-review`, `knuth-review` |
| `-research` | Turing research brief | `turing-research`, `turing-research-caching` |
| `-audit` | Full codebase audit pass | `szabo-audit`, `knuth-audit` |
| `-extract` | Borges memory extraction | `borges-extract` |

Drucker coordinates the review wave after all implementations complete.

### Sequential execution

When issues are sequenced due to file conflicts, ensure each completed change is integrated into the shared codebase before starting the next. Working from a stale baseline causes integration conflicts.

### Orchestration validation loop

The orchestrator has a **continuous obligation** to monitor all active work at every turn during any active workflow.

**At every turn, check:**

1. **PR pipeline** — for each open PR: check CI, check unresolved review threads (via GraphQL `reviewThreads`). If CI passes and threads exist: read, reply, resolve via `resolveReviewThread`. Start reviews/merges immediately as each PR lands — don't batch.

2. **Agent liveness** — for each in-progress task: verify a branch or PR exists within 4 minutes. Ping unresponsive agents at 2 minutes. Terminate and re-spawn (or do directly) at 3 minutes. Cap parallel agents at 4-6 per wave.

3. **Task completion verification** — for each "completed" task: verify a PR was actually created. If no PR exists, reopen the task.

4. **Work continuity** — if blocked tasks are now unblocked, spawn the next agent. If pending tasks have no owner, assign or do directly.

### Drucker delegation note

If your project's workflow section (above the `dev-team:begin` marker) already designates the main conversation loop as the team lead, do not spawn a separate Drucker subagent — the main loop IS Drucker. Otherwise, `@dev-team-drucker` can be used as a subagent for delegation.
