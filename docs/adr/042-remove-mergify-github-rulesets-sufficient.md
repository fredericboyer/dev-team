# ADR-042: Remove Mergify — GitHub native rulesets sufficient

Date: 2026-04-03
Status: accepted
Supersedes: ADR-041

## Context

Mergify was added (ADR-041) to enforce `#review-threads-unresolved = 0` as a merge condition — the only quality gate not natively available in GitHub branch protection at the time. Its merge queue also handled branch update cascades when "require up-to-date branches" was enabled.

In practice, Mergify's value eroded:

1. **GitHub rulesets now support `required_review_thread_resolution`.** The main branch protection ruleset has this enabled, making Mergify's thread resolution enforcement redundant.
2. **GitHub native auto-merge handled all v3.3.0 merges.** Mergify queue was NEUTRAL/SKIPPING throughout — every merge went through GitHub's auto-merge path.
3. **Mergify added operational complexity** — a third-party dependency with its own config file, conditions syntax, and failure modes, all for a gate that GitHub now provides natively.

The merge skill (ADR-040) already uses GitHub GraphQL `resolveReviewThread` to resolve threads programmatically. Combined with GitHub's native `required_review_thread_resolution` ruleset, the full quality enforcement chain is GitHub-native end-to-end.

## Decision

Remove Mergify entirely:

1. **Delete `.mergify.yml`** from the repository.
2. **Remove all Mergify references** from merge skills, learnings, and process docs.
3. **Rely on GitHub branch protection rulesets** for merge enforcement:
   - `required_review_thread_resolution: true` — all review threads must be resolved before merge
   - Required status checks — CI must pass
   - GitHub auto-merge (`gh pr merge --auto`) — triggers merge when all conditions are met
4. **Do not uninstall the Mergify GitHub App** — that is a manual admin action outside the scope of this change.

The no-approval design from ADR-041 remains in effect — quality is enforced through thread resolution and CI, not approval count. The enforcement mechanism changes from Mergify conditions to GitHub rulesets.

## Consequences

**Positive:**
- One fewer third-party dependency in the merge pipeline
- Merge enforcement is fully GitHub-native — no external service to configure, monitor, or debug
- Simpler merge skill — no conditional Mergify/non-Mergify paths
- Consistent with ADR-040's GitHub-first principle

**Negative:**
- GitHub rulesets lack Mergify's merge queue feature (automatic rebase-and-retry for stale branches). Merge cascades with "require up-to-date branches" must be handled manually or by the merge skill
- If GitHub removes or changes `required_review_thread_resolution`, there is no fallback enforcement layer
