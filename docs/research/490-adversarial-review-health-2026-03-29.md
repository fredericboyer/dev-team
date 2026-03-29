# Research Brief: Adversarial Review Health — Calibration Thresholds for AI Code Review Agents

## Question

What overrule/acceptance rates indicate healthy calibration versus rubber-stamping versus over-flagging in an adversarial AI code review system? What evidence-based thresholds should Borges monitor to detect calibration drift?

## Context

Dev-team's adversarial review agents (Szabo, Knuth, Brooks) have produced findings across 7 releases (v1.2.0–v1.8.0). The aggregate metrics show:

- **0% overrule rate** — no finding was ever disputed by the human
- **100% DEFECT fix rate** — every DEFECT was fixed
- **Only 2 of 5 feature releases** (v1.2.0, v1.7.0) ran the full adversarial loop; v1.5.0, v1.6.0, and v1.8.0 used Copilot-only review
- **Acceptance rate range**: 17%–100% (17% was v1.5.1, where 5 of 6 Copilot findings were irrelevant install artifacts)

The central concern: is 0% overrule healthy calibration or a compliance culture where the human never pushes back?

---

## Approaches Evaluated

### 1. Human Code Review Baselines

**Microsoft (Bosu et al., 2015):** Studied code review comment usefulness at Microsoft. Found 34.5% of comments were "not useful," meaning ~65.5% were useful or somewhat useful. Usefulness was defined as whether a comment led to a code change within 10 nearby lines.

**Cross-project datasets** (Ahmed et al., 2023 survey):
| Dataset | Useful | Not Useful | Usefulness Rate |
|---------|--------|------------|-----------------|
| RevHelper (commercial) | 879 | 602 | 59% |
| Chromium Conversation | 2,994 | 800 | 79% |
| OpenDev Comment | 2,052 | 602 | 77% |

**Google (Sadowski et al., 2018):** Modern Code Review at Google found that code review is primarily valued for knowledge transfer and code understanding rather than bug-finding. Over 35% of changes modify only a single file. The review culture emphasizes speed (median <4 hours for full review cycle). No specific dispute rate published, but Google's eng-practices documentation explicitly addresses "handling pushback" as a normal, expected part of the review process — not a failure signal.

**Key finding:** In healthy human review, 59–79% of comments lead to code changes. The remaining 21–41% are not acted upon — a mix of already-known issues, low-priority suggestions, and legitimate disagreements. An acted-upon rate below 50% signals noise; above 80% is excellent.

### 2. AI Code Review Precision Benchmarks

AI review tools have been extensively benchmarked in 2025–2026, providing direct comparisons for "what percentage of flagged issues are real."

**Propel Benchmark (2026)** — 50 real-world bugs across 5 repos:

| Tool | Precision | Recall | F-score |
|------|-----------|--------|---------|
| Propel | 68% | 61% | 64% |
| Codex Code Review | 68% | 29% | 41% |
| Cursor Bugbot | 60% | 41% | 49% |
| Greptile | 45% | 45% | 45% |
| CodeRabbit | 36% | 43% | 39% |
| Claude Code | 23% | 51% | 31% |
| GitHub Copilot | 20% | 34% | 25% |

**CodeAnt Benchmark (2026)** — 200,000 real PRs, developer-behavior-based (comment → code change = true positive):

| Tool | Precision | Recall | F1 |
|------|-----------|--------|-----|
| Qodo Extended | 62.3% | 66.4% | 64.3% |
| Augment | 47.0% | 62.8% | 53.8% |
| CodeAnt AI | 52.2% | 51.1% | 51.7% |
| Cursor Bugbot | 46.2% | 43.8% | 44.9% |
| GitHub Copilot | 26.6% | 53.3% | 35.5% |
| Claude Code Reviewer | 37.3% | 40.9% | 39.0% |

**Augment Benchmark (2026)** — 50 PRs across 5 large open-source projects (Sentry, Grafana, Cal.com, Discourse, Keycloak):
- Best tool (Augment): 65% precision
- Claude Code: ~51% recall but much lower precision
- Context retrieval quality was the dominant factor differentiating tools

**Key finding:** Unfiltered AI code review precision ranges from 20% (Copilot) to 68% (best-in-class). The industry median is roughly 40–50%. Claude without filtering has 23–37% precision — meaning 63–77% of its comments are false positives. **A filtering/judge layer is essential** to achieve useful signal-to-noise ratios.

