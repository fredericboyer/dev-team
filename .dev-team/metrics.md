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

