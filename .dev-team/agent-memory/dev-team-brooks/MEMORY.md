# Agent Memory: Brooks (Architect)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-25] ADRs govern architecture — key decisions documented in docs/adr/
- **Type**: PATTERN [verified]
- **Source**: docs/adr/ + package.json analysis
- **Tags**: architecture, adr, structure
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Key ADRs: 001 (hooks over CLAUDE.md), 002 (zero deps), 005 (adversarial agents), 007 (oxc tooling), 019 (parallel review waves), 022 (agent proliferation governance). TypeScript with NodeNext module resolution (ADR-021). Always check docs/adr/ for current count and contents.

### [2026-03-25] Module structure: src/ to dist/ with templates/ shipped separately
- **Type**: PATTERN [verified]
- **Source**: project structure analysis
- **Tags**: architecture, modules, build
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: src/ contains core modules (init, files, scan, create-agent, update, doctor, status, skill-recommendations, prompts). bin/dev-team.js is the CLI shim. templates/ contains agents, hooks, skills shipped to target projects. .dev-team/ is self-use only.

### [2026-03-25] Strict separation: templates/ (shipped) vs .dev-team/ (self-use)
- **Type**: PATTERN [verified]
- **Source**: CLAUDE.md + package.json files array
- **Tags**: architecture, boundaries
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: templates/ contains what gets installed in target projects. .dev-team/ contains dev-team's own agents/hooks/skills for dogfooding. Improvements must target templates/ to ship in releases — never modify .dev-team/ for improvements (overwritten by update).

### [2026-03-25] Agent proliferation governed by ADR-022 — soft cap of 15
- **Type**: DECISION [verified]
- **Source**: docs/adr/022-agent-proliferation-governance.md
- **Tags**: architecture, agents, governance
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: New agents require justification against 4 criteria. Brooks flags additions during architectural review. Drucker evaluates extending existing agents first.

## Patterns to Watch For

### [2026-03-26] Sequential chain merges must integrate-as-you-go
- **Type**: PATTERN [verified]
- **Source**: PR #375 (fix/374), Brooks pre-assessment finding
- **Tags**: orchestration, merging, sequential-chains
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: When issues form a sequential chain (each depending on the previous), each PR must be merged before the next agent branches. Branching from stale main nullifies the sequencing. This was a process gap discovered during v1.5.0 delivery.

### [2026-03-26] SHARED.md extraction pattern for agent definitions (ADR-030)
- **Type**: DECISION [verified]
- **Source**: PR #376 (feat/353), ADR-030
- **Tags**: architecture, agents, shared-protocol
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: Common agent protocol sections extracted to SHARED.md to reduce duplication. ~16% reduction in total agent definition lines. Brooks should watch for drift between SHARED.md and individual agent overrides.

### [2026-03-26] Process-driven agents: capabilities in definitions, steps in process.md
- **Type**: DECISION [verified]
- **Source**: Issue #405, v1.6.0 design principles
- **Tags**: architecture, agents, process, separation-of-concerns
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: Agent definitions describe what the agent can do (capabilities), not how a specific project uses them (workflow steps). Steps live in `.claude/rules/dev-team-process.md` which each project customizes. This separates stable agent identity from variable project workflow. Brooks should flag agent definitions that embed workflow steps.

### [2026-03-26] Two new ADRs in v1.6.0: 033 (rules-based context), 034 (language delegation)
- **Type**: DECISION [verified]
- **Source**: PRs #425, #419
- **Tags**: architecture, adr
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: ADR-033 uses `.claude/rules/` for automatic shared context loading (replaces explicit read instructions). ADR-034 delegates language-specific knowledge from hooks to agents (hooks detect, agents interpret). Both support the "discoverable-only" and "language-neutral" design principles.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
