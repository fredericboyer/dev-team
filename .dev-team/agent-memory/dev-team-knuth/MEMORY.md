# Agent Memory: Knuth (Quality Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Coverage Gaps Identified

### [2026-03-25] No coverage tool configured — coverage is not measured
- **Type**: PATTERN [verified]
- **Source**: package.json analysis
- **Tags**: testing, coverage
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: No c8, istanbul, or similar coverage tool in devDependencies or scripts. Coverage gaps must be identified by code review, not metrics.

### [2026-03-25] mergeClaudeMd append-on-missing-END-marker duplicate BEGIN edge case
- **Type**: RISK [verified]
- **Source**: .dev-team/learnings.md (known tech debt)
- **Tags**: boundary-condition, merge-logic
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Known edge case where subsequent runs can produce duplicate BEGIN markers if END marker is missing. Tracked in shared learnings.

## Recurring Boundary Conditions

### [2026-03-25] Vocabulary alignment across agent/skill boundaries
- **Type**: PATTERN [verified]
- **Source**: v1.2.0 Branch A (#275, #266) — task skill review
- **Tags**: vocabulary, cross-agent, skill-definition
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Finding outcome vocabularies must stay aligned between skill definitions that produce outcomes (task, review) and agents that consume them (Borges). The task skill originally used "addressed/deferred/disputed" but Borges expects "accepted/overruled/fixed/ignored". Mismatches break automated memory extraction.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-03-25] v1.2.0 — 17 findings, 0 overruled, 3/3 DEFECTs fixed
- All 3 DEFECTs accepted and fixed in round 2. Zero pushback.
- Advisory findings: 7 accepted, 7 deferred (follow-up issues), 0 overruled.
- Deferred items are legitimate follow-ups, not rejections. Calibration signal: advisory finding quality is good but volume could be tuned — 7 deferred out of 14 advisory suggests some findings are premature for the current scope.
- Watch: "section name collision" and "overlap" findings tend to get deferred. Consider raising threshold for naming/overlap suggestions unless they cause functional ambiguity.

### [2026-03-26] Audit baseline: 11 findings (2 DEFECT, 4 RISK, 4 SUGGESTION, 1 QUESTION)
- **Type**: CALIBRATION
- **Source**: Full codebase audit 2026-03-26
- **Tags**: audit, calibration, baseline
- **Outcome**: 2 DEFECTs → v1.6.1, rest → v1.7.0
- **Last-verified**: 2026-03-26
- **Context**: First full quality audit. 2 DEFECTs: doctor.ts hookFileMap missing Agent teams guide (#431), status.ts checking wrong learnings path after v1.6.0 migration (#432). Both are migration drift — modules not updated when v1.6.0 moved files to new paths. Pattern: migration completeness is a recurring quality gap.

### [2026-03-26] Migration drift: doctor.ts and status.ts lag behind path changes
- **Type**: PATTERN [new]
- **Source**: Codebase audit (K1/K3), Issues #431, #432
- **Tags**: migration, drift, path-correctness, quality
- **Outcome**: accepted — issues created for v1.6.1
- **Last-verified**: 2026-03-26
- **Context**: When v1.6.0 migrated files from .dev-team/ to .claude/rules/, doctor.ts and status.ts were not updated to check the new paths. This is the same class of bug as the review skill path issue (PR #365). Watch for: any migration that moves files must audit all modules that reference those paths.

### [2026-03-26] Zero test coverage on doctor.ts, status.ts, prompts.ts
- **Type**: RISK [open]
- **Source**: Codebase audit (K4/K5), Issue #438
- **Tags**: testing, coverage, quality-gap
- **Outcome**: accepted — issue created for v1.7.0
- **Last-verified**: 2026-03-26
- **Context**: Three core modules have no test coverage. doctor.ts and status.ts bugs (K1/K3) would have been caught by tests. Priority for test expansion.

### [2026-03-26] Review skill had wrong path for agent-patterns.json
- **Type**: DEFECT [fixed]
- **Source**: PR #365 (fix/355), Copilot finding
- **Tags**: routing, review-skill, path
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: Review skill referenced agent-patterns.json at wrong path. Corrected to `.dev-team/hooks/agent-patterns.json`. Path correctness is a recurring theme — verify paths in skill definitions during review. Seen: 3 times (this + doctor.ts K1 + status.ts K3).
