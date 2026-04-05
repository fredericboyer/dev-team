# ADR-045: Model tier abstraction and alloy multi-model reviews
Date: 2026-04-04
Status: accepted

## Context

dev-team agents have implicit model assignments via Claude Code's `model:` frontmatter field, but there is no project-level configuration for controlling which model each agent uses. This prevents:

1. **Cost optimization** — running advisory agents (Mori, Voss) on cheaper models while keeping review-critical agents (Szabo, Knuth, Brooks) on the most capable model.
2. **Alloy (multi-model) reviews** — running the same agent on multiple models in parallel to catch findings that a single model misses. Research (XBOW, Mozilla Star Chamber, arxiv 2510.21513) shows that cross-model ensembles can improve defect detection, with cross-family diversity being more valuable than same-family redundancy.

Claude Code supports per-agent model assignment via the `model:` frontmatter field with values `opus`, `sonnet`, `haiku`, or full model IDs. No runtime exposes a programmatic API for detecting available models, so configuration must be declarative with graceful fallback.

## Decision

Add a `models` section to `.dev-team/config.json` that maps agent names to model tiers:

```json
{
  "models": {
    "default": "opus",
    "agents": {
      "szabo": ["opus", "sonnet"],
      "knuth": ["opus", "sonnet"],
      "brooks": ["opus"],
      "voss": "sonnet",
      "mori": "sonnet"
    }
  }
}
```

**Schema rules:**
- `default` — model tier used for agents not listed in `agents`
- String value — single model, no shadow review
- Array value — ordered preference: first is primary, subsequent are shadow models for alloy reviews
- Agent names are lowercase (no `dev-team-` prefix in config)

**Alloy review tiers** are determined by the array length and the review tier:

| Review tier | Model strategy |
|------------|---------------|
| LIGHT | Primary only (first element) |
| FULL | Primary + first shadow (first two elements) |
| DEEP | All models in array |

**Finding deduplication** uses structured matching: group by (file, line range, classification), classify convergence as `unanimous` (all models), `majority` (2+ models), or `unique:{model}` (one model only). Unique findings are preserved — they are the primary value proposition of alloy reviews (per the "popularity trap" warning in arxiv 2510.21513).

**Graceful degradation**: If a shadow model fails (rate limit, plan restriction, unavailable), the review proceeds with the primary model alone. Alloy is additive — its absence degrades to current single-model behavior, not failure.

## Consequences

- Projects can tune cost vs. thoroughness per agent without changing agent definitions
- The review skill gains alloy orchestration logic for FULL and DEEP tiers
- `dev-team update` additively merges the models config (never removes user-set agent assignments)
- Future work: metrics schema extension for per-model tracking (acceptance rate, convergence rate, unique findings) to enable data-driven calibration of shadow model selections
- Cross-provider alloy (e.g., Opus + GPT-5.4 via Copilot) requires cross-runtime orchestration and is out of scope for this ADR
