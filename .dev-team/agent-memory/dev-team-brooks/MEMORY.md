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

### [2026-03-27] v1.7.0: Working directory contention — agent teams need worktree isolation
- **Type**: PATTERN [new]
- **Source**: v1.7.0 delivery operational observation
- **Tags**: architecture, agent-teams, worktrees, contention
- **Outcome**: accepted
- **Last-verified**: 2026-03-27
- **Context**: Multiple agent teams sharing a single working directory caused cross-branch contamination: branch switches under each other, stray commits on wrong branches, stale stashes. Architectural recommendation: one worktree per agent for multi-branch parallel work. This is a coordination architecture concern, not just a process issue.

### [2026-03-27] v1.7.0: Hardcoded single-file lib copy superseded by recursive approach
- **Type**: RISK [accepted]
- **Source**: PR #454 (Chain A, #446)
- **Tags**: architecture, update, lib-copy
- **Outcome**: accepted
- **Last-verified**: 2026-03-27
- **Context**: Chain A hardcoded a single lib file copy in update.ts. Chain B replaced this with recursive lib/ directory copy. Accepted as the merge ordering naturally resolved this — no architectural debt remaining.

### [2026-03-29] v1.8.0: INFRA_HOOKS array — infrastructure vs quality hook separation
- **Type**: DECISION [new]
- **Source**: #482, PR #482
- **Tags**: architecture, hooks, init, infrastructure
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: init.ts now separates INFRA_HOOKS (always installed, not user-selectable) from QUALITY_HOOKS (opt-in). WorktreeCreate/WorktreeRemove are infrastructure hooks — they serialize worktree creation to work around Claude Code bugs (#34645, #39680). This is a TEMPORARY architectural pattern; remove when upstream fixes land. Brooks should watch for INFRA_HOOKS growth — infrastructure hooks bypass user choice.

### [2026-03-29] v1.8.0: Task skill 4-step decomposition (Implement, Review, Merge, Extract)
- **Type**: DECISION [new]
- **Source**: #481, PR #481
- **Tags**: architecture, skills, task, orchestration
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Task skill decomposed into 4 explicit steps with shared definitions between single-issue and parallel modes. Both modes reference the same step definitions — prevents drift. Review step changed from batched waves to per-PR-as-it-lands. This is an architectural boundary: step definitions are the contract between task orchestration and agent execution.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
