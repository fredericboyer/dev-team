# ADR-023: Cross-model reviewer assignment for high-risk changes

Date: 2026-03-24
Status: proposed

## Context

All dev-team agents currently run on the same model family (Claude). ADR-008 differentiates by tier (Opus for analysis, Sonnet for implementation), but all tiers are from the same vendor. Research on Multi-Agent Debate (MAD) from ICLR/NeurIPS 2025 found that same-model adversarial debate consistently underperforms simpler approaches — devil's advocate patterns performed worst, adding rounds/agents showed no gains, and token consumption was 2-3x higher. However, **heterogeneous models from different vendors showed improvement**.

This aligns with the "Rise of AI Teammates in SE 3.0" finding that cross-vendor review provides stronger diversity than same-vendor adversarial prompting. The implication for dev-team is clear: reviewer agents (Szabo, Knuth, Brooks) challenging each other on the same model family may hit a diversity ceiling. Different model families have different training biases, blind spots, and reasoning patterns — a vulnerability that Claude misses may be caught by a model trained on different data.

Research synthesis recommendation R19 rates this P3 (future) because it is blocked on multi-model runtime support in Claude Code. Agent definitions currently specify `model: opus` or `model: sonnet`, which maps to Claude model tiers. There is no mechanism to specify a non-Claude model.

## Decision

Support cross-model reviewer assignment as an **aspirational capability** with the following design:

### Agent definition `model` field extension

The existing `model` field in agent frontmatter (ADR-008) will be extended to support vendor-qualified model identifiers when the runtime supports it:

```yaml
# Current (Claude-only, tier-based)
model: opus

# Future (cross-model, vendor-qualified)
model: opus
cross_model: openai:o3      # Preferred alternative model for cross-validation
```

The `cross_model` field is:

- **Optional** — agents without it run on their ADR-008 assigned tier as today
- **Ignored** by current runtimes that only support Claude models
- **Recommended** for reviewer agents (Szabo, Knuth, Brooks) on high-risk changes
- **Not recommended** for implementing agents — cross-model implementation introduces consistency risks in code style and convention adherence

### Integration with ADR-008 model tiers

ADR-008's model assignment strategy remains the primary mechanism:

- Opus for read-only analysis agents (Szabo, Knuth, Brooks)
- Opus for the orchestrator (Drucker)
- Sonnet for implementation agents

Cross-model assignment is an **overlay**, not a replacement. The `model` field remains the default. `cross_model` is activated only when:

1. The runtime supports non-Claude models
2. The change is classified as high-risk (security-sensitive, auth, crypto, or DEEP review depth)
3. The orchestrator (Drucker) explicitly requests cross-model validation

### When to use cross-model validation

Cross-model validation is recommended for:

- Security-sensitive changes (Szabo's domain): auth flows, token handling, crypto, session management
- Architectural boundary changes (Brooks's domain): module boundaries, dependency direction changes, new public APIs
- Changes triggering DEEP review depth from complexity-based triage (R8)

Cross-model validation is NOT recommended for:

- LIGHT review depth changes (typo fixes, comment updates)
- Implementation tasks (code generation should remain single-model for consistency)
- Documentation-only changes

### Activation mechanism

When multi-model runtime is available, the orchestrator (Drucker) can request cross-model validation by passing the `cross_model` preference when spawning a reviewer agent. The runtime resolves the model identifier to an available provider. If the cross-model provider is unavailable, the agent falls back to its primary `model` assignment silently.

## Consequences

- Reviewer agent definitions gain a `cross_model` field documenting the recommended alternative model — this serves as documentation of intent even before runtime support exists
- No behavioral change today — the field is aspirational and ignored by current runtimes
- When runtime support arrives, Drucker can activate cross-model validation without agent definition changes
- ADR-008's tier strategy is preserved as the default; cross-model is an additive capability
- Cost implications: cross-model validation doubles reviewer cost for activated changes (acceptable for high-risk only)
- Vendor lock-in is reduced: the architecture explicitly plans for multi-vendor model usage
- Risk: model API differences (token limits, tool calling conventions) may require adapter logic — this is a runtime concern, not an agent definition concern
