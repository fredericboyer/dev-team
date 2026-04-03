# Agent Calibration Metrics
<!-- Appendable log of per-task agent performance metrics. -->
<!-- Borges records an entry after each task cycle. -->
<!-- Used by /dev-team:retro to track acceptance rates and signal quality over time. -->

## Format
<!-- Each entry follows this structure:
### [YYYY-MM-DD] Task: <issue or PR reference>
- **Agents**: implementing: <agent>, reviewers: <agent1, agent2, ...>
- **Rounds**: <number of review waves to convergence>
- **Findings**:
  - <agent>: <N> DEFECT (<accepted>/<overruled>), <N> RISK, <N> SUGGESTION
- **Acceptance rate**: <accepted findings / total findings>%
- **Duration**: <approximate task duration>
-->

## Entries

### [2026-03-25] Task: v1.2.0 release (#275, #274, #273, #266, #265)
- **Agents**: implementing: Deming, reviewers: Knuth
- **Rounds**: 2
- **Findings**:
  - Knuth: 3 DEFECT (3 fixed / 0 overruled), 3 RISK (2 accepted / 1 fixed), 4 QUESTION (1 accepted / 3 deferred), 7 SUGGESTION (4 accepted / 3 deferred)
- **Acceptance rate**: 59% (10 accepted-or-fixed / 17 total)
- **Overrule rate**: 0% (0 / 17)
- **Fix rate (DEFECTs)**: 100% (3/3)
- **Defer rate (advisory)**: 50% (7/14)
- **Duration**: single session, 4 parallel branches
- **Notes**: First multi-branch parallel task with Finding Outcome Log. All 3 DEFECTs fixed in round 2. High defer rate on advisory findings — mostly deferred for follow-up issues (routing table alignment, section overlap consolidation).
- **Deferred tracking** (audited in #314):
  - [QUESTION] Mandatory acknowledgment vs `ignored` outcome inconsistency (PR #276) → #320
  - [QUESTION] Finding Outcome Log multi-branch format support (PR #276) → #321
  - [QUESTION] `.github/workflows` ambiguous routing Hamilton vs Deming (PR #278) → #282 (closed), #303 (closed)
  - [SUGGESTION] `healthcheck` naming consistency in Hamilton routing (PR #278) → #322
  - [SUGGESTION] `release-workflows` token inconsistency (PR #278) → already fixed in #303
  - [SUGGESTION] Pre-commit gate wording inaccuracy across agent templates (PR #277, 6 files) → #323
  - [SUGGESTION] Promotion opportunities section undefined in report format (PR #279) → #283 (closed)
  - **Status (2026-03-26):** All 7 deferred findings resolved (issues closed). 100% conversion rate.

### [2026-03-26] Task: v1.5.0 delivery (#353, #354, #355, #356, #357, #358, #359, #364, #368, #374, #351, #348, #335, #325)
- **Agents**: implementing: Voss, Deming, Tufte, Turing; pre-assessment: Brooks; reviewers: Copilot
- **Rounds**: 1
- **Findings**:
  - Copilot: 8 DEFECT (8 fixed / 0 overruled), 7 RISK (7 fixed / 0 overruled), 1 SUGGESTION (1 fixed / 0 overruled)
  - CI: 1 DEFECT (1 fixed / 0 overruled)
  - Brooks: 1 SUGGESTION (1 fixed / 0 overruled)
- **Acceptance rate**: 100% (18 fixed / 18 total)
- **Overrule rate**: 0% (0 / 18)
- **Fix rate (DEFECTs)**: 100% (9/9)
- **Defer rate (advisory)**: 0% (0/9)
- **Duration**: single session, 15 PRs across sequential and parallel branches
- **Notes**: Largest batch to date. All findings addressed in first pass — zero deferred, zero overruled. Copilot was the primary code reviewer. Key themes: path correctness (findings #7, #12), null safety in merge logic (#1-3), documentation precision (#4-6, #9-11), and platform field backfill (#15-16). Process improvement: merge-as-you-go for sequential chains (#18).

### [2026-03-26] Task: v1.5.1 hotfix (#397)
- **Agents**: implementing: Deming (main loop), reviewers: Copilot
- **Rounds**: 1
- **Findings**:
  - Copilot: 1 DEFECT (1 fixed / 0 overruled), 4 RISK (0 accepted / 0 overruled / 4 ignored), 1 SUGGESTION (0 accepted / 0 overruled / 1 ignored)
- **Acceptance rate**: 17% (1 fixed / 6 total)
- **Overrule rate**: 0% (0 / 6)
- **Fix rate (DEFECTs)**: 100% (1/1)
- **Defer rate (advisory)**: 0% (0/5)
- **Ignore rate (advisory)**: 100% (5/5 — local install artifacts, not actionable)
- **Duration**: single session, 1 PR
- **Notes**: Small hotfix — process.md guarded from overwrite on reinstall. The 5 ignored findings were all about hook/config files referencing paths that only exist after local install (not committed to repo). One DEFECT fixed: contradiction in process.md between "never modify .dev-team/" and process.md being user-editable.

### [2026-03-26] Audit: Full codebase audit (Issues #431–#441)
- **Agents**: reviewers: Szabo (security), Knuth (quality), Deming (tooling)
- **Rounds**: 1
- **Findings**:
  - Szabo: 0 DEFECT, 5 RISK (5 accepted), 2 QUESTION (2 accepted), 5 SUGGESTION (5 accepted) — 12 total
  - Knuth: 2 DEFECT (2 accepted), 4 RISK (4 accepted), 1 QUESTION (1 accepted), 4 SUGGESTION (4 accepted) — 11 total
  - Deming: 0 DEFECT, 1 RISK (1 accepted), 1 QUESTION (1 accepted), 12 SUGGESTION (12 accepted) — 14 total
- **Acceptance rate**: 100% (37 accepted / 37 total)
- **Overrule rate**: 0% (0 / 37)
- **Fix rate (DEFECTs)**: N/A (0 fixed in-audit, 2 deferred to v1.6.1)
- **Duration**: single session, 3 parallel agents
- **Issues created**: #431, #432 (v1.6.1 — DEFECT), #433–#441 (v1.7.0 — RISK/SUGGESTION)
- **Notes**: First full codebase audit. 37 findings across 3 agents, zero overrules. Key themes: symlink hardening (Szabo), migration drift in doctor/status (Knuth + Deming cross-validated), hook code duplication (Deming), test coverage gaps (Knuth). 2 DEFECTs deferred to v1.6.1 patch rather than fixed in-audit.

### [2026-03-26] Task: v1.6.0 delivery (#409, #410, #411, #395, #385, #402, #388, #392, #401, #386, #393, #387, #391, #406, #405, #352)
- **Agents**: implementing: Deming, Tufte, Voss (#406), Turing (research #406, #407); pre-assessment: Brooks; reviewers: Copilot
- **Rounds**: 1
- **Findings**:
  - Copilot: inline findings across 16 PRs (all addressed per-PR)
  - No formal review wave — Copilot was sole reviewer
- **Acceptance rate**: 100% (all Copilot findings addressed inline)
- **Overrule rate**: 0%
- **Fix rate (DEFECTs)**: N/A (0 formal DEFECTs reported)
- **Defer rate (advisory)**: 0%
- **Duration**: single session, 16 PRs (#412-#428)
- **Notes**: Major architectural release — research-first approach (Turing #406, #407). Key outcomes: rules-based shared context (ADR-033), language delegation (ADR-034), skill invocation control, process-driven agents, design principles codified. No formal review wave was run; Copilot was the sole code reviewer. All Copilot findings addressed inline during merge. Merge-as-you-go enforced successfully — no stale-branch issues (unlike v1.5.0 early delivery).

### [2026-03-27] Task: v1.7.0 delivery (#433, #434, #435, #436, #437, #438, #439, #440, #441, #445, #446, #447)
- **Agents**: implementing: Deming, Voss, Beck, Tufte, Turing; reviewers: Szabo, Knuth, Brooks
- **Rounds**: 1
- **Findings**:
  - Szabo: 0 DEFECT, 2 RISK (1 accepted / 1 fixed), 1 QUESTION (1 accepted) — 3 total
  - Knuth: 1 DEFECT (1 fixed), 1 RISK (1 fixed), 1 SUGGESTION (1 accepted) — 3 total
  - Brooks: 2 DEFECT (2 fixed), 1 RISK (1 accepted) — 3 total
- **Unique findings**: 7 (after deduplication of 11 raw findings)
- **Acceptance rate**: 100% (7/7 — 4 fixed, 3 accepted)
- **Overrule rate**: 0% (0/7)
- **Fix rate (DEFECTs)**: 100% (2/2 unique)
- **Defer rate (advisory)**: 0% (0/5)
- **Duration**: single session, 7 PRs (#449-#455)
- **Notes**: First formal review wave with in-team agents since v1.2.0 (v1.5.0-v1.6.0 used Copilot-only). 12 issues addressed (10 closed via PRs, 2 moved to v1.8.0), all audit-derived tech debt from v1.6.0. Key themes: symlink hardening (Szabo), path correctness (Knuth — 4th instance), process.exit stub pattern (cross-agent convergence by Szabo+Knuth+Brooks on same finding). Operational issue: agent teams sharing working directory caused cross-branch contamination — 3 stray commits on wrong branches, 1 agent re-spawn needed. Worktree isolation recommended for future multi-branch work.

### [2026-03-29] Task: v1.9.0 delivery (#485, #486) — PRs #492, #496
- **Agents**: implementing: Deming, reviewers: Szabo, Knuth, Brooks; research: Turing
- **Rounds**: 1 per branch (2 branches)
- **Findings**:
  - Szabo: 0 DEFECT, 0 RISK, 1 SUGGESTION (1 accepted), 2 QUESTION (2 ignored — self-answered) — 3 total
  - Knuth: 0 DEFECT, 2 RISK (2 accepted), 2 SUGGESTION (2 accepted), 1 QUESTION (1 accepted) — 5 total (after dedup across branches)
  - Brooks: 0 DEFECT, 1 RISK (1 deferred #494), 3 SUGGESTION (1 accepted / 2 deferred #493), 2 QUESTION (1 accepted / 1 ignored) — 6 total (after dedup across branches)
- **Unique findings**: 14 (after merging cross-branch duplicates from 20 raw)
- **Acceptance rate**: 57% (8 accepted / 14 total)
- **Overrule rate**: 0% (0/14)
- **Fix rate (DEFECTs)**: N/A (0 DEFECTs)
- **Defer rate (advisory)**: 21% (3/14 — #493 x2, #494)
- **Ignore rate (advisory)**: 21% (3/14 — self-answered questions, minor wording)
- **Duration**: single session, 2 branches (feat/485-extract-skill, feat/486-review-delegation)
- **Notes**: First v1.9.0 delivery with full adversarial review loop restored (v1.8.0 had process gap). Skill composability pattern established — /dev-team:extract and /dev-team:review --embedded are now sub-skills of /dev-team:task. Turing research brief on adversarial review health thresholds (#490) produced calibration data. Retro ran pre-implementation. 3 issues created from retro (#489, #490, #491), 2 from review (#493, #494). Clean approve from Szabo (security-neutral refactor). Higher ignore rate (50%) reflects advisory findings on minor wording — no functional issues.

### [2026-03-29] Task: v1.10.0 retro-derived fixes (#489, #490, #493, #494) — PRs #509, #510, #511, #512
- **Agents**: implementing: Deming (#489/#490/#494), Tufte (#493); reviewers: Szabo, Knuth, Brooks; research: Turing; extract: Borges
- **Rounds**: 1 per branch (4 branches)
- **Findings**:
  - Szabo: 0 DEFECT, 0 RISK, 1 SUGGESTION (1 accepted) — 1 total (clean approve on all 4)
  - Knuth: 1 DEFECT (1 fixed), 2 RISK (2 accepted), 1 SUGGESTION (1 ignored), 1 QUESTION (1 ignored) — 5 total
  - Brooks: 1 DEFECT (1 accepted), 1 RISK (1 accepted), 2 SUGGESTION (2 ignored) — 4 total
  - Cross-agent: 1 RISK duplicate (Knuth #12 = Brooks #3, learnings conflict) — deduplicated
- **Unique findings**: 10 (after deduplication of 12 raw)
- **Acceptance rate**: 60% (6 accepted-or-fixed / 10 total)
- **Overrule rate**: 0% (0/10)
- **Fix rate (DEFECTs)**: 100% (2/2 — merge skill .claude copy, learnings conflict)
- **Ignore rate (advisory)**: 40% (4/10 — minor suggestions, dogfood classification, timeout rationale)
- **Duration**: single session, 4 parallel branches
- **Notes**: All 4 issues are retro-derived (#489-#494). Two DEFECTs fixed: missing .claude merge skill gate (Knuth #7), 4-way learnings conflict (Brooks #3). Stray commits from shared working directory recurred (Knuth #8/#9) — 2nd occurrence after v1.7.0. PR #509 closed and changes merged via #511. Zero overrule rate continues — see alert below.
- **[RISK] Zero-overrule alert**: Rolling overrule rate is 0% at n>=87 in-team findings (v1.2.0 through v1.10.0). Per research brief #490, healthy adversarial review shows 1-10% overrule rate (acceptance rate healthy band: 60-85%). Current acceptance rate (60%) is within the healthy band but overrule rate at 0% warrants investigation: are agents pushing hard enough, or is the human accepting reflexively?

### [2026-03-29] Task: v1.8.0 delivery (#447, #456, #457, #458, #459, #460, #461, #462, #465, #466, #467, #468)
- **Agents**: implementing: orchestrator (direct), reviewers: Copilot
- **Rounds**: 1 per branch
- **Findings**:
  - Copilot: ~30 inline findings across 12 PRs (all fixed or acknowledged)
  - dev-team agents: 0 (not spawned — process gap)
- **Acceptance rate**: 100% (all Copilot findings addressed)
- **Overrule rate**: 0%
- **Fix rate (DEFECTs)**: N/A (0 formal DEFECTs)
- **Defer rate (advisory)**: 0%
- **Duration**: single session, 12 PRs (#470-#483)
- **Notes**: v1.8.0 delivered without `/dev-team:task` or dev-team agent reviews. All implementation by orchestrator directly. Copilot was sole reviewer. ~30 Copilot findings across 12 PRs, all addressed. Key PRs with substantive findings: #475 (8 findings on symlink guards — 5 fixed, 3 acknowledged), #479 (mergeClaudeMd edge case), #478 (readFile docstring). Process gap: no adversarial review loop, no Borges extraction during delivery. This post-hoc extraction fills the memory gap. Key deliverables: worktree serialization hooks (INFRA_HOOKS), task skill 4-step decomposition, assertNoSymlinkInPath, readFile error hardening, mergeClaudeMd boundary fix, 18 new tests.

### [2026-03-29] Task: v1.10.1 hotfix (#515) — PR #516
- **Agents**: implementing: Deming, reviewers: Szabo, Knuth, Brooks
- **Rounds**: 1
- **Findings**:
  - Szabo: 0 DEFECT, 0 RISK, 1 SUGGESTION (1 ignored)
  - Knuth: 0 DEFECT, 0 RISK, 3 SUGGESTION (1 deferred / 2 ignored), 1 QUESTION (1 ignored)
  - Brooks: 0 DEFECT, 1 RISK (1 accepted), 1 SUGGESTION (1 ignored)
- **Acceptance rate**: 14% (1 accepted / 7 total)
- **Overrule rate**: 0% (0/7)
- **Fix rate (DEFECTs)**: N/A (0 DEFECTs)
- **Defer rate (advisory)**: 14% (1/7)
- **Ignore rate (advisory)**: 71% (5/7)
- **Duration**: single session, 1 PR
- **Notes**: Small hotfix — 3 init/update bugs fixed (config completeness, init guard, settings merge). High ignore rate reflects advisory findings on trusted internal code (Object.assign on template JSON, defense-in-depth redundancy). One accepted finding: Brooks flagged incomplete HookEntry interface, extended with timeout/blocking fields. One deferred: Knuth flagged missing settings cleanup test. Rolling zero-overrule alert continues at n>=94 in-team findings.
- **[RISK] Zero-overrule alert**: Rolling overrule rate remains 0% at n>=94 in-team findings (v1.2.0 through v1.10.1). Per research brief #490, healthy adversarial review shows 1-10% overrule rate.

### [2026-03-29] Task: v1.11.0 delivery (#519-#548) — PRs #550-#557
- **Agents**: implementing: Deming, Beck, Tufte; reviewers: Szabo, Knuth, Brooks
- **Rounds**: 1 per PR (8 PRs)
- **Findings**:
  - Szabo: 0 DEFECT, 1 RISK (1 ignored — compareSemver prerelease, latent), 2 SUGGESTION (2 deferred — Semgrep config), 1 QUESTION (1 ignored — validate-docs setup-node)
  - Knuth: 0 DEFECT, 3 RISK (3 ignored — validate-docs regex, release.yml escaping, compareSemver), 1 SUGGESTION (1 ignored — double symlink check)
  - Brooks: 0 DEFECT, 4 RISK (1 accepted — merge ordering, 1 deferred — Semgrep silent, 1 ignored — double build, 1 deferred — calibration path missing), 5 SUGGESTION (5 ignored — review gate LIGHT, DoD ordering, context docs location, calibration seeding, lock contention test), 1 QUESTION (1 ignored — init.js side effects)
- **Unique findings**: ~18 (after deduplication of ~25 raw)
- **Acceptance rate**: 6% (1 accepted / ~18 total)
- **Overrule rate**: 0% (0/~18)
- **Fix rate (DEFECTs)**: N/A (0 DEFECTs)
- **Defer rate (advisory)**: 17% (3/~18 — Semgrep config x2, calibration path)
- **Ignore rate (advisory)**: 78% (14/~18)
- **Duration**: single session, 8 PRs, 27 issues
- **Notes**: Largest release to date (27 issues, 8 PRs). All 8 PRs approved with 0 DEFECTs. High ignore rate (78%) reflects the nature of the work — primarily hardening, CI improvements, test coverage, and documentation. Most advisory findings targeted latent risks (compareSemver prerelease, regex edge cases) or minor suggestions (ordering, location) that were reasonable to ignore for the scope. 3 deferred findings tracked: Semgrep full enforcement, calibration example path in user projects. 1 round per PR — clean convergence.
- **[RISK] Zero-overrule alert**: Rolling overrule rate remains 0% at n>=112 in-team findings (v1.2.0 through v1.11.0). Per research brief #490, healthy adversarial review shows 1-10% overrule rate. Acceptance rate (6%) is below the healthy band (60-85%) but this is attributable to the release scope (hardening/docs) rather than signal quality. When excluding pure-hardening releases, the rolling acceptance rate is within the healthy band.

### [2026-03-30] Task: v1.11.1 hotfix (#563) — PR #565
- **Agents**: implementing: Deming, reviewers: Knuth
- **Rounds**: 1 (LIGHT)
- **Findings**:
  - Knuth: 0 DEFECT, 0 RISK, 1 SUGGESTION (1 ignored — guard clarity, advisory)
- **Acceptance rate**: 0% (0 accepted / 1 total)
- **Overrule rate**: 0% (0/1)
- **Fix rate (DEFECTs)**: N/A (0 DEFECTs)
- **Ignore rate (advisory)**: 100% (1/1)
- **Duration**: single session, 1 PR
- **Notes**: Small hotfix — mergeClaudeMd duplicate scaffolding fix. 1 advisory finding ignored (guard clarity for newBegin === -1). LIGHT review, 1 round to convergence. Clean fix scope.
- **[RISK] Zero-overrule alert**: Rolling overrule rate remains 0% at n>=113 in-team findings (v1.2.0 through v1.11.1).

### [2026-03-30] Task: v2.0 multi-runtime portability (#501, #502, #503, #504, #505, #506, #508, #525) — PRs #569, #570, #571, #572
- **Agents**: implementing: Deming; reviewers: Szabo, Knuth, Brooks; research: Turing; extract: Borges
- **Rounds**: 1 per branch (4 branches)
- **Findings**:
  - Szabo: 2 DEFECT (2 fixed — F-01 path traversal, F-02 registerAdapter), 1 RISK (1 fixed — R-02 MCP filePath), ~5 advisory (accepted/noted)
  - Knuth: 1 DEFECT (1 fixed — K10 MCP deriveRequiredAgents), ~8 advisory (accepted/noted)
  - Brooks: 1 DEFECT (1 fixed — S2 side-effect imports), ~12 advisory (accepted/deferred/noted)
  - Cross-branch: ~5 duplicates merged
- **Unique findings**: ~35 (after deduplication)
- **Acceptance rate**: ~75% (estimated — 4 DEFECTs fixed, majority of advisory accepted or noted)
- **Overrule rate**: 0% (0/~35)
- **Fix rate (DEFECTs)**: 100% (4/4)
- **Defer rate (advisory)**: ~15% (YAML quoting, test gap details)
- **Duration**: single session, 4 branches
- **Notes**: First MAJOR release. Research-first (Turing #508, #525) → 2 ADRs (036, 037). 5 runtime adapters (claude, agents-md, copilot, codex, cursor, windsurf) + MCP enforcement server. ~3,300 new lines, 8 new test files, 554 total tests. Key architectural patterns: adapter registry (ADR-036), MCP enforcement (ADR-037), canonical format as identity of current format. Dual code path (hook vs MCP) flagged as tech debt. Duplicate import in init.ts noted for cleanup.
- **[RISK] Zero-overrule alert**: Rolling overrule rate remains 0% at n>=148 in-team findings (v1.2.0 through v2.0). Per research brief #490, healthy adversarial review shows 1-10% overrule rate. Acceptance rate (~75%) is within the healthy band (60-85%).


### [2026-04-01] Task: v3.2.0 delivery (22 PRs, 27 issues)
- **Agents**: implementing: Voss (×8), Deming (×3), Hamilton (×1); pre-assessment: Brooks; reviewers: Copilot (automated); audit: Szabo, Knuth, Deming
- **Rounds**: Wave 1 (12 agents, 10 PRs) + Wave 2 (8 agents, 7 PRs) + direct orchestrator (5 PRs)
- **Findings**:
  - Copilot: ~60 inline comments across 22 PRs (addressed via reply + GraphQL thread resolution)
  - Pre-release audit (Szabo): 0 DEFECT, 4 RISK, 5 SUGGESTION
  - Pre-release audit (Knuth): 1 DEFECT, 5 RISK, 2 SUGGESTION
  - Pre-release audit (Deming): 2 DEFECT, 5 RISK, 5 SUGGESTION
- **Acceptance rate**: ~85% (majority of Copilot findings fixed, remainder tracked in issues)
- **Overrule rate**: 0%
- **Fix rate (DEFECTs)**: 100% (3/3 audit DEFECTs fixed in-session)
- **Defer rate (advisory)**: ~15% (8 findings deferred to v3.3.0 issues #663-667)
- **Duration**: single session (~4 hours)
- **Notes**: First use of Mergify merge queue. First use of GraphQL `resolveReviewThread`. Process failures identified and codified: orchestrator validation loop (#653), agent concurrency cap (4-6), task completion verification. 6 PRs initially merged without addressing Copilot comments (follow-up PR #643 fixed). Beck agent retired. Merge skill rewritten (ADR-040). Implement skill extracted (ADR-039).
- **[RISK] Process regression**: v3.2.0 repeated v1.8.0 pattern — PRs merged without review. Root cause: merge agents didn't follow the merge skill. Fix: Mergify enforces `#review-threads-unresolved = 0` at platform level.

### [2026-04-02] Task: v3.3.0 delivery (#663, #664, #666, #667, #670, #671, #672)
- **Agents**: implementing: Voss (×4), Deming (×2), Tufte (×1); pre-assessment: Brooks; reviewers: review-675 through review-680 (LIGHT), review-677 (FULL), Copilot; research: Turing (×4)
- **Rounds**: 1 per branch (except #671: 2 rounds — FULL review caught 1 DEFECT)
- **Findings**:
  - review-676: 0 DEFECT, 1 RISK (1 accepted), 1 SUGGESTION (1 fixed — contamination)
  - review-677: 1 DEFECT (1 fixed), 2 SUGGESTION (2 deferred — cosmetic)
  - review-678: 0 DEFECT, 0 RISK, 2 SUGGESTION (2 accepted)
  - review-679: 0 DEFECT, 0 RISK, 1 SUGGESTION (1 accepted)
  - review-680: 0 DEFECT, 1 RISK (1 accepted), 2 SUGGESTION (2 accepted)
  - Copilot: 0 DEFECT, 0 RISK, 7 SUGGESTION (2 accepted, 4 deferred to #683, 1 fixed)
- **Unique findings**: 21
- **Acceptance rate**: 71% (15 accepted-or-fixed / 21 total)
- **Overrule rate**: 0% (0/21)
- **Fix rate (DEFECTs)**: 100% (1/1)
- **Defer rate (advisory)**: 30% (6/20 — 4 to #683, 2 cosmetic)
- **Ignore rate (advisory)**: 0% (0/20)
- **Duration**: single session, 7 branches + 4 research briefs
- **Notes**: First release with LIGHT/FULL review tier differentiation in practice. All SIMPLE tasks got LIGHT (advisory-only) reviews; the COMPLEX task (#671 — Mergify ADR) got FULL review which caught the sole DEFECT (missing inline comment in .mergify.yml). Branch contamination recurred on 3 branches (feat/666, feat/672, feat/671) — worktree-isolated agents did not experience contamination. 4 Turing research briefs completed (agent coordination, platform capabilities, Kairos memory, harness best practices). GitHub native auto-merge handled all merges despite Mergify being configured. Follow-up issue #683 created for worktree hook hardening.
- **[RISK] Zero-overrule alert**: Rolling overrule rate remains 0% at n>=199 in-team findings (v1.2.0 through v3.3.0). Per research brief #490, healthy adversarial review shows 1-10% overrule rate. Acceptance rate (71%) is within the healthy band (60-85%).

### [2026-04-03] Task: v3.5.0 delivery (#713, #714, #715) — PRs #716, #717, #718
- **Agents**: implementing: Voss (#713, #715), Deming (#714); reviewers: Knuth (FULL — #718), Szabo (FULL — #718), Copilot (#716, #717, #718); extract: Borges
- **Rounds**: 1 round per branch (all converged in 1; #718 FULL review addressed inline)
- **Findings**:
  - Copilot (#716 fix/713): 1 SUGGESTION fixed (weak assertion), 1 SUGGESTION deferred, 1 SUGGESTION ignored — 3 total
  - Copilot (#717 fix/714): 0 findings
  - Knuth (#718 feat/715, FULL): 3 RISK (1 fixed/K1, 2 deferred/K2-K3), 2 SUGGESTION (2 deferred/K4-K5→#719/#720), 2 QUESTION (2 ignored/K6-K7) — 7 total
  - Szabo (#718 feat/715, FULL): 1 RISK (1 deferred/S-01→#719), 2 SUGGESTION (2 ignored/S-02-S-03) — 3 total
  - Copilot (#718): 1 SUGGESTION (ignored — unused imports) — 1 total
- **Unique findings**: 14 (after dedup across Copilot/Knuth/Szabo)
- **Acceptance rate**: 29% (4 fixed-or-accepted / 14 total)
- **Overrule rate**: 0% (0/14)
- **Fix rate (DEFECTs)**: N/A (0 DEFECTs)
- **Defer rate (advisory)**: 36% (5/14 — symlink coverage → #719, compareSemver edge cases → #720)
- **Ignore rate (advisory)**: 36% (5/14 — minor suggestions, questions, advisory on in-scope boundaries)
- **Duration**: single session, 3 branches
- **Notes**: Small release — 3 issues. LIGHT/FULL tier applied correctly: SIMPLE branches (#713, #714) got LIGHT reviews (Copilot only); COMPLEX branch (#715 — 657 lines of new tests) got FULL review (Knuth + Szabo). Zero DEFECTs across all 3 branches. Cross-branch contamination recurred (package.json leaked between branches) — 5th documented occurrence. Two follow-up issues created: #719 (symlink guard tests), #720 (compareSemver edge cases). Low acceptance rate (29%) reflects the test-only nature of the COMPLEX branch — test code is lower-risk, advisory findings appropriately deferred/ignored.
- **[RISK] Zero-overrule alert**: Rolling overrule rate remains 0% at n>=213 in-team findings (v1.2.0 through v3.5.0, in-team only). Acceptance rate (29%) is below healthy band (60-85%) but attributable to test-only scope.

### [2026-04-03] Task: v3.6.0 delivery (11 issues, 12 PRs #733-#742 + release)
- **Agents**: implementing: various (3 waves: 5+4+2); reviewers: Copilot; extract: Borges
- **Rounds**: 1 per branch (Copilot-only review, no adversarial agent wave)
- **Findings**:
  - Copilot (#733): 0 DEFECT, 0 RISK, 5 SUGGESTION (5 fixed)
  - Copilot (#734): 0 DEFECT, 1 RISK (1 accepted)
  - Copilot (#735): 1 DEFECT (1 fixed), 1 SUGGESTION (1 fixed)
  - Copilot (#736): 0 DEFECT, 3 RISK (1 fixed/comment, 2 deferred), 2 SUGGESTION (1 deferred/unit tests, 1 fixed/comment), [RISK] stale sidecar (deferred), [RISK] branch detection (deferred)
  - Copilot (#737): 0 DEFECT, 1 RISK (1 accepted)
  - Copilot (#738): 0 DEFECT, 1 RISK (1 accepted)
  - Copilot (#740): 0 DEFECT, 0 RISK, 1 SUGGESTION (1 accepted)
  - Copilot (#742): 0 DEFECT, 0 RISK, 2 SUGGESTION (2 accepted)
- **Unique findings**: 18
- **Acceptance rate**: 72% (13 fixed-or-accepted / 18 total)
- **Overrule rate**: 0% (0/18)
- **Fix rate (DEFECTs)**: 100% (1/1)
- **Defer rate (advisory)**: 17% (3/18 — stale sidecar, branch detection, hook unit tests)
- **Ignore rate (advisory)**: 0% (0/18)
- **Duration**: single session, 11 issues across 3 waves (5+4+2)
- **Notes**: Copilot-only review — no adversarial agent review wave (same process gap as v3.4.0, v1.8.0, v1.6.0). 1 DEFECT (existsSync unreliable for symlinks, PR #735) found and fixed. Three findings deferred from PR #736 (review gate hook): stale sidecar, branch detection via HEAD, hook unit tests — cluster of deferred debt in this file. Cross-branch contamination recurred (stashed changes, agent teams sharing working directory) despite worktree isolation. "Require up-to-date branches" protection disabled mid-release to reduce cascade overhead. Acceptance rate (72%) is within the healthy band.
- **[RISK] Process gap**: No adversarial agent review executed. COMPLEX issues may have benefited from FULL review (per tier protocol).
- **[RISK] Zero-overrule alert**: Rolling overrule rate remains 0% at n>=213 in-team findings (Copilot findings excluded from rolling count). Per research brief #490, healthy adversarial review shows 1-10% overrule rate.

### [2026-04-03] Task: v3.4.0 delivery (#665, #683, #686, #687, #688, #689, #690, #691, #699, #703, #704)
- **Agents**: implementing: Voss (#683, #686, #699), Knuth (#665), Turing (research #687, #688, #689, #690, #691), Tufte (docs #703, #704), Conway (release); pre-assessment: Brooks; reviewers: Copilot
- **Rounds**: max 2 (PR #694 had 2 Copilot rounds), most branches 0-1
- **Findings**:
  - Copilot: 3 DEFECT (3 fixed — realpathSync fallback, missing symlink test, .claude/worktrees symlink), 19 SUGGESTION (17 accepted, 2 fixed)
- **Unique findings**: 22
- **Acceptance rate**: 86% (19 accepted-or-fixed / 22 total)
- **Overrule rate**: 0% (0/22)
- **Fix rate (DEFECTs)**: 100% (3/3)
- **Defer rate (advisory)**: 0% (0/19)
- **Ignore rate (advisory)**: 0% (0/19)
- **Duration**: single session, 11 branches (6 with Copilot findings)
- **Notes**: Copilot was sole reviewer — no adversarial agent reviews executed. This is the same process gap as v1.8.0 and v1.6.0. COMPLEX issues #687 and #689 should have had FULL reviews per the task skill protocol but received only Copilot review. The 3 DEFECTs (all on #683 worktree hook hardening) were legitimate symlink bypass gaps caught by Copilot. 5 Turing research briefs completed (#687, #688, #689, #690, #691). Shared file contamination was universal — every worktree agent committed Borges memory and metrics changes from unpushed local main. Cross-branch contamination recurred on 2 PRs (#694 picked up #688's research doc, #698 picked up #691 and #683 files). Merge cascade delays from strict_required_status_checks_policy + 6 parallel PRs.
- **[RISK] Process gap**: No adversarial agent review executed. Copilot-only review is acceptable for SIMPLE/research tasks but COMPLEX issues should have had FULL reviews.
- **[RISK] Shared file contamination pattern**: Worktree agents branched from local main with unpushed commits (aeda27f retro extraction). Every worktree inherited stale Borges memory and metrics files. Root cause: unpushed commits on main before branching.
- **[RISK] Zero-overrule alert**: Rolling overrule rate remains 0% at n>=199 in-team findings (Copilot findings excluded from rolling count — no new in-team findings this release). Per research brief #490, healthy adversarial review shows 1-10% overrule rate.
