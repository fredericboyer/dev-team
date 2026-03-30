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

### [2026-03-29] mergeClaudeMd duplicate BEGIN — FIXED in v1.8.0
- **Type**: RISK [fixed]
- **Source**: #461, PR #479
- **Tags**: boundary-condition, merge-logic
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Missing END marker now triggers replace-from-BEGIN-to-EOF instead of append. Also fixed END-before-BEGIN edge case by searching for END only after BEGIN position. Two distinct boundary conditions fixed in same PR.

### [2026-03-29] v1.8.0: 18 new tests added — assertNotSymlink, assertNoSymlinkInPath, safeRegex
- **Type**: PATTERN [new]
- **Source**: #480, PR #480
- **Tags**: testing, coverage, symlink, regex
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Test coverage expanded for security-critical functions. Tests cover: leaf symlink rejection, ancestor symlink traversal, realpathSync design tradeoff, safeRegex nested quantifier rejection. Follows sentinel-throw pattern established in v1.7.0.

## Recurring Boundary Conditions

### [2026-03-25] Vocabulary alignment across agent/skill boundaries
- **Type**: PATTERN [verified]
- **Source**: v1.2.0 Branch A (#275, #266) — task skill review
- **Tags**: vocabulary, cross-agent, skill-definition
- **Outcome**: verified
- **Last-verified**: 2026-03-29
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
- **Type**: RISK [fixed]
- **Source**: Codebase audit (K4/K5), Issue #438, PR #453
- **Tags**: testing, coverage, quality-gap
- **Outcome**: fixed — tests added in v1.7.0
- **Last-verified**: 2026-03-27
- **Context**: Fixed: doctor.test.js, status.test.js, prompts.test.js added. Uses sentinel-throw pattern for process.exit stubs. All three registered in package.json test script.

### [2026-03-27] v1.7.0: Memory file at wrong path — dev-team-deming/ not deming/
- **Type**: DEFECT [fixed]
- **Source**: PR #450 (#440)
- **Tags**: path-correctness, memory, naming-convention
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: Agent memory directory was `deming/` instead of `dev-team-deming/`. Inconsistent with naming convention used by all other agents. Path correctness pattern continues — Seen: 4 times (doctor.ts K1, status.ts K3, review skill path, memory dir). Migration-completeness learning applies beyond code to data directories.

### [2026-03-27] v1.7.0: lib copy merge ordering — Chain B recursive approach supersedes Chain A
- **Type**: SUGGESTION [accepted]
- **Source**: PR #455 (Chain B, #434)
- **Tags**: update, lib-copy, merge-ordering
- **Outcome**: accepted
- **Last-verified**: 2026-03-27
- **Context**: Chain A added single-file lib copy for ensureSymlink; Chain B added recursive lib/ directory copy for git-cache.js + safe-regex.js. At merge, Chain B's recursive approach naturally superseded Chain A's single-file approach. No code conflict, just ordering awareness.

### [2026-03-29] v1.9.0: Skill composability — skill-calls-skill pattern verified
- **Type**: PATTERN [verified]
- **Source**: PR #492 finding #12, PR #496 finding #17
- **Tags**: skills, composability, architecture
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: /dev-team:extract is invoked by /dev-team:task and /dev-team:retro. /dev-team:review is invoked by /dev-team:task with --embedded flag. Skill-calls-skill runtime confirmed working. Edge cases documented: empty finding log handled, compact summary passthrough for subsequent review rounds. ADR-035 deferred to #493 for formal documentation of the composability pattern.

### [2026-03-29] v1.9.0: Vocabulary alignment reinforced — "consumed programmatically" wording fixed
- **Type**: SUGGESTION [accepted]
- **Source**: PR #496 finding #16
- **Tags**: vocabulary, skill-definition, review
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Review skill SKILL.md had misleading "consumed programmatically" wording. Fixed to clarify that the output is consumed by the orchestrating skill (task), not by a machine parser. Vocabulary alignment pattern continues (Seen: 3 times — v1.2.0 task skill, v1.9.0 extract skill, v1.9.0 review skill).

### [2026-03-29] v1.10.0: Missing gate in .claude copy of merge skill — FIXED
- **Type**: DEFECT [fixed]
- **Source**: PR #512, finding #7
- **Tags**: path-correctness, skill-definition, merge
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Merge skill gate logic was updated in .dev-team/skills/ but the .claude/skills/ copy was not staged. Path correctness pattern continues — Seen: 5 times (doctor.ts K1, status.ts K3, review skill path, memory dir deming/, merge skill .claude copy).

### [2026-03-29] v1.10.0: Stray commits from shared working directory — bundled wrong commits into PRs
- **Type**: RISK [accepted]
- **Source**: PR #509 finding #8, PR #511 finding #9
- **Tags**: agent-teams, working-directory, contention, stray-commits
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: PR #509 bundled commits from #490 + #494; PR #511 bundled #490 + #493. Both caused by agents sharing a working directory. Reinforces v1.7.0 finding — worktree isolation prevents cross-branch contamination. Seen: 2nd occurrence (v1.7.0 had 3 stray commits, v1.10.0 had 2 bundled PRs).

### [2026-03-29] v1.10.1: 3 findings ignored — defense-in-depth, test scope, error handling
- **Type**: CALIBRATION
- **Source**: #515, PR #516
- **Tags**: calibration, hotfix
- **Outcome**: 0 accepted, 1 deferred, 2 ignored
- **Last-verified**: 2026-03-29
- **Context**: HOOK_FILES redundancy with ghost filter (ignored — defense in depth), hookRemovals test gap (deferred — unit tests cover it), removeHooksFromSettings swallowing invalid JSON (ignored — mergeSettings runs first). All advisory, no quality signal.

### [2026-03-26] Review skill had wrong path for agent-patterns.json
- **Type**: DEFECT [fixed]
- **Source**: PR #365 (fix/355), Copilot finding
- **Tags**: routing, review-skill, path
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: Review skill referenced agent-patterns.json at wrong path. Corrected to `.dev-team/hooks/agent-patterns.json`. Path correctness is a recurring theme — verify paths in skill definitions during review. Seen: 4 times (this + doctor.ts K1 + status.ts K3 + memory dir deming/ v1.7.0).

### [2026-03-29] v1.11.0: Test coverage expanded — init error paths, update backup, createAgent, CLI help
- **Type**: PATTERN [new]
- **Source**: #540, #541, #542, #545, #548, PR #557
- **Tags**: testing, coverage, init, update, cli
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: 5 test coverage issues addressed in single PR. New tests for: init error paths (missing package.json, invalid config), update backup flow, createAgent validation (empty name, missing fields), CLI --help output, hookRemovals integration. Continues the coverage expansion pattern from v1.7.0 (#438) and v1.8.0 (#480).
