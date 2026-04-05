# Research Brief: Model Tier Abstraction and Alloy Multi-Model Reviews

**Date**: 2026-04-04
**Issue**: #807
**Researcher**: Turing

---

## Question

How should dev-team implement per-agent model assignment with fallback chains, alloy (multi-model) reviews, and metrics-driven calibration? What model capabilities exist across target runtimes (Claude Code, GitHub Copilot, Codex CLI)? What patterns exist for multi-model finding synthesis?

---

## 1. Model Capability Mapping Across Runtimes

### Claude Code

**Per-agent model assignment: SUPPORTED.**

- Agent definition frontmatter supports `model:` field with values: `opus`, `sonnet`, `haiku`, full model IDs (e.g., `claude-opus-4-6`), or `inherit` (uses parent session model).
- `CLAUDE_CODE_SUBAGENT_MODEL` env var overrides model for agents **without** an explicit `model:` field. Does NOT override agents with hardcoded models.
- `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL` control what aliases resolve to.
- `availableModels` in managed/policy settings restricts model selection.
- `modelOverrides` maps Anthropic model IDs to provider-specific IDs (Bedrock ARNs, Vertex names).
- Enterprise controls can fully lock down model selection.

**Available models (current):**

| Model | API ID | Input $/MTok | Output $/MTok |
|-------|--------|-------------|---------------|
| Opus 4.6 | `claude-opus-4-6` | $5.00 | $25.00 |
| Sonnet 4.6 | `claude-sonnet-4-6` | $3.00 | $15.00 |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | $1.00 | $5.00 |

**Key limitation**: Claude Code only runs Claude models. No access to GPT, Gemini, or other providers within Claude Code sessions. Alloy reviews using non-Claude models require a different runtime.

### GitHub Copilot

**Per-agent model assignment: PARTIALLY SUPPORTED.**

- Custom agent `.agent.md` files support a `model:` property in YAML frontmatter.
- Model property works in IDE environments (VS Code, JetBrains, Eclipse, Xcode) but may be ignored on GitHub.com.
- Model picker available when assigning issues to Copilot, in PR comments, and agents panel.
- Auto mode selects based on availability and rate limiting.

**Available models (GA, April 2026):**

| Provider | Models |
|----------|--------|
| Anthropic | Claude Opus 4.6, Opus 4.5, Sonnet 4.6, Sonnet 4.5, Sonnet 4, Haiku 4.5 |
| OpenAI | GPT-5.4, GPT-5.4 mini, GPT-5.2, GPT-5.2-Codex, GPT-5.3-Codex, GPT-4.1, GPT-5 mini |
| Google | Gemini 2.5 Pro, Gemini 3 Flash (preview), Gemini 3.1 Pro (preview) |
| xAI | Grok Code Fast 1 |
| Fine-tuned | Raptor mini, Goldeneye |

**Key advantage**: Only runtime with true multi-provider model access. Copilot is the natural home for alloy reviews across model families.

