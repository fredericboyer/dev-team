# ADR-044: Branch-level sidecar keying for review-gate hook
Date: 2026-04-04
Status: accepted
Supersedes: ADR-029 (content-hash keying section)

## Context

ADR-029 established the review-gate hook with sidecars keyed by content hash:
```
.dev-team/.reviews/<agent>--<contentHash>.json
```

This design created a deadlock when review happens before the final commit:

1. Implementer commits file A with content hash `abc123`
2. Reviewer reviews commit and creates sidecar `knuth--abc123.json`
3. Review finds a `[DEFECT]` — implementer must fix
4. Implementer fixes file A — staged content now has hash `def456`
5. Review-gate blocks: sidecar is for `abc123`, staged content is `def456`
6. **Deadlock** — to commit the fix the implementer needs a review, but the review was done on the pre-fix content and the sidecar no longer matches

This deadlock is fundamental to the content-hash model: the sidecar becomes invalid the moment any change is made to the reviewed file, even changes that directly implement the reviewer's feedback.

## Decision

Replace content-hash keying with branch-level keying. Sidecars are now keyed by the sanitized branch name:

```
.dev-team/.reviews/<agent>--<sanitized-branch>.json
```

Branch name sanitization: replace any character that is not alphanumeric or a hyphen with a hyphen. Example: `feat/787-sidecar-model` → `feat-787-sidecar-model`. This matches the sanitization used for assessment sidecars (ADR-043).

### Schema

Review sidecars must now include a `branch` field:

```json
{
  "agent": "dev-team-knuth",
  "branch": "feat/787-sidecar-model",
  "reviewDepth": "FULL",
  "findings": [...]
}
```

The `branch` field stores the unsanitized branch name for audit purposes. The filename uses the sanitized form.

### Hook behavior

**Gate 1 — Review evidence:**
- SIMPLE tasks: pass if any sidecar exists matching `<any-agent>--<sanitizedBranch>.json`
- COMPLEX tasks: each agent in `assessment.requiredReviewers` must have a matching `<agent>--<sanitizedBranch>.json`
- Detached HEAD (`branch === "HEAD"` or git unavailable): gate skips (fail open)

**Gate 2 — Findings resolution:**
- All sidecars matching the current branch are loaded
- Any sidecar with `reviewDepth === "LIGHT"` is skipped (advisory only)
- `[DEFECT]` findings with `resolved \!== true` block the commit

**Cleanup manifest:**
- Written at successful gate pass with all sidecar filenames for the current branch

### Review skill obligation

The review skill writes sidecars. It must now:
1. Determine the current branch (`git rev-parse --abbrev-ref HEAD`)
2. Name the sidecar `<agent>--<sanitizedBranch>.json`
3. Include `"branch": "<unsanitized-branch>"` in the JSON body

## Consequences

### Resolves the deadlock

The review sidecar is valid for the entire lifetime of the branch. A review of `feat/787` creates `knuth--feat-787.json`. Subsequent commits on `feat/787` — including commits that fix defects found in the review — are covered by the same sidecar.

### Stale sidecar risk

Branch-level keying introduces a different staleness risk: a sidecar created at the start of a branch remains valid even after substantial changes. This is a deliberate trade-off. The review process is the enforcement mechanism — agents are expected to re-review when changes are significant. The gate enforces "was this branch reviewed?" not "was this exact content reviewed?"

If a branch is reused across major feature cycles (rare in practice), old sidecars from prior work on the same branch name would pass the gate. This is mitigated by the team's branch lifecycle practice: branches are short-lived and deleted after merge.

### Relationship to ADR-029 and ADR-043

- ADR-029 established the two-gate model (evidence + findings resolution). That model is unchanged.
- ADR-029's content-hash keying is superseded by this ADR for the review-gate hook.
- ADR-043 established the assessment sidecar contract using the same branch sanitization pattern. Review sidecars now use the same convention for consistency.
- Both `.dev-team/.reviews/` and `.dev-team/.assessments/` must remain in `.gitignore` — they are ephemeral local process state.
