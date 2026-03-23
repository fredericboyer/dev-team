# ADR-015: Orchestrator agent (Lead) with delegation
Date: 2026-03-22
Status: accepted

## Context
Without an orchestrator, the human must know which agent to invoke for each task type. This requires understanding the full agent roster and their domains — a cognitive burden that grows as the team expands. Tasks that span multiple domains (e.g., "add auth" touches backend, security, and tests) have no single obvious entry point.

## Decision
Add `@dev-team-lead`, an opus-powered orchestrator that:

1. **Analyzes** the task description to classify domain and type
2. **Selects** the right implementing agent (table-based mapping: backend → Voss, frontend → Mori, etc.)
3. **Spawns** reviewing agents in parallel (Szabo + Knuth always; Architect, Docs, Release conditionally)
4. **Manages** the adversarial review loop: collects findings, routes `[DEFECT]` back for fixing
5. **Resolves** conflicts: one exchange each between disagreeing agents, then escalate to the human

Lead uses **opus with full write access** — it needs deep reasoning for task analysis and write access for managing state files and delegation.

Lead does not implement code itself. It delegates to specialist agents. This keeps the separation of concerns clean: Lead routes, specialists execute.

## Consequences
- Human can give any task to `@dev-team-lead` without knowing the agent roster
- Cross-domain tasks get appropriate multi-agent coverage automatically
- The delegation table is embedded in the agent definition (not code) — adjustable per project
- Lead's conflict resolution caps at one exchange per side before escalation — prevents infinite loops
- Known gap: no iteration limit on the review loop itself (tracked for future improvement)
