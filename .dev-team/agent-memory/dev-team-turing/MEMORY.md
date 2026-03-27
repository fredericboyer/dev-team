# Agent Memory: Turing (Pre-implementation Researcher)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Research Patterns

### [2026-03-25] First install — no research history yet
- **Type**: PATTERN [verified]
- **Source**: initial setup
- **Tags**: research, setup
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Turing was added in v1.1. Research briefs will be written to .dev-team/research/. Borges manages temporal decay (90-day archive).

### [2026-03-26] Multi-user concurrency model (#257)
- **Type**: RESEARCH [completed]
- **Source**: issue #257
- **Tags**: concurrency, memory, multi-user, agent-status
- **Outcome**: brief written to `.dev-team/research/257-multi-user-model-2026-03-26.md`
- **Last-verified**: 2026-03-26
- **Calibration**: Language bias lives entirely in the pattern/hook layer — agent definitions and skills are agnostic. When researching cross-language support, always test regex patterns against actual conventions (e.g., `_test.go` vs `.test.ts`, hooks lowercase paths before matching). See `docs/benchmark-non-jsts.md` for full findings and prioritized recommendations.

### [2026-03-26] Non-JS/TS ecosystem benchmark (#325)
- **Type**: RESEARCH [completed]
- **Source**: issue #325
- **Tags**: multi-language, python, rust, go, java, hooks, patterns
- **Outcome**: benchmark written to `docs/benchmark-non-jsts.md`
- **Last-verified**: 2026-03-26
- **Calibration**: Language bias lives entirely in the pattern/hook layer — agent definitions and skills are agnostic. When researching cross-language support, always test regex patterns against actual conventions (e.g., `_test.go` vs `.test.ts`, hooks lowercase paths before matching). See `docs/benchmark-non-jsts.md` for full findings and prioritized recommendations.