### 3. SAST False Positive Benchmarks

Static analysis provides the closest analogy to automated review — both produce findings that require human triage.

| Source | Raw FP Rate | After Filtering |
|--------|-------------|-----------------|
| NIST (Java SAST) | 78% | — |
| OWASP Benchmark (DAST) | 82% | — |
| Ghost Security (2025, open-source) | 91% (180 real / 2,116 flagged) | — |
| OX Security (2026, 250 orgs) | 99.9% noise (795 critical / 216M alerts) | 0.092% critical |
| Veracode (enterprise, tuned) | — | <1.1% |
| SonarQube (OWASP benchmark) | — | ~1% |
| Checkmarx (2024 Tolly) | 36.3% | — |
| LLM-filtered SAST (2025 research) | — | single-digit % |

**Semgrep Assistant (2025):** Achieves 95% agreement rate with human triage decisions across 250,000+ findings. Maintains a minimum 90% accuracy threshold. Key feature: "triage memories" — the system learns from developer decisions, achieving 2.8x improvement with just 5 memories at one Fortune 500 customer.

**Mend.io benchmark:** Well-tuned SAST deployments achieve 10–20% false positive rates, versus 60–90% out-of-box.

**Key finding:** Raw automated analysis has 60–91% false positive rates. With tuning, filtering, and context, best-in-class achieves <5%. The critical metric is not the raw rate but the **trend** — if developers dismiss >50% of findings as "won't fix" or "not applicable," the signal-to-noise ratio has collapsed.

### 4. AI-Generated Code Rejection Rates

**LinearB (2026)** — 8.1M PRs across 4,800 engineering teams:
- AI-generated PR acceptance: 32.7% (vs 84.4% for manual PRs)
- **67.3% rejection rate** for AI-generated PRs
- 77% of merge approvals remain human-controlled despite 67% AI usage in coding
- AI PRs wait 4.6x longer before review but are reviewed 2x faster once picked up

**Key finding:** Reviewers reject ~2/3 of AI-generated PRs. This establishes that healthy review involves substantial pushback — a 0% rejection rate across AI-generated work would be a red flag.

### 5. Signal-to-Noise Framework

Jet Xu's signal-to-noise framework for AI code review proposes a three-tier classification:

- **Tier 1 (Critical Signal):** Runtime errors, breaking changes, security vulnerabilities
- **Tier 2 (Important Signal):** Architectural inconsistencies, performance degradation, maintainability risks
- **Tier 3 (Noise):** Style suggestions, subjective opinions, micro-optimizations

**Signal Ratio** = (Tier 1 + Tier 2) / Total comments

| Rating | Signal Ratio |
|--------|-------------|
| Excellent | >80% |
| Good | >60% |
| Needs improvement | 40–60% |
| Poor | <40% |

Real-world comparison: CodeRabbit 21% signal ratio vs LlamaPReview 61%.

**Key finding:** Dev-team's classification system (DEFECT/RISK/QUESTION/SUGGESTION) maps cleanly to this framework. DEFECT = Tier 1, RISK = Tier 2, QUESTION/SUGGESTION = potentially Tier 2 or Tier 3 depending on specificity.

---

## Recommendation

Dev-team's 0% overrule rate across a small sample (n=79 total findings across 7 releases, of which only ~24 came from in-team adversarial agents) is **not yet diagnostic**. The sample is too small and too dominated by Copilot-only releases. However, several evidence-based principles should guide Borges's calibration monitoring going forward.

### Interpreting the Current 0% Overrule Rate

Three hypotheses explain 0% overrule with equal plausibility given the data:

1. **Well-calibrated agents** — agents flag real issues, human agrees because they are real. Supported by: 100% DEFECT fix rate, all DEFECTs were genuine code defects (symlink hardening, path correctness, process.exit stubs).

2. **Compliance culture** — human accepts everything without critical evaluation. Partially supported by: the human has never pushed back on a single finding across 7 releases. Counter-evidence: v1.5.1 had 83% ignore rate (5/6 Copilot findings ignored), showing the human does discriminate.

3. **Insufficient adversarial coverage** — only 2 of 5 feature releases ran the full adversarial loop, so the "0% overrule" is measured against too few in-team review cycles. Strongly supported by the data.

**Assessment:** Hypothesis 3 is most likely. The 0% overrule rate is an artifact of insufficient sample size, not a calibration signal. With #486 forcing review delegation through the task skill, future releases will generate the data needed to distinguish hypotheses 1 and 2.

