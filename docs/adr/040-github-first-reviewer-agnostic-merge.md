# ADR-040: GitHub-first platform, reviewer-agnostic merge skill

Date: 2026-04-01
Status: accepted

## Context

The template design principles stated "Platform-neutral — don't hardcode `gh`, GitHub Actions, Copilot, or any specific tool." In practice:

- Every user is on GitHub. No GitLab or Bitbucket users exist.
- The `platform` config field and multi-platform abstractions added complexity with no users.
- The merge skill hardcoded Copilot-specific login regex patterns (`copilot-pull-request-reviewer[bot]`), missing human review threads entirely.
- Copilot code review is a paid add-on — not universally available.
- v3.2.0 exposed the problem: 6 PRs merged with 36 unresolved Copilot comments because the merge process was Copilot-specific rather than thread-aware.

GitHub's GraphQL API provides `reviewThreads` which returns all threads regardless of author, and `resolveReviewThread` which programmatically resolves them. This was previously believed to be unavailable via API.

## Decision

1. **GitHub is the target platform.** `gh` CLI, GitHub Actions, and GitHub GraphQL API are first-class. Drop the `platform` config field from `.dev-team/config.json`.

2. **Review handling is reviewer-agnostic.** The merge skill addresses ALL unresolved review threads via GraphQL `reviewThreads`, not Copilot-specific login filtering. Works for Copilot, human reviewers, and any bot.

3. **Two-phase Copilot workflow polling.** When Copilot code review is configured, poll for the workflow to appear (phase 1, 2 min timeout), then poll for completion (phase 2, 3 min timeout). When not configured, skip — the thread query still catches any manually-submitted reviews.

4. **Resolve threads via GraphQL.** After replying to each thread, resolve it with `resolveReviewThread`. This enables GitHub ruleset enforcement via `required_review_thread_resolution`.

## Consequences

**Positive:**
- Merge skill is simpler (~100 lines vs ~230 lines)
- Catches ALL review comments, not just Copilot's
- GraphQL thread resolution enables platform-level enforcement (GitHub rulesets with `required_review_thread_resolution`)
- No more multi-signal Copilot detection complexity

**Negative:**
- GitLab/Bitbucket users cannot use dev-team without adaptation (accepted — no such users exist)
- Removing `platform` config is a breaking change for anyone who set it (mitigated — the field was only used in this repo's own config)

**Supersedes:** The "Platform-neutral" template design principle in CLAUDE.md. Updated to "GitHub-first."
