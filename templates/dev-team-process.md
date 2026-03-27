# Dev Team — Project Process
<!-- Project-specific. Not overwritten by dev-team update. -->
<!-- Customize the sections below for your project's workflow. -->

## Versioning
<!-- How does this project version releases? -->

Follow semantic versioning (semver). Read the project's manifest file for the current version.
- **Patch** — bug fixes, hotfixes
- **Minor** — new features, non-breaking changes
- **Major** — breaking changes

## Branching
<!-- What branch naming convention does this project use? -->

Use descriptive branch names that reference the issue being worked on.

## Integration
<!-- How are changes integrated? PRs? Direct commits? Review requirements? -->

All changes via pull request. Link PRs to issues for auto-close on merge.

## Release
<!-- How are releases cut? Manual or automated? Who approves? -->

The release engineer (Conway) handles version bumps, changelogs, and release PRs.

## Orchestration

See below for dev-team agent orchestration details.

### Parallel execution

When working on multiple independent issues, combine agent teams with worktree isolation:

- **Implementing agents** must use both `team_name` and `isolation: "worktree"` to prevent branch conflicts between parallel teammates.
- **Review/read-only agents** should assess whether they need access to an implementer's worktree (to run tests or read changed files in context), or should work in their own isolation for independent analysis.

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

Drucker coordinates the review wave after all implementations complete.

### Sequential execution

When issues are sequenced due to file conflicts, ensure each completed change is integrated into the shared codebase before starting the next. Working from a stale baseline causes integration conflicts.

### Handling unresponsive agents

Background agents can get stuck without producing output. Apply this escalation pattern:
1. If an agent has not reported progress (status file, message, or commit) within **3 minutes**, send a status ping via `SendMessage`.
2. If no response within **1 additional minute**, terminate the agent.
3. Assess what was completed: check for partial output (status files, commits, branch changes).
4. Either re-spawn a fresh agent with the remaining work, or complete the work yourself.
5. Do not wait indefinitely — an unresponsive agent will not recover on its own.

### Drucker delegation note

If your project's workflow section (above the `dev-team:begin` marker) already designates the main conversation loop as the team lead, do not spawn a separate Drucker subagent — the main loop IS Drucker. Otherwise, `@dev-team-drucker` can be used as a subagent for delegation.