**Note**: The Copilot model roster changes frequently as providers release new models and GitHub adjusts availability by plan tier. The list above reflects April 2026 GA models and should be reverified against [docs.github.com/en/copilot/reference/ai-models/supported-models](https://docs.github.com/en/copilot/reference/ai-models/supported-models) before implementation.

**Key limitation**: No programmatic API for model selection per-agent in cloud workflows. Model picker is UI-driven.

### Codex CLI

**Per-agent model assignment: SUPPORTED.**

- Custom agents defined as TOML files in `~/.codex/agents/` (personal) or `.codex/agents/` (project).
- Each agent can specify `model` and `model_reasoning_effort` fields.
- Omitted fields inherit from parent session.
- Named profiles (`[profiles.deep-review]`) allow model presets.
- `--model` CLI flag and `config.toml` `model` field for defaults.

**Available models (current):**

| Model | Input $/MTok | Output $/MTok |
|-------|-------------|---------------|
| gpt-5.4 | $2.50 | $15.00 |
| gpt-5.4-mini | lower | lower |
| gpt-5.3-codex | similar to gpt-5.4 | similar |
| gpt-5.3-codex-spark | lower (Pro only) | lower |
| o3 | $2.00 | $8.00 |
| o3-pro | $20.00 | $80.00 |

**Key limitation**: OpenAI models only. No Claude or Gemini access within Codex.

### Cross-Runtime Summary

| Capability | Claude Code | GitHub Copilot | Codex CLI |
|-----------|-------------|----------------|-----------|
| Per-agent model field | Yes (frontmatter) | Partial (IDE only) | Yes (TOML) |
| Model inheritance | Yes (`inherit`) | No explicit mechanism | Yes (omit field) |
| Multi-provider models | No (Claude only) | Yes (15+ models) | No (OpenAI only) |
| Programmatic detection | No API | No API | No API |
| Enterprise model restriction | Yes (`availableModels`) | Yes (org policies) | Limited |
| Fallback chain | No native support | Auto mode only | No native support |

**Critical finding**: No runtime exposes a programmatic API to detect available models. Detection must be inferred from configuration, plan tier, or attempted use with error handling.

---

## 2. Finding Deduplication

### The Problem

When the same agent (e.g., Szabo) runs on two different models reviewing the same diff, both may flag the same issue with different wording. "Same finding" must be determined despite different phrasing, structure, and severity assignments.

### Approaches

**A. Structured output matching (recommended)**

dev-team already uses classified findings with structured fields: severity (`[DEFECT]`, `[RISK]`, `[QUESTION]`, `[SUGGESTION]`), file:line location, category, and description. This enables:

1. **Location-based grouping**: Findings targeting the same file:line range are candidates for deduplication.
2. **Severity-category match**: Same location + same severity + same category = high-confidence duplicate.
3. **Cross-model convergence flag**: When two models independently flag the same location with the same severity, mark as "converged" (high confidence).

This is the approach used by Mozilla's Star Chamber, which classifies findings as consensus (all models), majority (2+ models), or individual (1 model only).

**B. Semantic embedding similarity**

Compute embeddings for finding descriptions and cluster by cosine similarity. Used in academic research (e.g., the SSRN architectural decision ensemble paper uses `all-mpnet-base-v2` for deduplication via K-Means clustering). Higher accuracy for paraphrased duplicates but adds embedding model dependency and latency.

**C. LLM-as-judge deduplication**

Feed all findings from all models to a judge LLM that merges duplicates. Simple but adds another LLM call and introduces the judge's own biases.

**Recommendation**: Approach A (structured matching) with location + severity + category as the dedup key. This is zero-cost, deterministic, and builds on dev-team's existing finding format. Reserve semantic embedding (Approach B) for a future enhancement if structured matching proves insufficient.

### Convergence Scoring

Findings should carry a `convergence` field:

| Value | Meaning |
|-------|---------|
| `unanimous` | All models in the alloy flagged this |
| `majority` | 2+ out of N models flagged this |
| `unique` | Only one model flagged this |

Unanimous findings should be treated as high-confidence. Unique findings from a minority model are the primary value of alloy reviews -- they catch what the primary model missed.

---

## 3. Cost/Latency of Alloy FULL Reviews

### Cost Model

A typical dev-team review involves one reviewer agent processing a diff. Assuming a moderate diff (~5K input tokens including context, ~2K output tokens for findings):

| Scenario | Models | Input Cost | Output Cost | Total | Multiplier |
|----------|--------|-----------|-------------|-------|------------|
| Single Opus 4.6 | 1 | $0.025 | $0.050 | $0.075 | 1.0x |
| FULL alloy: Opus + Sonnet | 2 | $0.040 | $0.080 | $0.120 | 1.6x |
| FULL alloy: Opus + GPT-5.4 (via Copilot) | 2 | $0.038 | $0.080 | $0.118 | 1.6x |
| DEEP alloy: Opus + Sonnet + GPT-5.4 | 3 | $0.053 | $0.110 | $0.163 | 2.2x |

For a typical COMPLEX task review with 3 reviewer agents (Szabo, Knuth, Brooks), each running FULL alloy (2 models):

- **Single-model review**: 3 agents x $0.075 = $0.225
- **FULL alloy review**: 3 agents x $0.120 = $0.360 (+60%)
- **DEEP alloy review**: 3 agents x $0.163 = $0.489 (+117%)

### Latency Impact

Alloy models run **in parallel** -- latency is the slowest model, not the sum. Since Opus 4.6 is already the slowest model in a typical review, adding a Sonnet or GPT shadow adds minimal wall-clock time. The primary cost is token consumption, not time.

### Assessment

FULL alloy (2x) is viable for COMPLEX tasks. The 60% cost increase is modest relative to the cost of a missed defect in production. DEEP alloy (3x) should be reserved for critical-path changes (security, data integrity) where the cost of a miss is high.

The LIGHT/FULL/DEEP tiering from #807 aligns well:
- **LIGHT**: Primary model only (current behavior, cheapest)
- **FULL**: Primary + one shadow model (1.6x cost, good for COMPLEX tasks)
- **DEEP**: Primary + two shadow models (2.2x cost, for critical changes only)

---

## 4. Runtime Model Availability Detection

### Current State: No Programmatic Detection

None of the three target runtimes expose an API to query "which models are available to this user right now":

- **Claude Code**: No API. Model availability depends on plan tier (Max/Pro/Enterprise), `availableModels` restrictions, and provider configuration. The Anthropic API has a Models API endpoint that lists available models, but Claude Code does not expose this to agents/hooks.
- **GitHub Copilot**: No API. Model availability depends on plan (Pro/Pro+/Business/Enterprise/Student) and changes over time. Auto mode abstracts this away.
- **Codex CLI**: No API. Model availability depends on OpenAI plan and API access.

### Recommended Approach: Config-Declared with Graceful Fallback

Rather than detecting availability at runtime, declare the model configuration statically and handle failures gracefully:

```json
{
  "models": {
    "default": "opus",
    "agents": {
      "szabo": { "primary": "opus", "shadow": "sonnet" },
      "knuth": { "primary": "opus", "shadow": "sonnet" }
    },
    "fallback": "sonnet"
  }
}
```

If a shadow model fails (rate limit, unavailable), the review proceeds with the primary model alone. The alloy review is additive -- its absence degrades to current behavior, not failure.

This is consistent with how Claude Code handles model fallback today: "Claude Code may automatically fall back to Sonnet if you hit a usage threshold with Opus."

---

## 5. Metrics Schema Extension

### Current State

dev-team tracks review metrics in `.dev-team/metrics.md` with per-agent finding counts, acceptance rates, and overrule rates. No per-model breakdown exists.

### Proposed Schema

Extend metrics to track per-agent-per-model performance:

```json
{
  "reviews": {
    "szabo": {
      "opus-4-6": {
        "findings": 12,
        "accepted": 9,
        "deferred": 2,
        "overruled": 1,
        "acceptance_rate": 0.75
      },
      "sonnet-4-6": {
        "findings": 8,
        "accepted": 5,
        "deferred": 2,
        "overruled": 1,
        "acceptance_rate": 0.625
      },
      "convergence": {
        "unanimous": 5,
        "majority": 3,
        "unique_opus": 4,
        "unique_sonnet": 3
      }
    }
  }
}
```

Key metrics for Borges to surface calibration recommendations:

| Metric | Purpose |
|--------|---------|
| `acceptance_rate` per model | Which model's findings are more useful for each agent? |
| `unique_findings` per model | Does the shadow model catch things the primary misses? |
| `convergence_rate` | What % of findings are flagged by both models? High convergence = less value from alloy |
| `unique_accepted` per model | Are the shadow model's unique findings actually useful? |

**Calibration rule**: If a shadow model's unique findings have <20% acceptance rate over 10+ reviews, it is adding noise, not value. Consider removing it from the alloy for that agent.

**Calibration rule**: If convergence rate exceeds 90% over 10+ reviews, the models are too similar. Consider a more different shadow model (e.g., swap Sonnet shadow for GPT-5.4).

---

## 6. Alloy/Ensemble LLM Patterns

### Industry Terminology

The term "alloy" is novel to dev-team. Established terminology:

| Term | Definition | Usage |
|------|-----------|-------|
| **Ensemble** | Multiple models producing outputs that are aggregated | ML/AI research (dominant term) |
| **Multi-model consensus** | Agreement detection across model outputs | Mozilla Star Chamber |
| **LLM routing** | Selecting the best model per query | RouteLLM, LLMRouter |
| **Cascade** | Progressive model escalation (cheap first, expensive if needed) | Cost optimization |
| **Mixture of Agents (MoA)** | Specialized models for subtasks, aggregated | Research papers |

**Recommendation**: Use "alloy" internally (distinctive, memorable) but document as "multi-model ensemble review" for external communication. The term maps to "Ensemble After Inference" in the academic taxonomy (category c1: non-cascade methods using multiple complete responses).

### Existing Frameworks

**Mozilla Star Chamber** (most relevant):
- Multi-LLM code review with consensus classification
- Configurable providers via `providers.json`
- Two modes: parallel (fast) and debate (iterative with anonymous feedback sharing)
- Consensus/majority/individual classification
- Open source Python package on PyPI
- No quantitative benchmarks on defect detection improvement vs single model

**LLMRouter / RouteLLM**:
- Route queries to the best single model (not ensemble)
- Cost-quality optimization
- Not directly applicable -- dev-team wants parallel multi-model, not routing

**Iterative Consensus Ensemble (ICE)**:
- Three LLMs critique each other iteratively until consensus
- 7-15% accuracy improvement over best single model (medical domain)
- 2-3 rounds typical
- Higher cost but proven improvement

**XBOW Model Alloy** (most relevant for implementation pattern):
- Multiple LLMs contribute to a single conversational thread without awareness of each other -- randomized model selection within a unified chat history
- Each model believes it authored the full conversation, creating seamless continuation without explicit coordination logic
- Key finding: **cross-provider alloys significantly outperform same-provider**. Sonnet 4.0 + Gemini 2.5 Pro achieved 68.8% success rate vs 57.5% for Sonnet 4.0 alone (11.3pp boost). Combining same-provider models (Sonnet 3.7 + Sonnet 4.0, or Sonnet + Haiku) produced only average-level performance
- Lower model correlation predicts better alloy performance (Spearman coefficient 0.46 for Sonnet+Gemini, the best-performing pair)
- Cost-neutral: total model calls stay the same (alternating models, not duplicating)
- Works best for iterative agentic loops with double-digit model calls; less effective for linear steady-progress tasks
- Open benchmarks on cybersecurity challenges (success rates: 25% → 40% → 55% across iterations)

### Taxonomy Mapping

The LLM Ensemble survey (Awesome-LLM-Ensemble) identifies three paradigms:

1. **Before inference** (routing) -- select one model per query. Not what dev-team wants.
2. **During inference** (token/span-level fusion) -- too fine-grained for review findings.
3. **After inference** (aggregate complete outputs) -- **this is what dev-team wants**. Specifically category c1: non-cascade methods where multiple models produce independent complete responses that are then merged.

---

## 7. Cross-Model Finding Synthesis

### Star Chamber Approach (recommended basis)

1. All models review independently in parallel (structured JSON output)
2. Group findings by location (file:line) and category
3. Classify agreement: consensus / majority / individual
4. Present unified report with agreement annotations

### Popularity Trap Warning

The arxiv paper "Wisdom and Delusion of LLM Ensembles" (2510.21513) found that **consensus-based voting can amplify common but incorrect outputs** -- a "popularity trap." Diversity-based selection (prioritizing varied contributions) realizes up to 95% of the theoretical ensemble potential, while pure consensus can miss critical unique findings.

**Implication for dev-team**: Do NOT discard unique findings just because only one model flagged them. Unique findings are the primary value proposition of alloy reviews. The convergence classification (unanimous/majority/unique) should inform confidence level, not filter out findings.

### XBOW Implicit Synthesis (alternative pattern)

XBOW's approach avoids explicit finding synthesis entirely. Instead of running models in parallel and merging outputs, models alternate within a single conversation thread. Each model receives the full history (including prior models' outputs) and builds on it implicitly. This is a fundamentally different pattern from Star Chamber's parallel-then-merge approach:

