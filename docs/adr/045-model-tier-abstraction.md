# ADR-045: Model tier abstraction for multi-model reviews
Date: 2026-04-04
Status: accepted

## Context

All dev-team agents currently run on the same model. Different agents have different complexity profiles — security auditors (Szabo) and architects (Brooks) benefit from the strongest model, while simpler reviewers can use faster, cheaper models without quality loss.

Additionally, multi-model "alloy" reviews — running the same agent on two different models and deduplicating findings — can surface blind spots that a single model misses.

There was no mechanism to configure per-agent model assignment or to enable multi-model reviews.

## Decision

Add a `models` section to `.dev-team/config.json`:

```json
{
  "models": {
    "default": "opus",
    "agents": {
      "szabo": ["opus", "sonnet"],
      "knuth": ["opus", "sonnet"],
      "brooks": ["opus"],
      "voss": "sonnet"
    }
  }
}
```

### Config rules

- `default` — model tier for agents not listed in the `agents` map
- String value — single model, no fallback
- Array value — ordered: first is primary, rest are shadow models for alloy
- Agent names are lowercase without the `dev-team-` prefix
- Available tiers: `opus`, `sonnet`, `haiku`

### Alloy tiers (review depth)

The review skill determines how many models to use based on review depth:

| Review depth | Models used |
|-------------|-------------|
| LIGHT | Primary only |
| FULL | Primary + first shadow |
| DEEP | All models in array |

When alloy is active, the same agent definition runs on each permitted model in parallel. Findings are deduplicated across models, with the most specific version kept. Each finding is tagged with its source model for calibration tracking.

### Implementation

- Types (`ModelTier`, `ModelAssignment`, `ModelsConfig`) and `DEFAULT_MODELS` exported from `src/init.ts`
- `mergeModelsConfig()` handles additive backfill during `dev-team update`
- The review skill reads the config at runtime and adjusts agent spawning accordingly
- Default config assigns `opus` to all agents (backward compatible, no alloy)

## Consequences

- Projects can tune cost/quality per agent without code changes
- Alloy reviews provide cross-model validation for critical review passes
- Config is additive — existing installations get `DEFAULT_MODELS` on next update with no behavior change
- Future work: extend model assignment beyond reviews (implementation, research agents)
