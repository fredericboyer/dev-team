# Agent Memory: Drucker (Orchestrator)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Delegation Patterns

### [2026-03-24] 12 agents with domain-specific triggers — 3 always-on reviewers
- **Type**: PATTERN [bootstrapped]
- **Source**: CLAUDE.md + templates/agents/ analysis
- **Tags**: agents, delegation, routing
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Szabo (security), Knuth (correctness), Brooks (architecture + quality) review all code changes. Other agents triggered by file-type watch lists. Drucker routes implementation to domain specialist and spawns appropriate reviewers.

### [2026-03-24] Parallel execution model — ADR-019 governs concurrent review waves
- **Type**: PATTERN [bootstrapped]
- **Source**: docs/adr/019-parallel-review-waves.md
- **Tags**: orchestration, parallelism, review
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Brooks assesses file independence, implementations run concurrently in worktrees, reviews batched into coordinated wave, defects route back per-branch, Borges runs once across all branches at end.

### [2026-03-24] Agent proliferation check before recommending new agents (ADR-022)
- **Type**: DECISION [bootstrapped]
- **Source**: docs/adr/022-agent-proliferation-governance.md
- **Tags**: agents, governance, delegation
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Drucker must evaluate extending existing agents before recommending new ones. 4 justification criteria required. Soft cap of 15 agents. Currently at 12.

### [2026-03-24] Spawn reviewers as general-purpose subagents with full agent definitions
- **Type**: PATTERN [bootstrapped]
- **Source**: .dev-team/learnings.md
- **Tags**: orchestration, subagents, spawning
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Must load actual agent definition from .dev-team/agents/dev-team-*.md when spawning. Do NOT use pr-review-toolkit proxies — different behavior. Use subagent_type: "general-purpose".

## Conflict Resolution Log


## Calibration Log
<!-- Delegation decisions that worked well or poorly — tunes routing over time -->
