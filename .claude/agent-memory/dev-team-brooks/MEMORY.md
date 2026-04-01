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
- **Type**: DECISION [verified]
- **Source**: #481, PR #481
- **Tags**: architecture, skills, task, orchestration
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Task skill decomposed into 4 explicit steps with shared definitions between single-issue and parallel modes. Both modes reference the same step definitions — prevents drift. Review step changed from batched waves to per-PR-as-it-lands. This is an architectural boundary: step definitions are the contract between task orchestration and agent execution.

### [2026-03-29] v1.9.0: Skill composability pattern — extract + review as sub-skills
- **Type**: DECISION [verified]
- **Source**: PR #492, PR #496
- **Tags**: architecture, skills, composability, orchestration
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Two new composability patterns established: (1) /dev-team:extract extracted from task/retro as standalone skill with disable-model-invocation:true, (2) /dev-team:review gains --embedded flag for invocation by task skill. ADR-035 deferred (#493) to formally document the skill composability pattern. Brooks should watch for: skill interface drift (extract contract vs task expectations), scorecard awareness gap (#494), and --reviewers removal as breaking change for direct review invocation.

### [2026-03-29] v1.9.0: --reviewers removal is a breaking change for direct review users
- **Type**: RISK [accepted]
- **Source**: PR #496 finding #20
- **Tags**: architecture, skills, breaking-change, review
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Task skill now controls reviewer selection (no longer passed via --reviewers to review skill). This is a breaking change for anyone invoking /dev-team:review directly with --reviewers. Must be called out in v1.9.0 release notes. The --embedded pattern subsumes the old --reviewers interface.

### [2026-03-29] v1.10.0: 4-way learnings merge conflict — sequential merge ordering required
- **Type**: PATTERN [new]
- **Source**: PR #509/#510/#511/#512, findings #3/#4
- **Tags**: orchestration, merging, learnings, parallel-branches
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Four parallel branches all edited dev-team-learnings.md, creating a 4-way merge conflict. Resolved via sequential merge ordering with conflict resolution between each merge. Same class as "sequential chains must integrate-as-you-go" — parallel branches touching shared files require merge coordination, not just sequential chains.

### [2026-03-29] v1.10.1: HookEntry interface extended with timeout/blocking fields
- **Type**: RISK [accepted]
- **Source**: #515, PR #516, finding #6
- **Tags**: architecture, hooks, interface, typing
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Brooks flagged HookEntry interface as incomplete — missing timeout and blocking fields that exist in settings.json hook entries. Extended to match runtime shape. mergeSettings Object.assign now correctly propagates these attributes during update.

### [2026-03-29] v1.11.0: Review tiers and DoD formalized in review/task skills
- **Type**: DECISION [new]
- **Source**: #519, #520, PR #551
- **Tags**: architecture, skills, review, anti-patterns
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Review skill now defines explicit tiers (LIGHT/STANDARD/DEEP) and Definition of Done criteria. Anti-pattern sections added to reviewer agent definitions. Harness assumption audit added to retro skill (#521, PR #550). Calibration examples shipped for reviewer agents (#522, PR #553). These are template improvements — shipped to all users.

### [2026-03-29] v1.11.0: Calibration examples path missing in user projects
- **Type**: RISK [deferred]
- **Source**: PR #553, Brooks finding
- **Tags**: architecture, calibration, init, path
- **Outcome**: deferred
- **Last-verified**: 2026-03-29
- **Context**: Calibration examples directory exists in templates but init/update may not copy it to user projects. Path correctness pattern continues (Seen: 6th instance). Deferred — not blocking, examples are reference material.

### [2026-03-30] v2.0: Adapter registry architecture (ADR-036) — modular multi-runtime support
- **Type**: DECISION [new]
- **Source**: #501, PR #569
- **Tags**: architecture, adapters, multi-runtime, registry-pattern
- **Outcome**: accepted
- **Last-verified**: 2026-03-30
- **Context**: RuntimeAdapter interface (generate + update) with central registry. ClaudeCodeAdapter is identity transform. init.ts and update.ts iterate adapters instead of inline copy logic. Config field `runtimes` (default: `["claude"]`) controls which adapters fire. This is the multi-runtime foundation — adding a new runtime requires only implementing RuntimeAdapter and registering it. No changes to init.ts or update.ts.

### [2026-03-30] v2.0: Side-effect imports fixed with barrel file (S2)
- **Type**: DEFECT [fixed]
- **Source**: PR #569, Brooks finding S2
- **Tags**: architecture, imports, side-effects, barrel-file
- **Outcome**: fixed
- **Last-verified**: 2026-03-30
- **Context**: Initial adapter registration used side-effect imports (import for registration side effect only). Brooks flagged this as violating ADR-036 principle of explicit registration. Fixed: barrel file `src/adapters/index.ts` consolidates all adapter imports. Importing the barrel registers all adapters. Note: init.ts has a duplicate `import "./adapters/index.js"` line that should be cleaned up.

### [2026-03-30] v2.0: MCP server as enforcement portability layer (ADR-037)
- **Type**: DECISION [new]
- **Source**: #503, PR #572
- **Tags**: architecture, mcp, enforcement, portability
- **Outcome**: accepted
- **Last-verified**: 2026-03-30
- **Context**: Hooks are Claude Code-proprietary. MCP is the only cross-runtime enforcement mechanism. Server exposes read-only tools (review_gate first). Zero dependencies per ADR-002. Stdio transport (one server per session). Architectural risk: two code paths for same logic (hook + MCP tool) — must keep in sync. Tool registry pattern allows adding more enforcement tools without modifying server core.

### [2026-03-30] v2.0: Dual code path sync risk — hook vs MCP enforcement
- **Type**: RISK [removed in v2.0.1]
- **Source**: PRs #569, #572, ADR-037
- **Tags**: architecture, code-sync, hooks, mcp, risk
- **Outcome**: accepted
- **Last-verified**: 2026-03-30
- **Context**: MCP enforcement server removed in v2.0.1, eliminating the dual code path sync risk. review_gate logic now exists only in dev-team-review-gate.js (hook). The K10 divergence finding validated the risk — removal was the simplest resolution.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