- **Star Chamber**: parallel execution → structured merge → convergence classification
- **XBOW**: sequential interleaving → implicit context accumulation → no merge step needed

The XBOW pattern is better suited to iterative agentic tasks (multi-step tool use) than to review (single-pass analysis). For dev-team's review use case, the Star Chamber parallel approach remains more appropriate -- but the XBOW finding that **cross-provider diversity is critical** (same-provider alloys underperform) directly informs shadow model selection.

### Practical Synthesis Algorithm

```
For each agent A running alloy review with models [M1, M2, ...]:
  1. Run all models in parallel on the same diff
  2. Collect structured findings from each model
  3. Group findings by (file, line_range, category)
  4. For each group:
     - If all models flagged it: mark "unanimous", severity = max(all)
     - If 2+ models flagged it: mark "majority", severity = max(flagging)
     - If 1 model flagged it: mark "unique:model_name", keep original severity
  5. Merge descriptions: use primary model's wording, append shadow's if substantively different
  6. Output unified finding list with convergence annotations
```

---

## 8. Alloy LLM Cost-Benefit Analysis

### Quantitative Evidence

| Source | Finding | Domain |
|--------|---------|--------|
| arxiv 2510.21513 | Theoretical ensemble upper bound: 83% above best single model | Code generation/repair |
| arxiv 2510.21513 | Diversity-based selection: realizes 95% of theoretical potential | Code generation/repair |
| ICE (ScienceDirect) | 7-15% accuracy improvement over best single model | Medical QA |
| ICE (ScienceDirect) | 2-3 iteration rounds typical for convergence | Medical QA |
| Star Chamber | No quantitative benchmarks published | Code review |
| XBOW | Cross-provider alloy: 68.8% vs 57.5% single model (11.3pp boost) | Cybersecurity agentic tasks |
| XBOW | Same-provider alloy (Sonnet variants): no significant improvement | Cybersecurity agentic tasks |
| XBOW | Lower model correlation (Spearman 0.46) predicts higher alloy boost | Cybersecurity agentic tasks |
| XBOW | Cost-neutral: alternating models keeps total call count constant | Agentic loops |
| dev-team internal | FULL reviews caught all 3 DEFECTs in v3.8.0 (single-model) | Code review |

