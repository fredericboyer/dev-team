# ADR-027: Turing pre-implementation researcher agent

Date: 2026-03-25
Status: accepted

## Context

No agent currently performs deep pre-implementation research. Implementing agents (Voss, Mori, Hamilton, etc.) do shallow "research current practices" as part of their implementation work, but their primary objective is shipping code. This creates a conflict of interest: the agent selecting a library is the same agent that will implement with it, biasing toward familiar options rather than optimal ones.

Tasks that involve library selection, migration paths, unfamiliar domains, or security pattern evaluation benefit from dedicated research before implementation begins. The research output (a structured brief) then serves as informed input for the implementing agent.

### ADR-022 justification (agent proliferation governance)

1. **Unique capability**: External research briefs with evidence-based recommendations. No existing agent produces standalone research artifacts.
2. **Cannot extend existing**: Implementing agents have competing objectives (ship code vs. investigate thoroughly). Brooks does architectural assessment, not external research. Szabo audits code, not pre-implementation security patterns.
3. **Justifiable cost**: On-demand only — Drucker spawns Turing only when the task warrants research. Not triggered by hooks.
4. **Non-overlapping**: External research and evidence synthesis. Does not audit code (Szabo/Knuth), assess architecture (Brooks), or write production code (implementers).

Roster goes from 12 to 13.

## Decision

Add `dev-team-turing` as an on-demand pre-implementation research agent:

- **Spawned by Drucker** before the implementing agent when a task involves library selection, migration, unfamiliar domain, or security pattern evaluation.
- **Does NOT write production code.** Writes structured research briefs to `.dev-team/research/`.
- **Model**: opus (deep synthesis requires strong reasoning).
- **Sequential pre-step**: Runs before the implementing agent (not in parallel), because the implementer needs the research brief as input.
- **On-demand only**: Not triggered by file-change hooks. Drucker evaluates whether research is needed per-task.

Research brief format includes: question, approaches evaluated, recommendation, evidence (with citations), known issues/caveats, and confidence level.

## Consequences

- Adds a sequential pre-step to Drucker's flow for research-heavy tasks. Routine tasks skip it entirely.
- Research briefs accumulate in `.dev-team/research/`. Borges manages temporal decay (90-day archive).
- Token cost is bounded by on-demand triggering — most tasks will not spawn Turing.
- Implementing agents receive better-informed context, reducing trial-and-error implementation cycles.
- Introduces a new artifact type (research briefs) that other agents can reference in future tasks.
