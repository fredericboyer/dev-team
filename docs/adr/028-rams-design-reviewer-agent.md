# ADR-028: Rams design system reviewer agent

Date: 2026-03-25
Status: accepted

## Context

Mori handles frontend implementation correctness: accessibility, component state, UX patterns, and API contract compatibility. However, no agent checks design system correctness — whether implementations faithfully use design tokens, follow spacing scales, and respect component API contracts defined by the design system.

Design token drift (hardcoded colors instead of token references, ad-hoc spacing values, invalid component variant usage) creates maintenance burden that compounds over time. When a theme changes or the design system evolves, hardcoded values silently break.

Projects without a design system should not be penalized by a reviewer that produces false positives. The agent must gracefully no-op when no design token system is detected.

### ADR-022 justification (agent proliferation governance)

1. **Unique capability**: Design system correctness — token compliance, spacing scale adherence, component API validation. No existing agent reviews this.
2. **Cannot extend Mori**: Mori's focus is implementation correctness (accessibility, state, UX). Adding design system auditing to Mori creates a conflict between "does it work correctly?" and "does it use the right tokens?" — two different review lenses.
3. **Justifiable cost**: Read-only parallel reviewer. Runs alongside other reviewers, adding no sequential step. Gracefully no-ops when no design system exists.
4. **Non-overlapping**: Design token compliance is distinct from accessibility (Mori), security (Szabo), code quality (Knuth), and architecture (Brooks).

Roster goes from 13 to 14.

## Decision

Add `dev-team-rams` as a read-only design system reviewer:

- **Spawned in parallel** with other reviewers when frontend/UI files change.
- **Read-only**: Identifies violations. Mori implements fixes.
- **Model**: sonnet (pattern matching and compliance checking, not deep synthesis).
- **Graceful no-op**: Detects whether a design token system exists before reviewing. Reports "No design token system detected — skipping review" and exits when none is found.
- **Auto-triggered**: Same frontend/UI file patterns that trigger Mori also trigger Rams via the post-change-review hook.

## Consequences

- One additional reviewer for UI changes, running in parallel with existing reviewers (no added latency).
- No impact on non-frontend projects or projects without design systems (graceful no-op).
- Design token drift is caught during review instead of discovered during theme changes.
- Clear separation: Rams identifies design system violations, Mori fixes them.