### Assessment

No published benchmark directly measures multi-model code review defect detection vs single-model. The closest evidence comes from:

1. **Code generation ensembles** (arxiv): 83% theoretical improvement ceiling, 95% achievable with diversity heuristics. This is for generation, not review -- but the principle (models have complementary blind spots) applies.
2. **Medical QA ensembles** (ICE): 7-15% real-world improvement. Code review is more structured than open QA, so improvement may be lower but more consistent.
3. **dev-team's own data**: With single-model reviews, FULL reviews caught all 3 DEFECTs in v3.8.0. Whether alloy would have caught additional issues is unknown.

4. **Agentic task alloys** (XBOW): 11.3 percentage point improvement for cross-provider alloys (Sonnet 4.0 + Gemini 2.5 Pro) on cybersecurity challenges. Same-provider alloys showed no significant improvement. This is the strongest empirical signal that cross-family diversity is essential -- same-family shadows may not justify cost.

**Honest assessment**: There is no strong quantitative evidence that alloy reviews will catch significantly more defects than single-model reviews for code review specifically. However, XBOW's cross-provider results provide a concrete data point: diversity between model families produces measurable gains, while same-family alloys do not. This strongly favors Opus + GPT-5.4 (cross-provider) over Opus + Sonnet (same-family) for shadow reviews, despite the cross-runtime complexity. Note that XBOW's cost-neutral pattern (alternating models in a single thread) does not apply to dev-team's parallel review model, where shadow adds ~60% cost. dev-team should treat alloy reviews as experimental and measure effectiveness through its own metrics.

