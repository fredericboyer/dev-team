# Agent Memory: Borges (Librarian)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Memory Health Status

### [2026-03-25] Cold start seed generation completed for all agents
- **Type**: DECISION [verified]
- **Source**: Issue #212 — cold start seed generation
- **Tags**: memory, cold-start, seeding
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: All agent MEMORY.md files populated with bootstrapped seed entries derived from package.json, tsconfig.json, CI config, ADRs, and project structure. Seeds marked [bootstrapped] with outcome pending-verification, then verified through usage.

### [2026-03-25] Memory architecture: Tier 1 shared learnings + Tier 2 agent calibration
- **Type**: PATTERN [verified]
- **Source**: CLAUDE.md + .dev-team/learnings.md analysis
- **Tags**: memory, architecture, tiers
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Tier 1 is .dev-team/learnings.md (shared facts, conventions). Tier 2 is .dev-team/agent-memory/*/MEMORY.md (agent-specific calibration). First 200 lines loaded into context. Formal decisions go to docs/adr/. Avoid copying volatile counts into agent memories — derive from source.

## System Improvement Log

### [2026-03-25] First metrics entry recorded — v1.2.0 (4 parallel branches, 17 findings)
- **Type**: MILESTONE [verified]
- **Source**: v1.2.0 release task
- **Tags**: metrics, calibration, baseline
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: First real entry in `.dev-team/metrics.md`. Establishes baseline: 0% overrule rate, 100% DEFECT fix rate, 50% advisory defer rate. Future `/dev-team:retro` runs can now trend these numbers. Knuth was sole reviewer across all 4 branches; Deming sole implementer.

### [2026-03-25] Vocabulary alignment is a cross-agent coherence risk
- **Type**: PATTERN [verified]
- **Source**: v1.2.0 Branch A finding #1
- **Tags**: coherence, vocabulary, cross-agent
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: When skill definitions produce structured output (Finding Outcome Log), the vocabulary must match what consuming agents (Borges) expect. The task skill was updated to use Borges-standard outcomes. Future skill additions should be checked for vocabulary alignment during review.

## Calibration Log
<!-- Recommendations accepted/deferred — tunes what to flag over time -->

### [2026-03-25] v1.2.0 extraction — high defer rate on advisory findings
- Knuth's 50% advisory defer rate (7/14) is not a quality problem — deferred items were legitimate follow-ups outside the PR scope. But it signals that `/dev-team:retro` should track defer-to-issue conversion (are deferred findings actually becoming issues?).

### [2026-03-26] v1.5.0 extraction — 18 findings, 100% acceptance, 1 round to convergence
- **Type**: MILESTONE [verified]
- **Source**: v1.5.0 task loop (14 issues, 15 PRs)
- **Tags**: metrics, calibration, extraction
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: Largest task batch to date. 8 DEFECTs + 10 advisory, all fixed in first pass. Copilot was the primary reviewer (no in-team agents reviewing). Brooks provided pre-assessment. Key process learnings: merge-as-you-go for sequential chains, Copilot comments must be monitored during delivery not just at merge time. 3 new ADRs, SHARED.md extraction, process.md extraction, platform detection, scorecard skill added. Cleaned up 2 bootstrapped entries (Turing "first install", Rams "first install").

### [2026-03-26] v1.5.1 extraction — 6 findings, 1 fixed, 5 ignored (install artifacts)
- **Type**: MILESTONE [verified]
- **Source**: v1.5.1 hotfix (#397, PR #398)
- **Tags**: metrics, calibration, extraction
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: Small hotfix. High ignore rate (83%) is not a signal quality issue — 5 ignored findings were all about local install artifact paths (hook files not committed to repo). The 1 DEFECT (contradiction in process.md) was fixed. New memory entries written for Deming (guarded files) and Conway (guarded files + update testing). Design principle "Don't encode what agents already know" was already in learnings from a prior commit in this session.

### [2026-03-26] Deming pattern duplication entry superseded
- **Type**: COHERENCE [resolved]
- **Source**: cross-agent audit
- **Tags**: coherence, deming, patterns
- **Outcome**: resolved
- **Last-verified**: 2026-03-26
- **Context**: Deming had a RISK entry about review-gate pattern duplication. This was resolved in PR #344 (agent-patterns.json extraction). Updated entry from [acknowledged] to [resolved].

### [2026-03-26] Full codebase audit extraction — 37 findings, 3 agents, 11 issues
- **Type**: MILESTONE [verified]
- **Source**: /dev-team:audit (Szabo, Knuth, Deming)
- **Tags**: metrics, calibration, extraction, audit
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: First formal audit (not task-driven). 37 findings (2 DEFECT, 11 RISK, 4 QUESTION, 20 SUGGESTION), 100% acceptance, 0% overrule. 11 issues created (#431-#441). Cross-agent coherence: Knuth K1/K3 and Deming D8/D9 independently flagged same migration drift — confirms pattern. New shared learning: migration completeness. New memory entries: Szabo (3), Knuth (4), Deming (4). All agent acceptance rates remain at or above 100% — no noise signal.

### [2026-03-26] v1.6.0 extraction — 16 PRs, Copilot-only review, no formal wave
- **Type**: MILESTONE [verified]
- **Source**: v1.6.0 task loop (16 issues, 16 PRs)
- **Tags**: metrics, calibration, extraction
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: Major architectural release. Research-first approach (Turing #406, #407). No formal review wave — Copilot sole reviewer. All findings addressed inline. 2 new ADRs (033, 034), 7 design principles codified. Key coherence update: Conway's guarded files entry updated for rules migration. New entries written for Deming (2), Tufte (2), Turing (2), Voss (1), Brooks (2), Drucker (1). Process learnings added to shared learnings (research-first, verify against official docs).
