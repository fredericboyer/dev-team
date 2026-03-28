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
- **Notes**: First formal review wave with in-team agents since v1.2.0 (v1.5.0-v1.6.0 used Copilot-only). 12 issues resolved, all audit-derived tech debt from v1.6.0. Key themes: symlink hardening (Szabo), path correctness (Knuth — 4th instance), process.exit stub pattern (cross-agent convergence by Szabo+Knuth+Brooks on same finding). Operational issue: agent teams sharing working directory caused cross-branch contamination — 3 stray commits on wrong branches, 1 agent re-spawn needed. Worktree isolation recommended for future multi-branch work.