### Evidence-Based Thresholds for Borges

Based on the evidence gathered, these thresholds should be monitored per release cycle:

#### A. Acceptance Rate (findings acted upon / total findings)

| Band | Interpretation | Action |
|------|---------------|--------|
| >85% | Excellent calibration or possible compliance culture | If sustained >3 releases AND overrule rate = 0%, flag for human review of agent finding quality |
| 60–85% | Healthy — agents finding real issues, some advisory noise filtered | Optimal operating range |
| 40–60% | Borderline — review agents may be generating noise | Investigate: are ignored findings Tier 3 noise? If so, calibrate agents to reduce SUGGESTION volume |
| <40% | Over-flagging — agents producing more noise than signal | Trigger recalibration: review recent SUGGESTION/QUESTION findings, add suppression rules for recurring false positive patterns |

**Evidence basis:** Microsoft usefulness studies (59–79% useful), Propel/CodeAnt precision benchmarks (best-in-class 62–68%), signal-to-noise framework (>60% = good).

#### B. Overrule Rate (findings explicitly rejected by human / total findings)

| Band | Interpretation | Action |
|------|---------------|--------|
| 0% (n<30) | Insufficient data | No action — continue collecting |
| 0% (n>=30) | Either excellent calibration or rubber-stamping | Apply compliance culture detection (see Section C below) |
| 1–10% | Healthy disagreement | Optimal range — agents flag edge cases, human catches false positives |
| 10–25% | Moderate recalibration needed | Review overruled findings for patterns; add calibration rules for recurring categories |
| >25% | Agent noise is blocking productivity | Urgent recalibration: agents are wasting human review time |

**Evidence basis:** SAST tuned FP rates (10–20% after tuning), AI code review precision gaps (32–77% false positive rates unfiltered). The 1–10% healthy range accounts for dev-team's filtering advantages (memory, learnings, project context) that unfiltered tools lack.

**Important caveat on 0% overrule:** A persistent 0% overrule rate is not inherently alarming IF the acceptance rate is in the 60–85% band. The v1.5.1 release demonstrated that the human ignores irrelevant findings (83% ignore rate), which is healthy discrimination even without formal "overrule." The danger signal is 0% overrule combined with >85% acceptance AND high SUGGESTION volume — that pattern suggests the human is not critically evaluating advisory findings.

#### C. Compliance Culture Detection (Rubber-Stamping Signals)

Rubber-stamping cannot be detected by a single metric. Borges should flag when **3+ of these signals** co-occur:

