# ADR-046: Consolidate Voss + Hamilton + Mori into Hopper agent

Date: 2026-04-04
Status: accepted

## Context

The dev-team roster had three separate implementation agents covering backend (Voss), frontend (Mori), and infrastructure (Hamilton). In practice, most tasks span multiple domains: a backend API change affects frontend consumers and may need infrastructure updates. The three-agent split created two problems:

1. **Routing overhead**: Drucker had to classify tasks into one domain, often incorrectly. Cross-cutting tasks required sequential delegation to multiple agents, adding latency and token cost.
2. **Roster pressure**: ADR-022 set a soft cap of 15 agents. At 13 agents, three implementation agents consuming three roster slots for overlapping work limited room for future specialists.

## Decision

Consolidate Voss, Hamilton, and Mori into a single full-stack implementation agent named **Hopper** (after Grace Hopper). Hopper covers backend, frontend, and infrastructure implementation.

- Voss, Hamilton, and Mori agent files are deprecated (not deleted) with a notice pointing to Hopper and this ADR. They will be removed in v5.0.0.
- All routing tables (Drucker, implement skill, review skill) point to Hopper for backend, frontend, and infrastructure domains.
- Review agents (Szabo, Knuth, Brooks, Rams) are unchanged -- they remain domain-specific read-only reviewers.
- The agent roster drops from 13 to 11 active agents.

## Consequences

**Easier:**
- Cross-cutting implementation tasks are handled by one agent without sequential handoff.
- Routing is simpler -- fewer agent selection decisions for Drucker.
- Two roster slots freed for future specialist agents (under ADR-022 cap).

**Harder:**
- Hopper's focus areas are broader, which may reduce depth in any single domain compared to a dedicated specialist.
- Existing projects using `@dev-team-voss`, `@dev-team-hamilton`, or `@dev-team-mori` directly will need to migrate references to `@dev-team-hopper` (deprecated agents still work during the transition period).
- Agent memory from Voss, Hamilton, and Mori needs manual consolidation into Hopper's MEMORY.md per project.
