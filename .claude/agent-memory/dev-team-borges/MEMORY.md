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
- **Source**: CLAUDE.md + .claude/rules/dev-team-learnings.md analysis
- **Tags**: memory, architecture, tiers
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Tier 1 is .claude/rules/dev-team-learnings.md (shared facts, conventions). Tier 2 is .claude/agent-memory/*/MEMORY.md (agent-specific calibration). First 200 lines loaded into context. Formal decisions go to docs/adr/. Avoid copying volatile counts into agent memories — derive from source.

## System Improvement Log

### [2026-03-25] First metrics entry recorded — v1.2.0 (4 parallel branches, 17 findings)
- **Type**: MILESTONE [verified]
- **Source**: v1.2.0 release task
- **Tags**: metrics, calibration, baseline
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: First real entry in `.dev-team/metrics.md`. Establishes baseline: 0% overrule rate, 100% DEFECT fix rate, 50% advisory defer rate. Future `dev-team-retro` runs can now trend these numbers. Knuth was sole reviewer across all 4 branches; Deming sole implementer.

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
- Knuth's 50% advisory defer rate (7/14) is not a quality problem — deferred items were legitimate follow-ups outside the PR scope. But it signals that `dev-team-retro` should track defer-to-issue conversion (are deferred findings actually becoming issues?).

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
- **Source**: dev-team-audit (Szabo, Knuth, Deming)
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

### [2026-03-27] v1.7.0 extraction — 12 issues, 7 PRs, first formal review wave since v1.2.0
- **Type**: MILESTONE [verified]
- **Source**: v1.7.0 task loop (12 issues, 7 PRs #449-#455)
- **Tags**: metrics, calibration, extraction
- **Outcome**: verified
- **Last-verified**: 2026-03-27
- **Context**: All 12 audit-derived tech debt issues resolved. 11 raw findings (7 unique after dedup), 100% acceptance, 1 round. First in-team review wave (Szabo+Knuth+Brooks) since v1.2.0. 3 agents converged independently on the same process.exit stub finding — strong cross-agent coherence signal. New entries: Szabo (2), Knuth (2), Brooks (2), Beck (1), Voss (1), Tufte (1), Turing (1), Deming already had entries from implementation. Updated 3 existing entries (Szabo symlink+ReDoS fixed, Knuth test coverage fixed). 3 tech debt items marked resolved in shared learnings. 3 new process learnings added (working dir contention, merge cascades, retro staleness). Stale `deming/` memory dir flagged and fixed (finding #5). System improvement: agent teams need worktree isolation (#456 tracked).

### [2026-03-29] v1.9.0 extraction — 2 branches, 20 findings, 71% acceptance, adversarial loop restored
- **Type**: MILESTONE [verified]
- **Source**: v1.9.0 task loop (2 issues, 2 PRs #492, #496)
- **Tags**: metrics, calibration, extraction, composability
- **Outcome**: verified
- **Last-verified**: 2026-03-29
- **Context**: First delivery with full adversarial review loop since v1.8.0 process gap. 20 raw findings (14 unique after cross-branch dedup), 0 DEFECTs, 10 accepted, 3 deferred, 7 ignored. Higher ignore rate (50%) is acceptable — all ignored findings were self-answered questions or minor wording issues with no functional impact. Skill composability pattern established (extract + review --embedded). New entries written: Szabo (1), Knuth (2), Brooks (2), Deming (2), Turing (1). Last-verified bumped on 3 existing entries (Knuth vocabulary, Deming skill invocation, Brooks task decomposition). 2 new tech debt items added to shared learnings (#493, #494). 1 new design principle added (skill composability). Retro ran pre-implementation; retro issues (#489-#491) tracked separately.

### [2026-03-29] v1.10.0 extraction — 4 retro issues, 4 PRs, 12 findings, 60% acceptance
- **Type**: MILESTONE [verified]
- **Source**: v1.10.0 retro-derived task (#489, #490, #493, #494; PRs #509-#512)
- **Tags**: metrics, calibration, extraction
- **Outcome**: verified
- **Last-verified**: 2026-03-29
- **Context**: 4 retro-derived issues resolved. 12 raw findings (10 unique after dedup), 2 DEFECTs fixed, 4 accepted, 4 ignored, 0 overruled. 60% acceptance rate — within healthy band. Stray commits recurred (2nd time after v1.7.0). Zero-overrule alert triggered at n>=87 in-team findings. New entries: Szabo (1), Knuth (2), Brooks (1), Deming (2), Tufte (1). 1 new shared learning (parallel branch shared-file conflicts). Deming at 191 lines — approaching 200-cap, compressed 2 entries. No stale entries (all within 4 days).

### [2026-03-29] v1.10.1 extraction — 1 PR, 7 findings, 14% acceptance, hotfix
- **Type**: MILESTONE [verified]
- **Source**: v1.10.1 hotfix (#515, PR #516)
- **Tags**: metrics, calibration, extraction, hotfix
- **Outcome**: verified
- **Last-verified**: 2026-03-29
- **Context**: Small hotfix — 3 init/update bugs fixed. 7 advisory findings (0 DEFECT), 1 accepted (Brooks HookEntry interface), 1 deferred (Knuth test gap), 5 ignored (trust boundary, defense-in-depth). 1 round to convergence. Low acceptance rate (14%) reflects advisory findings on trusted internal code — not a signal quality issue.

### [2026-03-29] v1.8.0 post-hoc extraction — 12 issues, 12 PRs, Copilot-only review
- **Type**: MILESTONE [verified]
- **Source**: v1.8.0 task loop (12 issues, 12 PRs #470-#483)
- **Tags**: metrics, calibration, extraction, process-gap
- **Outcome**: verified
- **Last-verified**: 2026-03-29
- **Context**: Post-hoc extraction — Borges was not spawned during delivery. v1.8.0 bypassed `dev-team-task` and agent reviews entirely. ~30 Copilot findings, all addressed. No formal DEFECTs. New entries written: Szabo (1 new + 1 updated), Knuth (2), Brooks (2), Deming (2), Beck (1), Conway (1), Voss (1). Process learning added to shared learnings (process gap). Key architectural changes: INFRA_HOOKS separation, task skill 4-step decomposition, assertNoSymlinkInPath ancestor guard. System improvement identified: v1.8.0 process gap confirms that bypassing the adversarial loop should be reserved for hotfixes, not feature releases.

### [2026-03-29] v1.11.0 extraction — 27 issues, 8 PRs, ~18 findings, 6% acceptance, hardening release
- **Type**: MILESTONE [verified]
- **Source**: v1.11.0 task loop (27 issues, 8 PRs #550-#557)
- **Tags**: metrics, calibration, extraction, hardening
- **Outcome**: verified
- **Last-verified**: 2026-03-29
- **Context**: Largest release to date. 0 DEFECTs across all 8 PRs. ~18 unique findings (all advisory), 1 accepted, 3 deferred, 14 ignored. Low acceptance rate (6%) is not a signal quality issue — reflects hardening scope (CI, tests, docs, symlink guards). Deming memory compressed (191→~165 lines) by consolidating 4 v1.5.0-era entries and 3 v1.7.0-era entries into summaries. New entries written: Deming (1), Szabo (1), Knuth (1), Brooks (2), Beck (2), Tufte (1). Last-verified bumped on Deming CI entry and Beck test-listing entry. Zero-overrule alert continues at n>=112. No new shared learnings needed — release was hardening, not new process/principles.

### [2026-03-30] v1.11.1 extraction — 1 PR, 1 finding, 0% acceptance, hotfix
- **Type**: MILESTONE [verified]
- **Source**: v1.11.1 hotfix (#563, PR #565)
- **Tags**: metrics, calibration, extraction, hotfix
- **Outcome**: verified
- **Last-verified**: 2026-03-30
- **Context**: Small hotfix — mergeClaudeMd duplicate scaffolding fix. 1 advisory finding (Knuth SUGGESTION, ignored). No new memory entries needed — bumped Last-verified on Knuth's related mergeClaudeMd boundary condition entry. Zero-overrule alert continues at n>=113. No new shared learnings. Proportional extraction for hotfix scope.

### [2026-03-30] v2.0 extraction — 4 PRs, ~35 findings, 4 DEFECTs, major release
- **Type**: MILESTONE [verified]
- **Source**: v2.0 multi-runtime portability (#501-#506, #508, #525, PRs #569-#572)
- **Tags**: metrics, calibration, extraction, major-release, multi-runtime
- **Outcome**: verified
- **Last-verified**: 2026-03-30
- **Context**: First major version release extraction. 4 branches, 4 PRs, ~35 findings across 3 review rounds. 4 DEFECTs (all fixed): path traversal via name (F-01), registerAdapter replacement (F-02), side-effect imports (S2), MCP deriveRequiredAgents divergence (K10). Research-first pattern validated again (2 briefs → 2 ADRs). New entries written: Deming (3), Szabo (3), Knuth (2), Brooks (4), Turing (1), Conway (1). Last-verified bumped on 3 existing entries. 3 new shared learnings: adapter registry design principle, dual code path tech debt, input boundary validation benchmark. Brooks at 185 lines — monitor for next release. All agents remain under 200-line cap.

### [2026-04-02] v3.3.0 extraction — 7 branches, 21 findings, 71% acceptance, review tiers validated
- **Type**: MILESTONE [verified]
- **Source**: v3.3.0 task loop (7 issues, 7 PRs + 4 research briefs)
- **Tags**: metrics, calibration, extraction, review-tiers
- **Outcome**: verified
- **Last-verified**: 2026-04-02
- **Context**: First release with LIGHT/FULL review tier differentiation. 21 findings (1 DEFECT fixed, 14 accepted, 6 deferred), 0 overruled. FULL review on COMPLEX task caught the only DEFECT — tier system validated. Branch contamination recurred (3rd occurrence). New entries written: Voss (2), Deming (2), Tufte (1), Szabo (2), Knuth (2), Brooks (2), Turing (1). Brooks compressed from 201→191 lines. Last-verified bumped on 3 existing entries (Szabo ReDoS, Deming ReDoS, Knuth stray commits). 1 new shared learning (review tier validation). Zero-overrule alert continues at n>=199. No temporal decay needed — all entries within 30-day window.

### [2026-04-03] v3.6.0 extraction — 11 issues, 18 findings, 72% acceptance, Copilot-only review
- **Type**: MILESTONE [verified]
- **Source**: v3.6.0 task loop (11 issues, 12 PRs #733-#742 + release)
- **Tags**: metrics, calibration, extraction, process-gap
- **Outcome**: verified
- **Last-verified**: 2026-04-03
- **Context**: 3 waves (5+4+2). 18 findings (1 DEFECT fixed, 10 fixed/accepted, 3 deferred, 0 ignored). 72% acceptance — within healthy band. Copilot-only review — same process gap as v3.4.0/v1.8.0/v1.6.0. 1 DEFECT: existsSync unreliable for symlinks (PR #735). Review gate hook (PR #736) has a cluster of 3 deferred findings (stale sidecar, branch detection, unit tests). Cross-branch contamination recurred (5th time in Brooks memory). "Require up-to-date branches" disabled mid-release — valid trade-off when branches known-clean. New entries: Szabo (1), Deming (2+bump), Brooks (2+bump), Knuth (1). Last-verified bumped on Deming hooks, Szabo symlinks, Brooks contamination.

### [2026-04-03] v3.5.0 extraction — 3 branches, 14 findings, 29% acceptance, LIGHT/FULL tier validated
- **Type**: MILESTONE [verified]
- **Source**: v3.5.0 task loop (3 issues, 3 PRs #716-#718)
- **Tags**: metrics, calibration, extraction, review-tiers
- **Outcome**: verified
- **Last-verified**: 2026-04-03
- **Context**: Small focused release. 3 branches: 2 SIMPLE (Copilot-only), 1 COMPLEX (FULL: Knuth + Szabo). 14 findings total: 4 fixed/accepted, 5 deferred (#719 symlink, #720 semver), 5 ignored. 0 DEFECTs. Cross-branch contamination recurred (5th occurrence — package.json leaked between branches). Tech debt resolved: init.ts/update.ts tests and validate:docs script. New tech debt tracked: compareSemver pre-release parsing (#720), symlink guard coverage (#719). LIGHT/FULL tier correctly applied — COMPLEX branch got FULL review and produced the richest findings. Low acceptance rate (29%) attributable to test-only scope, not signal quality. New entries: Voss (2), Deming (1+bump), Knuth (updated+1), Szabo (1). Shared learnings updated: 2 tech debt items resolved, 2 new tech debt items added, contamination entry updated for v3.5.0.

### [2026-04-03] v3.4.0 extraction — 11 branches, 22 findings, 86% acceptance, Copilot-only review
- **Type**: MILESTONE [verified]
- **Source**: v3.4.0 task loop (11 issues, 11 branches, release PR #707)
- **Tags**: metrics, calibration, extraction, process-gap
- **Outcome**: verified
- **Last-verified**: 2026-04-03
- **Context**: 22 findings (3 DEFECT fixed, 19 SUGGESTION accepted/fixed), all from Copilot. No adversarial agent reviews — same process gap as v1.8.0 and v1.6.0. COMPLEX issues (#687, #689) should have had FULL reviews. 3 DEFECTs on #683 (worktree symlink bypass) were legitimate catches by Copilot. Shared file contamination was universal (unpushed local commits). Cross-branch contamination on 2 PRs (#694, #698). New entries written: Voss (1 new + 1 updated), Szabo (1 updated), Knuth (1), Turing (1), Tufte (1), Brooks (1 updated), Conway (1 bumped), Deming (1 bumped). No new shared learnings needed — contamination pattern already documented. Zero-overrule alert continues at n>=199 (no new in-team findings).

### [2026-04-03] v3.6.0 audit extraction — 24 findings, 0 DEFECTs, 96% acceptance, codebase matured
- **Type**: MILESTONE [verified]
- **Source**: dev-team-audit v3.6.0 (Szabo, Knuth, Deming)
- **Tags**: metrics, calibration, extraction, audit
- **Outcome**: verified
- **Last-verified**: 2026-04-03
- **Context**: Second full codebase audit. 24 findings (0 DEFECT, 7 RISK, 6 QUESTION, 11 SUGGESTION), 96% acceptance, 0% overrule, 1 deferred (K-05 compareSemver — already tracked). Compared to first audit (2026-03-26: 37 findings, 2 DEFECTs): finding count down 35%, zero DEFECTs, no new issues needed. Key themes: hook test gaps (merge-gate, worktree-remove), CI optimization (dedup, parallelization), pre-stable tooling (oxfmt, TS6), zero-runtime-deps positive. New entries: Szabo (2 new + 1 bumped), Knuth (2 new + 2 bumped), Deming (3 new + 1 bumped, compressed 5 entries to 1). Deming compressed 221→189 lines. All agents under 200-line cap. Zero-overrule alert continues at n>=237.

### [2026-04-04] v3.8.0 extraction — 8 PRs, 48 findings, 65% acceptance, adversarial loop restored
- **Type**: MILESTONE [verified]
- **Source**: v3.8.0 task loop (8 issues, 8 PRs #789-#797)
- **Tags**: metrics, calibration, extraction
- **Outcome**: verified
- **Last-verified**: 2026-04-04
- **Context**: First in-team adversarial review since v3.3.0. 48 findings (3 DEFECT fixed, 31 accepted, 4 deferred, 10 ignored), 0 overruled. FULL reviews caught all 3 DEFECTs. Szabo/Knuth cross-convergence on sanitization mismatch (#793). New entries: Knuth (2), Szabo (1), Brooks (1+bump). 2 new shared learnings (Copilot re-review cascades, implementer guard). Contamination entry updated (6th occurrence). All agents under 200-line cap. Zero-overrule alert continues at n>=271.
