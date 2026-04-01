# Calibration Examples: Knuth (Quality Auditor)

Annotated examples of correctly classified findings from this project's review history. Use these to calibrate finding severity and avoid repeat miscalibrations.

### Example 1: FIXED — Missing gate in .claude copy of merge skill

**Finding:** Merge skill gate logic was updated in .claude/skills/ source but the installed copy was not staged. The installed copy lacks the new gate check, so users running /merge would bypass the gate.
**Classification:** [DEFECT]
**Outcome:** fixed
**Why:** This is a functional gap — the installed copy diverged from the source copy. Users would hit the ungated path. The fix was to stage and commit both copies together.
**Lesson:** Path correctness is a recurring quality pattern in this project (seen 5 times: doctor.ts, status.ts, review skill, memory dir, merge skill .claude copy). Any change to a skill or hook must audit all copies. This is the single most common defect class.

### Example 2: ACCEPTED — Vocabulary alignment across skill boundaries

**Finding:** Task skill used "addressed/deferred/disputed" outcome vocabulary but Borges expects "accepted/overruled/fixed/ignored". Mismatch breaks automated memory extraction.
**Classification:** [SUGGESTION]
**Outcome:** accepted (vocabulary standardized)
**Why:** Cross-boundary vocabulary mismatches cause silent failures — Borges parses outcomes and cannot match non-standard terms. This was the 5th occurrence of vocabulary alignment issues across the project (v1.2.0 task skill, v1.9.0 extract skill, v1.9.0 review skill, v1.10.0 retro skill).
**Lesson:** When one component produces structured output consumed by another, vocabulary must be explicitly aligned. Check the consumer's expected vocabulary before introducing new terms. Recurring pattern: any skill that outputs Finding Outcome Log entries must use the standardized vocabulary (fixed, accepted, deferred, overruled, ignored).

### Example 3: ACCEPTED — Stray commits from shared working directory

**Finding:** PR #509 bundled commits from #490 and #494; PR #511 bundled commits from #490 and #493. Agent teams sharing a working directory caused cross-branch contamination.
**Classification:** [RISK]
**Outcome:** accepted (worktree isolation recommended)
**Why:** This is the 2nd occurrence of the same pattern (v1.7.0 had 3 stray commits, v1.10.0 had 2 bundled PRs). Agents switching branches under each other is not a code quality issue per se, but it produces PRs with incorrect commit sets — a quality signal that the review process must catch.
**Lesson:** When reviewing PRs from parallel agent work, always verify the commit list belongs to the stated issue. Stray commits are a symptom of shared-directory contention. This is a process quality finding, not a code quality finding — but Knuth should flag it because it degrades the traceability chain (requirement to test to commit).

### Example 4: IGNORED — Defense-in-depth redundancy in HOOK_FILES

**Finding:** HOOK_FILES array contains entries that would also be caught by the ghost file filter. The redundancy is unnecessary.
**Classification:** [SUGGESTION]
**Outcome:** ignored
**Why:** Defense-in-depth redundancy is intentional. The HOOK_FILES array is a static allow-list; the ghost filter is a dynamic check. If the ghost filter has a bug, the static list still provides protection. Removing the redundancy saves zero runtime cost and removes a safety net.
**Lesson:** Do not flag defense-in-depth as redundancy unless the duplicate check has a measurable cost (performance, maintenance burden, or confusion risk). Static allow-lists layered with dynamic filters are a standard hardening pattern. This is now in the anti-patterns list for sentinel-throw tests — analogous reasoning applies.

### Example 5: FIXED — Migration drift in doctor.ts and status.ts

**Finding:** When v1.6.0 migrated files from .dev-team/ to .claude/rules/, doctor.ts and status.ts were not updated to check the new paths. Health checks report false negatives for files that exist at the new location.
**Classification:** [DEFECT]
**Outcome:** fixed (issues #431, #432 created for v1.6.1)
**Why:** Migration completeness is a recurring quality gap. Any file move/rename must audit all modules that reference the old path. doctor.ts and status.ts are particularly vulnerable because they enumerate known file paths for health checking.
**Lesson:** After any migration that moves or renames files, grep the codebase for the old path. doctor.ts, status.ts, and skill definitions are the three most common victims of path drift. This is the same class as Example 1 — path correctness is the project's #1 recurring defect.
