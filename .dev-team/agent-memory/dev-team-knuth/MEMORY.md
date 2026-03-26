# Agent Memory: Knuth (Quality Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Coverage Gaps Identified

### [2026-03-25] Three-tier test structure using Node.js built-in test runner
- **Type**: PATTERN [verified]
- **Source**: package.json + project structure analysis
- **Tags**: testing, coverage, test-runner
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Node.js `node --test` runner, no third-party test framework. Tests are pre-compiled JS (not TS). Three tiers: unit (individual modules), integration (install flows), scenarios (end-to-end project types).

### [2026-03-25] No coverage tool configured — coverage is not measured
- **Type**: PATTERN [verified]
- **Source**: package.json analysis
- **Tags**: testing, coverage
- **Outcome**: verified
- **Last-verified**: 2026-03-25
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

### [2026-03-25] Routing table ownership patterns — .env to Voss, .env.example to Hamilton
- **Type**: PATTERN [verified]
- **Source**: v1.2.0 Branch C (#273) — review skill routing fix
- **Tags**: routing, ownership, review-skill
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: .env files route to Voss (app config/data). .env.example and .env.template route to Hamilton (infra scaffolding). CI workflows (.github/workflows) route to Hamilton. This distinction matters for correct reviewer assignment.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-03-25] v1.2.0 — 17 findings, 0 overruled, 3/3 DEFECTs fixed
- All 3 DEFECTs accepted and fixed in round 2. Zero pushback.
- Advisory findings: 7 accepted, 7 deferred (follow-up issues), 0 overruled.
- Deferred items are legitimate follow-ups, not rejections. Calibration signal: advisory finding quality is good but volume could be tuned — 7 deferred out of 14 advisory suggests some findings are premature for the current scope.
- Watch: "section name collision" and "overlap" findings tend to get deferred. Consider raising threshold for naming/overlap suggestions unless they cause functional ambiguity.
