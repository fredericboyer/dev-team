# Agent Memory: Borges (Librarian)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Memory Health Status

### [2026-03-24] Cold start seed generation completed for all 12 agents
- **Type**: DECISION [bootstrapped]
- **Source**: Issue #212 — cold start seed generation
- **Tags**: memory, cold-start, seeding
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: All 12 agent MEMORY.md files populated with 3-5 bootstrapped seed entries derived from package.json, tsconfig.json, CI config, ADRs, and project structure. Seeds marked [bootstrapped] with outcome pending-verification.

### [2026-03-24] Memory architecture: Tier 1 shared learnings + Tier 2 agent calibration
- **Type**: PATTERN [bootstrapped]
- **Source**: CLAUDE.md + .dev-team/learnings.md analysis
- **Tags**: memory, architecture, tiers
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Tier 1 is .dev-team/learnings.md (shared facts, benchmarks, conventions). Tier 2 is .dev-team/agent-memory/*/MEMORY.md (agent-specific calibration). First 200 lines loaded into context. Formal decisions go to docs/adr/.

### [2026-03-24] Quality benchmarks in learnings.md: 217 tests, 12 agents, 7 skills, 6 hooks
- **Type**: PATTERN [bootstrapped]
- **Source**: .dev-team/learnings.md analysis
- **Tags**: benchmarks, accuracy
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: These benchmarks drift frequently. Borges should verify and update them at end of each task cycle. Treat learnings.md as the source of truth for numeric benchmarks — avoid copying counts into agent memories without re-reading that file.

## System Improvement Log


## Calibration Log
<!-- Recommendations accepted/deferred — tunes what to flag over time -->
