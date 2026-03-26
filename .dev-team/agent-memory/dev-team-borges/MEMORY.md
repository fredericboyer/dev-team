# Agent Memory: Borges (Librarian)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Memory Health Status

### [2026-03-25] Cold start seed generation completed for all agents
- **Type**: DECISION [verified]
- **Source**: Issue #212 — cold start seed generation
- **Tags**: memory, cold-start, seeding
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: All agent MEMORY.md files populated with bootstrapped seed entries derived from package.json, tsconfig.json, CI config, ADRs, and project structure. Seeds marked [bootstrapped] with outcome pending-verification, then verified through usage.

### [2026-03-25] Memory architecture: Tier 1 shared learnings + Tier 2 agent calibration
- **Type**: PATTERN [verified]
- **Source**: CLAUDE.md + .dev-team/learnings.md analysis
- **Tags**: memory, architecture, tiers
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Tier 1 is .dev-team/learnings.md (shared facts, conventions). Tier 2 is .dev-team/agent-memory/*/MEMORY.md (agent-specific calibration). First 200 lines loaded into context. Formal decisions go to docs/adr/. Avoid copying volatile counts into agent memories — derive from source.

## System Improvement Log

### [2026-03-25] First metrics entry recorded — v1.2.0 (4 parallel branches, 17 findings)
- **Type**: MILESTONE [verified]
- **Source**: v1.2.0 release task
- **Tags**: metrics, calibration, baseline
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: First real entry in `.dev-team/metrics.md`. Establishes baseline: 0% overrule rate, 100% DEFECT fix rate, 50% advisory defer rate. Future `/dev-team:retro` runs can now trend these numbers. Knuth was sole reviewer across all 4 branches; Deming sole implementer.

### [2026-03-25] Vocabulary alignment is a cross-agent coherence risk
- **Type**: PATTERN [verified]
- **Source**: v1.2.0 Branch A finding #1
- **Tags**: coherence, vocabulary, cross-agent
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: When skill definitions produce structured output (Finding Outcome Log), the vocabulary must match what consuming agents (Borges) expect. The task skill was updated to use Borges-standard outcomes. Future skill additions should be checked for vocabulary alignment during review.

## Calibration Log
<!-- Recommendations accepted/deferred — tunes what to flag over time -->

### [2026-03-25] v1.2.0 extraction — high defer rate on advisory findings
- Knuth's 50% advisory defer rate (7/14) is not a quality problem — deferred items were legitimate follow-ups outside the PR scope. But it signals that `/dev-team:retro` should track defer-to-issue conversion (are deferred findings actually becoming issues?).
