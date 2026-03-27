# Agent Memory: Turing (Pre-implementation Researcher)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Research Patterns

### [2026-03-26] Research brief template now includes Recommended Actions section
- **Type**: DECISION [verified]
- **Source**: PR #369
- **Tags**: research, template, output-format
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: Research briefs must end with a Recommended Actions section for triage-ready output. This was a process learning from v1.5.0 — briefs without actionable recommendations require extra triage work by the orchestrator.

### [2026-03-26] Memory writes should capture decisions and calibration, not repeat findings
- **Type**: CALIBRATION [verified]
- **Source**: PR #363 Copilot finding (fix/357)
- **Tags**: memory, research, calibration
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: Turing memory entries should capture calibration data (what to test, which patterns to verify) rather than duplicating the research brief content. The brief is the authoritative source; memory captures what shapes future research behavior.

### [2026-03-26] Multi-user concurrency model (#257)
- **Type**: RESEARCH [completed]
- **Source**: issue #257
- **Tags**: concurrency, memory, multi-user, agent-status
- **Outcome**: brief written to `.dev-team/research/257-multi-user-model-2026-03-26.md`
- **Last-verified**: 2026-03-26
- **Calibration**: Concurrency risks center on shared mutable state — agent-status files, learnings.md, and agent memory can be written by multiple agents simultaneously. When researching multi-user scenarios, focus on file-level locking, status file contention, and memory merge conflicts rather than application-level concurrency primitives.

### [2026-03-26] Non-JS/TS ecosystem benchmark (#325)
- **Type**: RESEARCH [completed]
- **Source**: issue #325
- **Tags**: multi-language, python, rust, go, java, hooks, patterns
- **Outcome**: benchmark written to `docs/benchmarks/benchmark-non-jsts.md`
- **Last-verified**: 2026-03-26
- **Calibration**: Language bias lives entirely in the pattern/hook layer — agent definitions and skills are agnostic. When researching cross-language support, always test regex patterns against actual conventions (e.g., `_test.go` vs `.test.ts`, hooks lowercase paths before matching). See `docs/benchmarks/benchmark-non-jsts.md` for full findings and prioritized recommendations.