1. **Acceptance rate >90% for 3+ consecutive releases** — human accepts nearly everything
2. **Overrule rate = 0% with n>=30 findings** — human never pushes back
3. **Time-to-resolution <5 minutes per finding** — findings accepted faster than they can be read and evaluated
4. **No QUESTION findings generate discussion** — questions are answered with acceptance, not investigation
5. **DEFECT-to-advisory ratio <1:5** — very few blockers relative to advisory noise (suggests agents are padding reports)
6. **Ignore rate = 0%** — even clearly irrelevant findings are accepted (compare to v1.5.1's healthy 83% ignore rate)

**Evidence basis:** SSW Rules on rubber-stamp detection (speed, no comments, large PRs approved without discussion), HubSpot's "silence is golden" principle (value comes from not commenting when there is nothing to say), LinearB's finding that AI PRs get waved through faster.

#### D. DEFECT-to-Advisory Ratio

| Band | Interpretation |
|------|---------------|
| 1:1 to 1:3 | High signal — agents finding real defects alongside reasonable advisory context |
| 1:3 to 1:8 | Normal — most findings are advisory, defects are rare (which is good for a codebase) |
| 1:8+ | Possible noise — agents may be generating advisory findings to fill the review |
| 0 DEFECTs, 10+ advisories | "Silence is golden" violation — if there are no defects, a short review with 2–3 targeted observations is better than 10+ suggestions |

**Dev-team current data:**
- v1.2.0: 3 DEFECT, 14 advisory (1:4.7) — healthy
- v1.7.0: 3 DEFECT (unique), 4 advisory (unique) (1:1.3) — excellent signal
- Full audit: 2 DEFECT, 35 advisory (1:17.5) — expected for a full audit (broader sweep)

#### E. Per-Agent Calibration Drift

Monitor each agent's metrics independently. Drift signals:

| Signal | Detection | Action |
|--------|-----------|--------|
| Rising SUGGESTION volume, stable DEFECT count | Agent generating noise to fill reviews | Review agent's recent SUGGESTION findings; add "silence is golden" reinforcement |
| Falling DEFECT count, rising acceptance rate | Agent becoming too agreeable | Compare to codebase complexity — if complexity is growing but DEFECTs are falling, agent may be under-flagging |
| Single agent's acceptance rate diverges >20% from others | Asymmetric calibration | Investigate: is the divergent agent's domain genuinely different, or is it miscalibrated? |
| Same finding type overruled 3+ times | Systematic false positive pattern | Promote to calibration rule in agent memory: "Do not flag [pattern] in this codebase" |

---

## Evidence

### Academic / Industry Studies
- [Modern Code Review: A Case Study at Google](https://research.google/pubs/modern-code-review-a-case-study-at-google/) — Sadowski et al., ICSE 2018
- [Characteristics of Useful Code Reviews: An Empirical Study at Microsoft](https://www.microsoft.com/en-us/research/publication/characteristics-of-useful-code-reviews-an-empirical-study-at-microsoft/) — Bosu et al., MSR 2015
- [Exploring the Advances in Identifying Useful Code Review Comments](https://arxiv.org/html/2307.00692) — Ahmed et al., 2023 survey of usefulness datasets
- [DORA 2025 Report](https://dora.dev/research/2025/dora-report/) — 90% AI adoption increase correlates with +9% bugs, +91% review time
- [Multi-Agent Debate Underperforms](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/) — ICLR 2025: devil's advocate pattern performs worst

### AI Code Review Benchmarks
- [Propel AI Code Review Benchmarks 2026](https://www.propelcode.ai/benchmarks) — Claude Code: 23% precision, 51% recall
- [CodeAnt AI Benchmark 2026](https://www.codeant.ai/blogs/ai-code-review-benchmark-results-from-200-000-real-pull-requests) — 200K PRs, 17 tools, precision 26–62%
- [Augment Code Review Benchmark 2026](https://www.augmentcode.com/blog/we-benchmarked-7-ai-code-review-tools-on-real-world-prs-here-are-the-results) — 50 PRs, 5 large OSS projects
- [Greptile AI Code Review Benchmarks 2025](https://www.greptile.com/benchmarks) — 50 bugs, 5 tools, catch rate 6–82%

### SAST / Static Analysis
- [SAST False Positives: 91% Are Noise](https://www.pixee.ai/blog/sast-false-positives-reduction) — Pixee, Ghost Security 91% FP rate, OX Security 0.092% critical rate
- [SAST Tools False Positive Comparison](https://www.mobb.ai/blog/sast-tools-false-positive-comparison) — Veracode <1.1%, Checkmarx 36.3%, SonarQube ~1%
- [Semgrep AI Noise Filtering](https://semgrep.dev/blog/2025/announcing-ai-noise-filtering-and-triage-memories/) — 95% agreement rate, triage memories
- [OWASP Benchmark Project](https://owasp.org/www-project-benchmark/) — NIST: 78% FP rate for Java SAST

### AI Code Generation Quality
- [LinearB 2026 Software Engineering Benchmarks](https://linearb.io/resources/software-engineering-benchmarks-report) — 67.3% AI PR rejection rate, 8.1M PRs, 4,800 teams
- [HubSpot Sidekick](https://www.infoq.com/news/2026/03/hubspot-ai-code-review-agent/) — 80% thumbs-up rate with judge filtering

### Signal-to-Noise Frameworks
- [Drowning in AI Code Review Noise?](https://jetxu-llm.github.io/posts/low-noise-code-review/) — Signal ratio framework, >60% good, >80% excellent
- [Google eng-practices: Handling Pushback](https://google.github.io/eng-practices/review/reviewer/pushback.html) — pushback is normal and expected

---

## Known Issues / Caveats

1. **Small sample size.** Dev-team has only 79 total findings across all releases, with only ~24 from in-team adversarial agents (v1.2.0 and v1.7.0). Statistical confidence in any rate is low. The thresholds proposed here should be treated as starting points, recalibrated after 3–5 more full adversarial review cycles.

2. **Benchmark methodology variance.** The Propel, CodeAnt, and Augment benchmarks use different definitions of "true positive" (curated bug set vs developer behavior vs expert annotation). Precision numbers are not directly comparable across benchmarks. Dev-team's "acceptance" (human acts on finding) is closest to CodeAnt's methodology.

3. **Copilot as reviewer is not equivalent to in-team agents.** Copilot has 20–27% precision in benchmarks. Dev-team's Szabo/Knuth/Brooks operate with project-specific memory, learnings, and structured challenge protocols — they should substantially outperform generic Copilot. The high acceptance rate on Copilot-only releases (v1.5.0, v1.6.0, v1.8.0) may not predict in-team agent acceptance rates.

4. **Human review studies are from 2015–2018.** The Microsoft and Google studies predate AI-assisted development. The dynamics of human-AI review interaction may differ from human-human review. No empirical data yet on how humans interact with adversarial AI agent findings specifically.

5. **Overrule rate of 0% is not inherently bad.** Unlike SAST tools where 91% FP is the norm, dev-team's agents have project context, memory, and ADRs — they should have substantially fewer false positives. If agents are well-calibrated, 0% overrule with 60–85% acceptance is the ideal state, not a warning sign.

---

## Confidence Level

**Medium.** The individual data points (AI review precision, SAST FP rates, human review usefulness) are well-established across multiple independent studies. However, the specific combination — adversarial AI agents with project memory reviewing AI-generated code with human triage — has no direct empirical precedent. The thresholds proposed are synthesized from adjacent domains and should be validated against dev-team's own data over the next 3–5 releases.

What would increase confidence to High:
- 50+ findings from in-team adversarial review cycles (requires ~3 more full releases with #486 enforcing review delegation)
- At least 1 human overrule to establish that the overrule pathway works and the human is willing to use it
- Per-agent acceptance rate divergence data (requires consistent multi-agent review waves)

---

## Recommended Actions

- **Title**: Implement Borges calibration health monitoring with evidence-based thresholds
  **Severity**: P1
  **Files affected**: `.dev-team/skills/dev-team-retro/SKILL.md`, `.dev-team/agents/dev-team-borges.md`, `.dev-team/metrics.md`
  **Scope**: M
  **Description**: Add the acceptance rate bands (60–85% healthy), overrule rate bands (1–10% healthy), DEFECT-to-advisory ratio monitoring, and per-agent drift detection to Borges's retro skill. Borges should flag deviations at the end of each `/dev-team:retro` run. Include the rubber-stamping co-occurrence detector (3+ signals required).

- **Title**: Add minimum sample size gate before calibration alerts
  **Severity**: P1
  **Files affected**: `.dev-team/agents/dev-team-borges.md`, `.dev-team/metrics.md`
  **Scope**: S
  **Description**: Borges should not flag overrule rate = 0% as concerning until n>=30 in-team adversarial findings have been collected. Current count is ~24. After 1–2 more full releases with #486, this threshold will be met. Until then, Borges reports "insufficient data for calibration assessment."

- **Title**: Add signal ratio classification to Finding Outcome Log
  **Severity**: P2
  **Files affected**: `.dev-team/metrics.md`, `.dev-team/skills/dev-team-review/SKILL.md`
  **Scope**: S
  **Description**: Tag each finding in the metrics log as Tier 1 (DEFECT = critical signal), Tier 2 (RISK with concrete scenario = important signal), or Tier 3 (SUGGESTION without impact evidence = noise). This enables signal ratio tracking per agent per release. Target: >60% signal ratio per agent.

- **Title**: Add "silence is golden" reinforcement to reviewer agent definitions
  **Severity**: P2
  **Files affected**: `.dev-team/agents/dev-team-szabo.md`, `.dev-team/agents/dev-team-knuth.md`, `.dev-team/agents/dev-team-brooks.md`
  **Scope**: S
  **Description**: When a reviewer finds nothing substantive, the correct output is "No substantive findings" — not manufactured SUGGESTION-level items. Add this as an explicit instruction based on HubSpot's key insight and the DEFECT-to-advisory ratio thresholds (>1:8 = possible noise). Already recommended in research-synthesis.md (R16) but not yet implemented.

- **Title**: Document the first human overrule to validate the pushback pathway
  **Severity**: P2
  **Files affected**: `.claude/rules/dev-team-learnings.md`
  **Scope**: S
  **Description**: The 0% overrule rate may indicate the human has never tested the overrule pathway. During the next review cycle, the human should deliberately evaluate whether any SUGGESTION or RISK finding is worth overruling. Even one overrule would validate the pathway and establish that the human exercises independent judgment. This is a process action, not a code change.
