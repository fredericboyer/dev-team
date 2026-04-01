# Agent Memory: Drucker (Orchestrator)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Delegation Patterns

### [2026-03-25] Three always-on reviewers + domain-specific triggers for other agents
- **Type**: PATTERN [verified]
- **Source**: CLAUDE.md + templates/agents/ analysis
- **Tags**: agents, delegation, routing
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Szabo (security), Knuth (correctness), Brooks (architecture + quality) review all code changes. Other agents triggered by file-type watch lists. Drucker routes implementation to domain specialist and spawns appropriate reviewers.

### [2026-03-25] Parallel execution model — ADR-019 governs concurrent review waves
- **Type**: PATTERN [verified]
- **Source**: docs/adr/019-parallel-review-waves.md
- **Tags**: orchestration, parallelism, review
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: Brooks assesses file independence, implementations run concurrently in worktrees, reviews batched into coordinated wave, defects route back per-branch, Borges runs once across all branches at end.

### [2026-03-25] Agent proliferation check before recommending new agents (ADR-022)
- **Type**: DECISION [verified]
- **Source**: docs/adr/022-agent-proliferation-governance.md
- **Tags**: agents, governance, delegation
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Drucker must evaluate extending existing agents before recommending new ones. 4 justification criteria required. Soft cap per ADR-022.

### [2026-03-25] Spawn reviewers as general-purpose subagents with full agent definitions
- **Type**: PATTERN [verified]
- **Source**: .claude/rules/dev-team-learnings.md
- **Tags**: orchestration, subagents, spawning
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Must load actual agent definition from .claude/agents/dev-team-*.agent.md when spawning. Do NOT use pr-review-toolkit proxies — different behavior. Use subagent_type: "general-purpose".

### [2026-03-26] Sequential chains require merge-as-you-go orchestration
- **Type**: PATTERN [verified]
- **Source**: PR #375 (fix/374), v1.5.0 process learning
- **Tags**: orchestration, merging, sequential-chains
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: When multiple issues form a dependency chain, each PR must be merged before the next agent starts. Batching merges at the end causes agents to branch from stale main, nullifying the sequencing. Drucker must integrate-as-you-go, not batch-at-end.

### [2026-03-26] Research-first orchestration for architectural changes
- **Type**: PATTERN [verified]
- **Source**: v1.6.0 session (#406, #407 research, then 14 implementation issues)
- **Tags**: orchestration, research, process
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: For releases with architectural impact, spawn Turing research briefs before implementation. v1.6.0 used two briefs (#406 rules, #407 AGENTS.md verdict) that directly shaped ADR-033, ADR-034, and 7 design principles. Research findings reduced rework vs implementing-then-discovering issues.

## Conflict Resolution Log


## Calibration Log
<!-- Delegation decisions that worked well or poorly — tunes routing over time -->
