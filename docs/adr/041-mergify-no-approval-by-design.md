# ADR-041: Mergify no-approval merge queue by design

Date: 2026-04-02
Status: accepted

## Context

Dev-team operates an agent-driven workflow where PRs are produced by AI agents and reviewed by automated review bots (Copilot code review, dev-team reviewer agents). The merge skill (ADR-040) already enforces a strict protocol before any PR reaches the merge queue:

1. Wait for reviewer workflows to complete (Copilot, bots)
2. Read and address every review finding
3. Reply to each unresolved thread with a concrete response
4. Resolve all threads via GraphQL `resolveReviewThread`
5. Only then proceed to merge

Traditional GitHub branch protection requires human approval (1+ approving review) before merge. In an agent-driven workflow, this creates a bottleneck: every PR blocks on a human who may not be available, even when automated reviewers have already validated the change. This defeats the purpose of autonomous agent execution.

Mergify's merge queue conditions use `#review-threads-unresolved = 0` as the quality gate instead of approval count. This means quality is enforced by thread resolution — not by who clicked "Approve."

## Decision

The Mergify merge queue does **not** require human approval. Quality enforcement relies on:

1. **Automated review bots** — Copilot code review and/or dev-team reviewer agents produce findings as review threads.
2. **Thread resolution protocol** — the merge skill must address and resolve every thread before merge (enforced by `#review-threads-unresolved = 0` in both `queue_rules` and `pull_request_rules`).
3. **CI passage** — all checks must pass with no pending or failed checks (`#check-success >= 1`, `#check-pending = 0`, `#check-failure = 0`).

Human approval is not in the conditions. A human can still block a PR by:
- Submitting a review with unresolved threads (blocks via `#review-threads-unresolved = 0`)
- Requesting changes (creates an unresolved review thread)
- Adding a comment that the merge skill must address before proceeding

## Consequences

**Positive:**
- Agent-produced PRs merge without human bottleneck, enabling fully autonomous batch execution
- Quality is enforced structurally (thread resolution + CI) rather than ceremonially (approval click)
- Human intervention is still possible — opening a thread is sufficient to block
- Consistent with ADR-040's reviewer-agnostic design: the system enforces *thread resolution*, not *who reviewed*

**Negative:**
- A misconfigured or overly permissive review bot could let issues through (mitigated by using multiple reviewers: Copilot + dev-team agents)
- No human in the loop by default — teams that want mandatory human review must add `#approved-reviews-by >= 1` to Mergify conditions
- Relies on review bots producing substantive findings — if bots miss something, no human safety net catches it automatically
