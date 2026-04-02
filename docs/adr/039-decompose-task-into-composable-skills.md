# ADR-039: Decompose task skill into composable sub-skills

Date: 2026-04-01
Status: accepted

## Context

The `/dev-team:task` skill is monolithic — it bundles agent selection, pre-assessment, implementation, review, merge, and extraction into a single 240-line skill definition. Users cannot invoke individual steps (e.g., "just implement without triggering review/merge/extract").

Steps 2-4 already exist as standalone skills (`/dev-team:review`, `/dev-team:merge`, `/dev-team:extract`), but Step 1 (implement) is only available as part of the full task loop. This creates an all-or-nothing experience.

ADR-035 established the skill composability pattern (orchestration skills invoking sub-skills via `--embedded`). This ADR extends that pattern to the task skill's implementation step.

## Decision

Extract Step 1 into a standalone `/dev-team:implement` skill that handles:
- Agent selection (routing table)
- Brooks pre-assessment (complexity classification, ADR needs)
- Definition of Done negotiation (COMPLEX tasks only)
- Best-practices research
- Implementation on feature branch
- Validation (non-empty diff, tests pass, relevance, clean tree)
- PR creation

The task skill becomes a pure orchestrator:
1. `/dev-team:implement --embedded` → returns branch, PR, complexity
2. `/dev-team:review --embedded` → returns findings
3. `/dev-team:merge` → merges PR
4. `/dev-team:extract` → Borges memory extraction

Each step is independently invocable by the user.

## Consequences

**Positive:**
- Users can run individual steps (e.g., implement without auto-review)
- Task skill is simpler (orchestration only, ~100 lines less)
- Follows established composability pattern from ADR-035
- Easier to test and debug individual steps

**Negative:**
- One more skill file to maintain
- Parallel mode orchestration in the task skill must coordinate with the implement skill's output format
- Users need to know which skill to invoke for their use case (mitigated by task skill being the default entry point)
