# ADR-046: Consolidate Voss + Hamilton + Mori into Hopper

## Status

Accepted

## Context

The dev-team roster has three implementation agents with distinct domain scopes:

- **Voss** -- backend (API, data, system architecture)
- **Hamilton** -- infrastructure (CI/CD, containers, IaC, deployment)
- **Mori** -- frontend (components, accessibility, UX)

In practice, most tasks span multiple domains. Drucker must route to the "right" agent, but the boundaries are fuzzy. ADR-034 established that agents have built-in knowledge of language-specific patterns. ADR-022 encourages consolidation when capabilities overlap.

## Decision

Consolidate Voss, Hamilton, and Mori into a single **Hopper** agent (named after Grace Hopper).

- Hopper covers backend, frontend, and infrastructure implementation
- Focus areas merged from all three agents, organized by domain
- Deprecated agents retained with notices until v5.0.0
- Drucker routing maps all three domains to Hopper

## Consequences

**Positive:**
- Simpler routing (7 to 5 implementing agent choices)
- Reduced template maintenance
- Cross-domain tasks handled by one agent

**Negative:**
- Larger agent definition (~100 lines vs ~65 per predecessor)
- Existing agent memory needs migration

**Migration:**
- Deprecated agent files kept for backward compatibility
- Full removal planned for v5.0.0