---

## Evidence

| Claim | Source URL | Verified |
|-------|-----------|----------|
| Claude Code supports `model:` field in agent frontmatter with `inherit` option | [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents) | yes |
| `CLAUDE_CODE_SUBAGENT_MODEL` only affects agents without explicit model | [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config) | yes |
| Claude Code model aliases: opus, sonnet, haiku, opusplan | [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config) | yes |
| `availableModels` restricts model selection in Claude Code | [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config) | yes |
| `modelOverrides` maps model IDs to provider-specific strings | [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config) | yes |
| Opus 4.6: $5/MTok input, $25/MTok output | [platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview) | yes |
| Sonnet 4.6: $3/MTok input, $15/MTok output | [platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview) | yes |
| Haiku 4.5: $1/MTok input, $5/MTok output | [platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview) | yes |
| GitHub Copilot supports 15+ models across 4+ providers | [docs.github.com/en/copilot/reference/ai-models/supported-models](https://docs.github.com/en/copilot/reference/ai-models/supported-models) | yes |
| Copilot custom agent `model:` property works in IDE only | [docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) | yes |
| Copilot coding agent model picker: Auto, Claude Sonnet 4.5, Opus 4.5, Opus 4.6, GPT-5.2-Codex | [docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/changing-the-ai-model](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/changing-the-ai-model) | yes |
| Codex CLI per-agent model in TOML config, inherits from parent | [developers.openai.com/codex/subagents](https://developers.openai.com/codex/subagents) | yes |
| Codex CLI supports profiles with different model configs | [developers.openai.com/codex/config-advanced](https://developers.openai.com/codex/config-advanced) | yes |
| GPT-5.4: $2.50/MTok input, $15/MTok output | OpenAI pricing page (via search) | yes |
| o3: $2/MTok input, $8/MTok output | OpenAI pricing page (via search) | yes |
| Star Chamber: multi-LLM consensus code review | [blog.mozilla.ai/the-star-chamber-multi-llm-consensus-for-code-quality/](https://blog.mozilla.ai/the-star-chamber-multi-llm-consensus-for-code-quality/) | yes |
| LLM ensemble theoretical upper bound: 83% above best single model | [arxiv.org/abs/2510.21513](https://arxiv.org/abs/2510.21513) | yes |
| Diversity-based selection realizes 95% of theoretical ensemble potential | [arxiv.org/abs/2510.21513](https://arxiv.org/abs/2510.21513) | yes |
| Consensus voting can fall into "popularity trap" | [arxiv.org/abs/2510.21513](https://arxiv.org/abs/2510.21513) | yes |
| ICE: 7-15% accuracy improvement over best single model | UNVERIFIED -- referenced in search results, not directly fetched | no |
| No runtime exposes API for available model detection | Verified across all three runtime docs | yes |
| Claude Code auto-falls back to Sonnet on Opus usage threshold | [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config) | yes |
| LLM Ensemble survey taxonomy: before/during/after inference | [github.com/junchenzhi/Awesome-LLM-Ensemble](https://github.com/junchenzhi/Awesome-LLM-Ensemble) | yes |
| XBOW alloy: cross-provider 68.8% vs single-model 57.5% (11.3pp boost) | [xbow.com/blog/alloy-agents](https://xbow.com/blog/alloy-agents) | yes |
| XBOW: same-provider alloys (Sonnet variants) show no significant improvement | [xbow.com/blog/alloy-agents](https://xbow.com/blog/alloy-agents) | yes |
| XBOW: lower model correlation (Spearman 0.46) predicts better alloy performance | [xbow.com/blog/alloy-agents](https://xbow.com/blog/alloy-agents) | yes |
| XBOW: alloy cost-neutral (alternating models, same total call count) | [xbow.com/blog/alloy-agents](https://xbow.com/blog/alloy-agents) | yes |

---

## Known Issues / Caveats

1. **Claude Code is single-provider.** Alloy reviews using non-Claude models (GPT, Gemini) cannot run within Claude Code. True cross-provider alloy requires either: (a) GitHub Copilot as the review runtime, (b) a separate orchestration layer calling multiple APIs, or (c) running shadow reviews as separate processes. This is the largest architectural constraint.

2. **No programmatic model availability detection.** The config-declared approach requires users to know which models their plan supports. Misconfiguration (declaring a model the user cannot access) will fail at review time. Graceful fallback mitigates but does not prevent user confusion.

3. **Alloy review value is unproven for code review.** The theoretical case is strong (83% ensemble ceiling, models have complementary blind spots), but no published benchmark measures multi-model code review defect detection specifically. dev-team would be pioneering in this space, which means relying on its own metrics for calibration.

4. **Convergence rate may render alloy reviews low-value.** If Opus and Sonnet (same model family) have >90% convergence, the shadow adds cost without proportional value. Cross-family shadows (Opus + GPT-5.4) are likely more valuable but require cross-runtime orchestration.

5. **Fallback chains serve a different purpose than runtime fallback.** Claude Code already falls back to Sonnet when Opus is throttled -- this is runtime-level throttling recovery. The dev-team fallback arrays (`[opus, sonnet, haiku]`) in issue #807 serve a different purpose: **shadow model selection** for alloy reviews. If the preferred shadow model (e.g., GPT-5.4 via Copilot) is unavailable, the fallback array selects the next-best shadow. These two layers are complementary, not duplicative: runtime fallback handles throttling; dev-team fallback handles shadow model preference.

6. **GitHub Copilot model picker is UI-driven.** Per-agent model assignment for Copilot cloud agents lacks API support. The `model:` property in custom agents works in IDEs but may be ignored on GitHub.com, limiting alloy review automation via Copilot.

7. **ICE improvement data is from medical domain.** The 7-15% improvement figure is from medical QA, not code review. Code review findings are more structured and deterministic, so ensemble improvement may be lower.

---

## Confidence Level

**Medium.** The model availability and configuration data is high-confidence (verified against official docs for all three runtimes). The alloy/ensemble pattern recommendations are medium-confidence -- the patterns are well-established in ML research and the Star Chamber provides a working implementation for code review, but no quantitative benchmark exists for the specific use case (adversarial multi-agent review with project memory).

What would increase confidence:
- Running a pilot alloy review (Opus + Sonnet) on 5-10 COMPLEX PRs and measuring unique findings per model
- Measuring convergence rate between same-family models (Opus + Sonnet) vs cross-family (Opus + GPT-5.4)
- Comparing pilot results against the theoretical improvement ceiling from the arxiv paper

---

## Recommended Actions

- **Title**: Implement per-agent model configuration in dev-team templates
  **Severity**: P1
  **Files affected**: `templates/agents/*.md` (frontmatter), `src/` (config parsing)
  **Scope**: M
  **Details**: Current agents have hardcoded `model: opus` or `model: sonnet`. Extend config to support a `models` section in `.dev-team/config.json` that maps agent names to model preferences. Agent frontmatter becomes the default; config overrides it. This is the foundation for all other #807 work.

- **Title**: Design alloy review orchestration in review skill
  **Severity**: P1
  **Files affected**: `templates/skills/dev-team-review.md`, `templates/hooks/dev-team-post-change-review.js`
  **Scope**: L
  **Details**: Extend the review skill to support LIGHT/FULL/DEEP tiers. FULL runs the same agent prompt on primary + shadow model in parallel, then merges findings using structured matching (file:line + severity + category). DEEP adds a third model. Finding format gains a `convergence` field (unanimous/majority/unique).

- **Title**: Implement finding deduplication for alloy reviews
  **Severity**: P1
  **Files affected**: New utility in `src/` or inline in review skill
  **Scope**: M
  **Details**: Structured matching algorithm: group by (file, line_range, category), classify convergence, merge descriptions. Zero external dependencies. Start with location + severity matching; add semantic similarity only if structured matching proves insufficient.

- **Title**: Extend metrics schema for per-model tracking
  **Severity**: P2
  **Files affected**: `.dev-team/metrics.md` format, Borges extraction logic
  **Scope**: M
  **Details**: Track per-agent-per-model: findings count, acceptance rate, unique findings, convergence rate. Borges surfaces calibration recommendations when shadow model unique findings have <20% acceptance rate or convergence exceeds 90%.

- **Title**: Pilot alloy review on dev-team itself
  **Severity**: P2
  **Files affected**: None (process experiment)
  **Scope**: S
  **Details**: Run 5-10 COMPLEX PR reviews with FULL alloy (Opus + Sonnet) and measure: convergence rate, unique findings per model, acceptance rate of unique findings. This provides the first real calibration data for alloy reviews.

- **Title**: Document model tier configuration in CLAUDE.md
  **Severity**: P2
  **Files affected**: `templates/CLAUDE.md.hbs`, README
  **Scope**: S
  **Details**: Document the `models` config section, explain LIGHT/FULL/DEEP tiers, and guide users on when alloy reviews provide value vs unnecessary cost.

- **Title**: Evaluate cross-provider alloy feasibility
  **Severity**: P2
  **Files affected**: Research/design only
  **Scope**: M
  **Details**: Same-family alloy (Opus + Sonnet) is easiest but may have high convergence. Cross-family (Opus + GPT-5.4) requires orchestrating across runtimes or using a direct API layer. Evaluate whether GitHub Copilot's multi-model support or a lightweight API wrapper is the right approach.
