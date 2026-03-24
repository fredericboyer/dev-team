# ADR-013: Active hook spawning via tracking file
Date: 2026-03-22
Status: superseded

**Superseded by**: Issue #113 — the tracking file (`dev-team-review-pending.json`) was removed because it caused orphaned-file bugs that blocked commits. The post-change-review hook now relies solely on stateless stdout output and CLAUDE.md directives to enforce agent spawning. The pre-commit gate no longer checks for a tracking file.

## Context
Prior to this change, all review hooks were advisory — they printed "Flag for review: @dev-team-szabo" to stdout and exited 0. These messages scrolled past in hook output and were consistently ignored. The result: README went stale across 3 releases, Release agent never reviewed changelogs, Docs agent was never invoked.

The core problem: the gap between "flag" and "action" was bridged only by human memory, which is unreliable.

## Decision
Convert the review system from advisory to enforced via a two-hook coordination mechanism:

**Post-change-review hook** (PostToolUse on Edit/Write):
1. Outputs `ACTION REQUIRED — spawn these agents as background reviewers` (directive, not suggestion)
2. Writes flagged agent names to `.dev-team/review-pending.json`

**Pre-commit gate** (TaskCompleted):
1. Reads the tracking file
2. If pending reviews exist → **exit 2 (BLOCK)** with list of unspawned agents
3. If no pending reviews → exit 0 (allow)

**CLAUDE.md template** adds a mandatory section: "Hook directives are MANDATORY" instructing the LLM to spawn agents when hooks direct it.

**Escape hatch**: delete `.dev-team/review-pending.json` for trivial changes.

## Consequences
- Reviews can no longer be silently skipped — the commit is blocked
- LLM must act on hook output, not just observe it
- The tracking file creates a coordination channel between two hooks across time
- Trivial changes require manual override (delete tracking file) — acceptable friction
- Hooks still can't spawn agents directly (platform limitation) — they rely on the LLM following CLAUDE.md directives
