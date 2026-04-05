# ADR-046: Consolidate Voss + Hamilton + Mori into Hopper

## Status
Accepted

## Context
Three implementation agents (Voss/backend, Hamilton/infrastructure, Mori/frontend) have fuzzy boundaries. Most tasks span multiple domains, causing mis-routing. Modern AI models have strong built-in cross-domain knowledge, making domain-specific prompts marginal. ADR-022 soft cap is 15; consolidation reduces roster from 13 to 11.

## Decision
Consolidate into a single **Hopper** agent (named after Grace Hopper). Deprecated agents retain definitions for backward compatibility.

## Consequences
- Simpler routing, reduced token overhead, fewer competing agents
- Longer agent definition, loss of domain-specific naming
- Deprecated files kept; full removal in next major version
