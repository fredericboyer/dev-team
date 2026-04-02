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

### [2026-03-26] Rules research (#406) — verify claims against official docs, not third-party

- **Type**: CALIBRATION [verified]
- **Source**: Issue #406, Turing research
- **Tags**: research, verification, rules, official-docs
- **Outcome**: corrected
- **Last-verified**: 2026-03-26
- **Context**: Initial research on `.claude/rules/` incorrectly stated subagents don't inherit rules. User corrected with official Claude Code documentation confirming rules ARE inherited by subagents and agent teams. Lesson: always verify behavioral claims against official platform documentation, not third-party blog posts or inferred behavior. This correction shaped ADR-033.

### [2026-03-27] README structure guidelines (#447)

- **Type**: RESEARCH [completed]
- **Source**: Issue #447, PR #452
- **Tags**: readme, documentation, scaffolding, validation
- **Outcome**: brief written to `docs/research/447-readme-structure-guidelines-2026-03-28.md`
- **Last-verified**: 2026-03-27
- **Calibration**: README best practices are stable and well-documented — high-confidence research area. The tiered model (5 essential + recommended) synthesizes consensus across Make a README, Good Docs Project, and OSS survey. Key decision: validation over scaffolding — dev-team should check README quality, not generate READMEs. Established projects can get away with minimal READMEs; most projects cannot. README vs CLAUDE.md boundary is clean: humans vs agents, marketing vs directives.

### [2026-03-29] Adversarial review health thresholds (#490)

- **Type**: RESEARCH [completed]
- **Source**: Issue #490
- **Tags**: calibration, review, metrics, thresholds, false-positive
- **Outcome**: brief written to `docs/research/490-adversarial-review-health-2026-03-29.md`
- **Last-verified**: 2026-03-29
- **Calibration**: AI code review precision data is abundant (4 independent benchmarks in 2025-2026) but no study directly addresses adversarial multi-agent review with project memory. Thresholds must be synthesized from adjacent domains (SAST FP rates, human review usefulness, AI review precision). Confidence is Medium — will increase to High after 3-5 more full adversarial review cycles. Key insight: 0% overrule at n=24 is insufficient data, not a calibration signal. The 60-85% acceptance rate band and 1-10% overrule rate band are grounded in multiple independent sources but should be recalibrated against dev-team's own data.

### [2026-03-29] Adversarial review health thresholds — synthesized from adjacent domains

- **Type**: CALIBRATION [verified]
- **Source**: Issue #490, research brief
- **Tags**: calibration, review, metrics, thresholds
- **Outcome**: completed
- **Last-verified**: 2026-03-29
- **Context**: No direct studies on adversarial multi-agent review with project memory. Thresholds synthesized from SAST FP rates, human review usefulness surveys, and AI code review precision benchmarks (4 independent 2025-2026 sources). Recommended bands: 60-85% acceptance rate, 1-10% overrule rate. dev-team's 0% overrule at n=24 is insufficient data, not a calibration signal. Confidence: Medium — recalibrate after 3-5 more full adversarial cycles.

### [2026-03-29] Agent runtime portability research (#264)

- **Type**: RESEARCH [completed]
- **Source**: Issue #264
- **Tags**: portability, multi-runtime, AGENTS.md, MCP, adapters, standards
- **Outcome**: brief written to `docs/research/264-agent-runtime-portability-2026-03-29.md`
- **Last-verified**: 2026-03-30
- **Calibration**: The agent runtime landscape has two settled standards (AGENTS.md for instructions, MCP for tools) and everything else is fragmented. Hooks, skills, memory, and multi-agent are not standardized — only Claude Code and Codex CLI have hooks, and their formats differ. The hybrid architecture (AGENTS.md core + runtime adapters) preserves dev-team's value. MCP enforcement server was removed in v2.0.1 — hooks remain primary. Key discovery: AAIF under Linux Foundation (Dec 2025) is the strongest convergence signal — AGENTS.md, MCP, and goose under one roof. Claude Code's non-adoption of AGENTS.md is the largest single portability risk. Cursor and Windsurf adapters removed in v2.0.1 — format churn validated the risk.

### [2026-03-30] Standards landscape for coding agent interoperability

- **Type**: CALIBRATION [verified]
- **Source**: Issue #264 research
- **Tags**: standards, AAIF, W3C, IETF, A2A, ACP, ANP
- **Outcome**: completed
- **Last-verified**: 2026-03-30
- **Context**: Four agent communication protocols exist (MCP, A2A, ACP, ANP) but only MCP is relevant for coding agents — the others target enterprise orchestration or decentralized networks. W3C and IETF have early-stage work (AI Agent Protocol CG, AIDIP) but nothing targeting coding agent configuration. The AAIF is the only governance body that matters for this space. When researching agent standards, focus on AAIF projects (AGENTS.md, MCP) and skip the enterprise/network protocols unless the question specifically involves agent-to-agent delegation.

### [2026-03-30] Runtime verification for review step (#525)

- **Type**: RESEARCH [completed]
- **Source**: Issue #525
- **Tags**: browser-testing, playwright, agent-browser, review, runtime-verification
- **Outcome**: brief written to `docs/research/525-runtime-verification-2026-03-30.md`
- **Last-verified**: 2026-03-30
- **Calibration**: Browser tool landscape for AI agents is maturing fast (6+ tools in 2026). Key differentiation is token efficiency: Playwright CLI ~27k/session, agent-browser ~3-5k/page, MCP ~114k/session. The recommendation is tool-agnostic — leverage Claude Code's skill discovery rather than binding dev-team to a specific browser tool. This aligns with the "don't encode what agents already know" principle. When user asks about tool binding, the correct answer is usually "let the agent discover and use available tools" rather than building an abstraction layer.

### [2026-03-30] Skill recommendations as the integration seam

- **Type**: CALIBRATION [verified]
- **Source**: Issue #525 research
- **Tags**: skills, integration, tool-agnostic, design-principle
- **Outcome**: completed
- **Last-verified**: 2026-03-30
- **Context**: `skill-recommendations.json` is an underappreciated integration point. Rather than building tool-specific subsystems, dev-team can influence which tools agents have available by recommending skills for detected ecosystems. This is lighter than hooks, cheaper than custom integration code, and respects Claude Code's native skill discovery. For future tool integration questions (linters, formatters, browser tools), consider "add a skill recommendation" before "build a wrapper."

### [2026-03-30] Codex CLI evaluation (#508) — skills transfer well, hooks do not

- **Type**: RESEARCH [completed]
- **Source**: Issue #508
- **Tags**: codex, multi-runtime, adapters, portability, evaluation
- **Outcome**: brief written to `docs/research/508-codex-cli-evaluation-2026-03-30.md`
- **Last-verified**: 2026-03-30
- **Calibration**: Codex CLI has near-identical skill format (~95% transfer rate) but experimental hook system with limited Bash scope (~30% coverage). The recommendation is: adapt skills and instructions fully, skip hooks. Hooks are Claude Code's differentiator. MCP enforcement was removed in v2.0.1 — hooks remain primary enforcement mechanism. This research directly shaped the Codex adapter implementation (skills + AGENTS.md, no hooks).

### [2026-03-26] Research-first approach validated in v1.6.0

- **Type**: PATTERN [verified]
- **Source**: v1.6.0 session (#406, #407 research briefs)
- **Tags**: research, orchestration, process
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: Two research briefs (#406 rules-based context, #407 AGENTS.md verdict) preceded 14 implementation issues. Research findings directly shaped ADR-033, ADR-034, and the design principles. Process confirmation: research-first reduces rework for architectural changes.
