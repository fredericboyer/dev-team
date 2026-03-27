# ADR-030: Shared agent protocol template
Date: 2026-03-26
Status: accepted

## Context

The 14 agent definitions in `templates/agents/` averaged 134 lines each (1873 total). Approximately 40-50 lines per agent were shared boilerplate duplicated across every definition:

- **Challenge protocol** — identical 6-rule classification system (DEFECT/RISK/QUESTION/SUGGESTION) with the "Silence is golden" directive
- **Learnings Output** — identical mandatory output format (MEMORY.md write + response summary)
- **What belongs in memory** — identical Write/Do-NOT-write guardrails
- **Progress reporting** — shared status file convention (ADR-026 reference)

This duplication created maintenance burden: any change to shared protocol required editing 14 files. It also inflated agent definitions with boilerplate, making it harder to see the agent-specific content that differentiates each agent.

## Decision

Extract shared protocol sections into `templates/agents/SHARED.md`. Each agent definition:
1. References SHARED.md at the top of its "How you work" section
2. Retains only agent-specific content
3. May override shared sections when its protocol differs (e.g., Borges' challenge protocol classifies knowledge defects, not code defects; Brooks adds a measurable-criterion rule)
4. Keeps a "Learnings: what to record in MEMORY.md" section listing agent-specific items to include

SHARED.md is installed alongside agent definitions by both `init` and `update`.

## Consequences

**Easier:**
- Protocol changes are single-file edits (SHARED.md)
- Agent definitions are shorter and focused on domain-specific behavior
- New agents get shared protocol automatically by referencing SHARED.md

**Harder:**
- Agents now depend on SHARED.md existing in the same directory
- Agent-specific protocol overrides require careful documentation to avoid confusion
- Total line count across all files is reduced but not eliminated — agent-specific content remains

**Metrics:**
- Before: 1873 lines across 14 agent definitions (134 avg)
- After: ~1574 lines across 15 files including SHARED.md (108 avg per agent definition, 56 lines in SHARED.md)
- Net reduction: ~16% total, ~19% per-agent average
