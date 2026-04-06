# ADR-029: Stateless commit gates for adversarial review enforcement
Date: 2026-03-26
Status: accepted

## Context

The adversarial review system — the core value proposition of dev-team — is not consistently enforced:

1. Post-change hooks print directives ("ACTION REQUIRED — spawn these agents") but Claude can ignore them
2. No mechanism ensures findings are addressed — even when reviews run, `[DEFECT]` findings can be silently skipped
3. The review-fix-verify cycle only exists inside `dev-team-task` — ad-hoc work bypasses it entirely
4. Previous file-based enforcement (`review-pending.json`) was removed in PR #113 due to orphaned-file bugs with parallel agents

ADR-013 documented the original tracking-file approach. That approach failed because a shared mutable file (`review-pending.json`) caused contention and orphaned entries in parallel agent workflows.

### Design constraints

- No shared mutable state between agents (learned from ADR-013 failure)
- Must work outside `dev-team-task` — ad-hoc work must be gated too
- Must support parallel agents writing reviews concurrently
- Must be stateless at commit time — derive required reviews from staged files
- Cross-platform (plain JS, no dependencies, per ADR-002)

## Decision

Introduce a two-gate stateless enforcement mechanism as a PreToolUse hook on Bash, intercepting `git commit`:

### Gate 1 — Review evidence

At commit time, the hook:
1. Reads staged files via `git diff --cached --name-only`
2. Re-derives which agents should have reviewed each file (same pattern matching as `dev-team-post-change-review.js`)
3. Checks that matching review sidecar files exist in `.dev-team/.reviews/`
4. **Exit 2** if required reviews are missing

### Gate 2 — Findings resolution

Same hook, second check:
1. Reads all sidecar files matching staged files
2. If any `[DEFECT]` finding exists with `resolved: false`, **exit 2**
3. Resolution markers are written when the reviewer re-runs and clears the defect, or when the human explicitly dismisses a finding

### Review sidecar files

Each review agent writes findings to its own file — no shared mutable state:

```
.dev-team/.reviews/<agent>--<file-content-hash>.json
```

The content hash is derived from the file's current staged content (`git show :<file> | sha256`), ensuring stale reviews from previous edits are not matched.

### Escape hatches

- **LIGHT reviews** (complexity score < threshold): advisory only, sidecar files still written but gate does not block
- **Human dismissal**: `--skip-review` flag on git commit bypasses both gates, logged as a process deviation
- **Non-code files**: only files matching implementation patterns require reviews

### Emergent loop

The review-fix-verify cycle emerges without conversation-level orchestration:

1. Developer edits file → post-change hook flags agents (existing, unchanged)
2. Review agents spawn and write sidecar files with findings
3. Developer tries to commit → Gate 1 checks reviews exist → Gate 2 checks no unresolved `[DEFECT]`s
4. Commit blocked → developer fixes code → post-change hook fires again → reviewer re-runs
5. Reviewer clears defect (or raises new one) → repeat until clean
6. Commit succeeds

## Consequences

- The adversarial review loop is enforced for all work, not just `dev-team-task`
- No shared mutable state — each agent writes its own sidecar file, no contention
- Sidecar directory is gitignored — no review artifacts in version control
- Content hash ensures stale reviews (from before a fix) do not satisfy the gate
- The post-change-review hook remains advisory (exit 0) — enforcement shifts to commit time
- Adds a new PreToolUse hook on Bash (same pattern as pre-commit-lint)
- `.dev-team/.reviews/` must be in `.gitignore`
