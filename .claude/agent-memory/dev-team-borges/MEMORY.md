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
- **Context**: Tier 1 is .claude/rules/dev-team-learnings.md (shared facts, conventions). Tier 2 is .claude/agent-memory/\*/MEMORY.md (agent-specific calibration). First 200 lines loaded into context. Formal decisions go to docs/adr/. Avoid copying volatile counts into agent memories — derive from source.

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
- **Context**: Post-hoc extraction — Borges was not spawned during delivery. v1.8.0 bypassed `/dev-team:task` and agent reviews entirely. ~30 Copilot findings, all addressed. No formal DEFECTs. New entries written: Szabo (1 new + 1 updated), Knuth (2), Brooks (2), Deming (2), Beck (1), Conway (1), Voss (1). Process learning added to shared learnings (process gap). Key architectural changes: INFRA_HOOKS separation, task skill 4-step decomposition, assertNoSymlinkInPath ancestor guard. System improvement identified: v1.8.0 process gap confirms that bypassing the adversarial loop should be reserved for hotfixes, not feature releases.

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
