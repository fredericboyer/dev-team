# ADR-020: Quality attribute assessment via expanded Brooks agent
Date: 2026-03-23
Status: accepted

## Context
The dev-team adversarial review system had deep, specialized coverage for security (Szabo) and correctness (Knuth), but several important quality dimensions had no dedicated reviewer:

- **Performance**: algorithm complexity, hot path impact, resource lifecycle, I/O patterns
- **Maintainability**: cognitive complexity, naming clarity, abstraction consistency, hidden coupling
- **Scalability**: data growth assumptions, concurrency models, bottleneck introduction

These dimensions were only caught incidentally -- when a reviewer happened to notice an issue outside their primary lens. There was no systematic coverage.

Two approaches were considered:
1. Add new specialist agents (e.g., a "Perf" agent, a "Maintainability" agent)
2. Expand an existing agent whose lens naturally encompasses these concerns

## Decision
Expand Brooks (Architect) to include a "Quality Attribute Assessment" section covering performance, maintainability, and scalability. Brooks becomes always-on for all non-test implementation code changes, matching the trigger scope of Knuth.

### Design principle: "Depth justifies separation, breadth justifies consolidation"

- **Szabo** goes deep on security with an attacker's lens -- threat modeling, attack surface analysis, vulnerability patterns. This depth justifies a dedicated agent.
- **Knuth** goes deep on correctness with a boundary lens -- edge cases, off-by-one errors, coverage gaps. This depth justifies a dedicated agent.
- **Brooks** goes broad across architectural quality attributes with a structural lens. Performance, maintainability, and scalability are all facets of "will this system hold up over time?" -- the same question Brooks already asks about coupling, layering, and module boundaries. One agent absorbing multiple related dimensions is more efficient than fragmenting across three new agents.

### Measurability requirement

Every quality attribute finding must cite a **measurable criterion**, **concrete threshold**, or **specific scenario** where the issue manifests. This prevents vague, subjective findings like "this is complex" and requires concrete statements like "this function has cyclomatic complexity >10 with 4 levels of nesting."

### Scope boundaries

Brooks covers:
- Performance (algorithm complexity, hot paths, resource lifecycle, I/O patterns)
- Maintainability (cognitive complexity, naming, abstraction consistency, hidden coupling)
- Scalability (data growth, concurrency, bottlenecks)

Brooks explicitly does NOT cover:
- **Usability/UX** -- owned by Mori (user-facing lens)
- **Availability** -- operational concern, will be owned by future Hamilton agent (#98)
- **Portability** -- owned by Deming (tooling/environment lens)

### Hook trigger change

Brooks previously triggered only on architectural boundary files (/adr/, /core/, /domain/, /lib/, build config). Now triggers on all non-test implementation code files -- the same scope as Knuth. The architectural boundary patterns still trigger Brooks with the "architectural boundary touched" message; the new always-on trigger adds "quality attribute review" for all other code files.

## Consequences
- Brooks becomes the third always-on reviewer alongside Szabo and Knuth, increasing review coverage but also review volume
- Quality dimensions that were previously uncovered now have systematic assessment
- The measurability requirement prevents finding inflation -- Brooks cannot flag vague concerns
- No new agents are introduced, keeping the agent roster manageable
- The "depth vs. breadth" principle provides a clear framework for future decisions about when to add a new agent vs. expand an existing one
- Drucker's parallel review wave now spawns three always-on agents (Szabo + Knuth + Brooks) instead of two, with a modest increase in review time
