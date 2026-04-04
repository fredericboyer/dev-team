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
- **Last-verified**: 2026-03-30
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

### [2026-03-26→2026-03-30] v1.6.0–v2.0 architectural decisions (compressed)
- **Type**: DECISION [compressed]
- **Tags**: architecture, skills, hooks, adapters, mcp
- **Last-verified**: 2026-04-04
- **Context**: **v1.6–v1.7**: Process-driven agents (ADR-033 rules, ADR-034 language delegation). **v1.8**: INFRA_HOOKS separation (temporary workaround for Claude Code bugs #34645/#39680); task skill 4-step decomposition. **v1.9**: Skill composability (extract+review as sub-skills, ADR-035); --reviewers removal is breaking change. **v1.10**: 4-way learnings merge conflicts require sequential ordering; HookEntry interface extended with timeout/blocking. **v1.11**: Review tiers (LIGHT/STANDARD/DEEP) and DoD formalized; calibration examples path may be missing in user projects (deferred). **v2.0**: Adapter registry (ADR-036) with RuntimeAdapter interface; barrel file for adapter registration (fixed side-effect imports); MCP enforcement (ADR-037) added then removed in v2.0.1 — dual code path risk resolved by removal.

### [2026-04-02] v3.3.0: Pre-assessment correctly identified ADR need for #671
- **Type**: CALIBRATION
- **Source**: v3.3.0 pre-assessment
- **Tags**: pre-assessment, adr, mergify, calibration
- **Outcome**: verified
- **Last-verified**: 2026-04-02
- **Context**: Brooks pre-assessment correctly identified #671 (Mergify ADR) as COMPLEX requiring ADR and FULL review. The FULL review subsequently caught the sole DEFECT. Pre-assessment also correctly identified file independence across the 7 issues, enabling parallelization.

### [2026-04-02] Branch contamination — persistent pattern across releases
- **Type**: PATTERN [verified]
- **Source**: v3.3.0 + v3.4.0 + v3.6.0 delivery observations
- **Tags**: architecture, agent-teams, worktrees, contamination
- **Outcome**: accepted
- **Last-verified**: 2026-04-04
- **Context**: Cross-branch contamination recurred in v3.4.0 (PR #694 picked up #688's research doc, PR #698 picked up #691 and #683 files). Additionally, shared file contamination was universal — every worktree agent committed Borges memory and metrics changes from unpushed local main (aeda27f). Seen: 6 times (v1.7.0, v1.10.0, v3.3.0, v3.4.0, v3.6.0, v3.8.0). Root cause in v3.4.0: worktrees branched from local main with unpushed commits. v3.6.0: stashed changes + agent teams sharing working directory. Worktree isolation prevents cross-branch contamination but not stale-base contamination.

### [2026-04-03] v3.6.0: Skill name changes propagate to all installed projects (PR #734)
- **Type**: RISK [accepted]
- **Source**: PR #734, Copilot finding (x8 files)
- **Tags**: skills, breaking-change, propagation, installed-projects
- **Outcome**: accepted
- **Last-verified**: 2026-04-03
- **Context**: A skill rename touched 8 files and will affect all projects that have dev-team installed. Skill names are part of the user-facing contract — renaming them is a breaking change for users who invoke skills by name in workflows, CLAUDE.md files, or scripts. Pattern: treat skill name changes as breaking changes; note in release notes and changelog. Conway should include skill renames in the breaking changes section.

### [2026-04-03] v3.6.0: Duplicated parser logic across modules (PR #738)
- **Type**: RISK [accepted]
- **Source**: PR #738, Copilot finding
- **Tags**: architecture, duplication, parser, refactoring
- **Outcome**: accepted — deferred refactor
- **Last-verified**: 2026-04-03
- **Context**: Copilot flagged duplicated parser logic in PR #738. Accepted as advisory — deferred refactor. Pattern: parser duplication is a recurring architectural smell in the codebase (see also K10 MCP deriveRequiredAgents divergence, dual code path risk). Watch for parser logic that should live in a shared utility to avoid drift.

### [2026-04-04] v3.8.0: Shared hook logic drift — sanitization, CODE_FILE_PATTERN, sidecar model
- **Type**: PATTERN [new]
- **Source**: PRs #793, #794, #796
- **Tags**: architecture, hooks, drift, shared-logic
- **Outcome**: accepted
- **Last-verified**: 2026-04-04
- **Context**: v3.8.0 revealed multiple hook logic drift instances: branch sanitization diverged between review-gate and merge-gate (3 DEFECTs), CODE_FILE_PATTERN diverged between hooks, sidecar model needed centralization (#787). Pattern: hooks that share concepts (branch names, file patterns, sidecar format) need a shared module or ADR-level spec to prevent drift. See also v2.0 dual-code-path sync risk (K10). Architectural recommendation: consolidate shared hook logic into templates/hooks/lib/.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
