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


## Calibration Log
<!-- Recommendations accepted/deferred — tunes what to flag over time -->
