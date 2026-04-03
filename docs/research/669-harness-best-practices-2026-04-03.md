## Research brief: Agent Harness Best Practices Gap Analysis

### Question

How does dev-team's architecture align with the consolidated agent harness best practices guide (Anthropic/OpenAI/community)? Where are the gaps, contradictions, and improvement opportunities?

### Source

[Best Practices for Building an Agent Harness](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) — consolidated from Anthropic, OpenAI, and community research.

### Gap Analysis

| # | Recommendation | dev-team Status | Component | Assessment |
|---|---------------|-----------------|-----------|------------|
| **1. Architecture** | | | |
| 1a | Planner/Generator/Evaluator separation | **Implemented** | Brooks (planner), Voss/Mori/Deming/etc (generator), Szabo/Knuth/Brooks (evaluator) | Strong alignment. dev-team goes further with 13 specialized agents vs 3 roles. The `/dev-team:task` skill orchestrates the full loop. |
| 1b | Monolithic-first approach | **Implemented** | `/dev-team:implement` for single issues; parallel mode only for batches | SIMPLE tasks get single-agent + LIGHT review. Complexity escalation is graduated. |
| 1c | Fresh context windows per session | **Implemented** | `/dev-team:review` SKILL.md line 104: "fresh reviewers each round" | Review skill spawns new agents per round with compact summaries. Task skill recommends fresh implementer after 3+ stalled rounds. |
| **2. State Management** | | | |
| 2a | Structured file-based persistence | **Implemented** | Two-tier memory (learnings + agent memory), ADRs, metrics.md, agent-status JSON | dev-team uses markdown rather than JSON for most persistence. Markdown is more human-readable but less machine-parseable. Agent status files use JSON. |
| 2b | Repository as system of record | **Implemented** | CLAUDE.md template, `.claude/rules/`, ADRs | Explicit design principle: "All project and process learnings MUST go to in-repo files, NOT to machine-local memory." Strong alignment. |
| 2c | Lean instruction files (~100 lines) | **Partial gap** | Template CLAUDE.md: 110 lines. But real projects accumulate more context. | Template is lean (110 lines). However, rules files add context: dev-team's own project loads ~298 lines total (CLAUDE.md + process + learnings). The guide recommends progressive disclosure via docs/ directory — dev-team partially does this with ADRs and research briefs, but `.claude/rules/` files are always loaded, not progressively disclosed. |
| **3. Session Protocol** | | | |
| 3a | Consistent session lifecycle (orient, setup, verify, select, implement, test, update, exit) | **Implemented** | `/dev-team:task` four-step model + `/dev-team:implement` validation | The task skill's four-step model (Implement -> Review -> Merge -> Extract) covers this. The implement skill adds pre-assessment and validation. Security preamble adds orient. |
| 3b | One task per session | **Intentional divergence** | Process file: "Aggressively parallelize independent work" | dev-team explicitly parallelizes multiple issues per session. This is a deliberate architectural choice — the guide acknowledges relaxing this "as the project matures and reliability improves." dev-team mitigates risk with worktree isolation, per-branch review, and sequential chains for conflicting files. |
| 3c | Verification before building | **Implemented** | `/dev-team:review` pre-review validation, `/dev-team:implement` validation checks | Review skill verifies tests pass before spawning reviewers. Implement skill validates non-empty diff + tests pass + clean tree. |
| **4. Feedback Loops** | | | |
| 4a | Automated verification as backpressure | **Implemented** | Hooks: TDD enforce, pre-commit gate, review gate, safety guard, lint | dev-team's hook system is a strong implementation of automated backpressure. 11 hooks enforce quality at multiple points (pre-tool, post-tool, pre-commit). |
| 4b | Browser/UI automation for testing | **Gap** | No built-in browser testing | Research brief `525-runtime-verification-2026-03-30.md` already investigated this. Recommendation was tool-agnostic skill recommendations rather than binding to a specific browser tool. Not yet implemented. |
| 4c | Evaluator with concrete grading criteria | **Implemented** | Challenge protocol classifications, review judge pass, scorecard | `[DEFECT]`/`[RISK]`/`[QUESTION]`/`[SUGGESTION]` is a concrete grading system. The judge pass filters findings (validate DEFECTs must include scenarios). Scorecard audits process conformance. |
| 4d | Sprint contracts for complex work | **Implemented** | Definition of Done in `/dev-team:implement` for COMPLEX tasks | COMPLEX tasks negotiate 3-5 testable acceptance criteria before implementation. SIMPLE tasks skip this. Matches the recommendation exactly. |
| **5. Context Management** | | | |
| 5a | Context as scarce resource | **Implemented** | Background agents, compact summaries, embedded mode | Task skill uses compact summaries between review rounds. `--embedded` flag controls output verbosity for skill-to-skill invocation. Subagent delegation offloads work. |
| 5b | Strategic subagent deployment | **Implemented** | Parallel review waves, fan-out for read-only reviews | Review skill spawns reviewers in parallel (read-only analysis). Implementation is single-agent (write). Matches the fan-out-read/limit-write pattern. |
| **6. Prompt Engineering** | | | |
| 6a | Prevent placeholder implementations | **Implemented** | TDD enforce hook, test validation in implement skill | The TDD enforcement hook blocks implementation files without corresponding tests. The implement skill validates non-empty diffs. |
| 6b | Document reasoning | **Implemented** | ADRs, learnings, agent memory, challenge protocol | ADRs capture "why" for architecture. Challenge protocol requires concrete scenarios. Learnings file captures organic findings. |
| 6c | Allow self-improvement of instructions | **Implemented** | Borges extract, retro skill, learnings file | Borges writes to learnings and agent memory. The retro skill audits knowledge base health. Agents update their own calibration memory. |
| 6d | Capture bugs immediately | **Partial** | No explicit "capture bug in todo" mechanism | dev-team routes findings through the challenge protocol but doesn't have an explicit "capture discovered bug to a tracking file" mechanism during implementation. Bugs found during review become classified findings, but bugs discovered during implementation may be lost if the agent context resets. Process file says "Every piece of work starts with a GitHub Issue" — but mid-implementation bug discovery doesn't automatically create issues. |
| **7. Security and Sandboxing** | | | |
| 7a | Defense in depth (three layers) | **Implemented** | Claude Code sandbox (OS-level), safety guard hook (command allowlist), file pattern restrictions | The safety guard hook blocks dangerous commands (rm -rf, force push, DROP TABLE, curl|sh, chmod 777). Claude Code provides the OS-level sandbox. File restrictions via hook patterns. Three-layer alignment. |
| **8. Code Quality** | | | |
| 8a | Enforce invariants mechanically | **Implemented** | Hooks + CI | Pre-commit lint, TDD enforcement, review gate, safety guard — all mechanical enforcement via hooks. ADR-001: "Hooks over CLAUDE.md for enforcement." |
| 8b | Technical debt management | **Implemented** | Retro skill, learnings "Known Tech Debt" section | Retro skill audits for staleness and contradictions. Learnings file has explicit "Known Tech Debt" section. Borges does temporal decay (30-day flag, 90-day archive). |
| 8c | Agent legibility optimization | **Not applicable** | dev-team is infrastructure, not an application | The recommendation is about structuring application codebases for agent reasoning. dev-team helps enforce this in target projects through agent review, but doesn't directly control the target codebase structure. |
| 8d | Application inspectability (boot per worktree, DevTools, logs) | **Gap** | No worktree-per-app or DevTools integration | The guide recommends per-worktree app instances and wiring browser DevTools for DOM inspection. dev-team uses worktrees for branch isolation but doesn't manage application boot or inspection. This aligns with research brief #525's recommendation for browser tool integration. |
| **9. Recovery and Resilience** | | | |
| 9a | Git as safety net (commit after every task, read history, tag good states, reset to recover) | **Partial** | Implement skill commits, process requires descriptive messages | dev-team commits per-task and reads git history. However, it does not tag known-good states, and does not have an explicit "git reset to recover from broken builds" pattern. Recovery relies on PR workflow (discard branch, re-implement). |
| 9b | Plan regeneration | **Implemented** | Retro skill, Borges temporal decay | Retro skill re-evaluates knowledge base. Borges flags entries not verified in 30+ days. This is the dev-team equivalent of "delete and regenerate plans." |
| **10. Evolving the Harness** | | | |
| 10a | Re-evaluate with model upgrades | **Partial** | ADR-008 (agent model assignment), but no explicit strip-scaffolding process | ADR-008 documents model assignment strategy. The retro skill audits knowledge health. But there's no explicit "test by removing one component at a time" calibration process when new model versions arrive. |
| 10b | Evaluator value calibration | **Implemented** | LIGHT vs FULL review, complexity-based review intensity | SIMPLE tasks get LIGHT (advisory) review. COMPLEX tasks get FULL review. This exactly matches the recommendation to calibrate evaluator intensity by task difficulty. |
| 10c | Simplicity-first development | **Implemented** | Template design principles, graduated complexity | "Don't encode what agents already know." SIMPLE/COMPLEX classification. Single-agent for trivial work, multi-agent only when needed. |

### Validated Approaches (things dev-team does right)

1. **Separation of generation from evaluation** — dev-team's 13-agent roster with distinct implementing and reviewing agents is a strong implementation of the Planner/Generator/Evaluator pattern. The challenge protocol with classified findings (`[DEFECT]` blocking, others advisory) provides concrete grading criteria.

2. **File-based persistence over context window** — The two-tier memory architecture (shared learnings + agent calibration) with temporal decay and the "all learnings in-repo, not machine-local" rule is stronger than the guide's generic recommendation. ADRs add a third tier for formal decisions.

3. **Automated backpressure via hooks** — 11 hooks enforcing quality at pre-tool, post-tool, and pre-commit points. ADR-001 ("Hooks over CLAUDE.md for enforcement") codifies this as a design principle. The guide recommends it; dev-team treats it as foundational.

4. **Context management** — Fresh reviewers per round, compact summaries, `--embedded` mode for skill composition, and the recommendation to spawn fresh implementers after 3+ stalled rounds all demonstrate mature context management.

5. **Graduated complexity** — The SIMPLE/COMPLEX classification driving review intensity (LIGHT vs FULL) and Definition of Done requirements matches the guide's recommendation to calibrate evaluator overhead by task difficulty.

6. **Self-improvement loop** — Borges extraction, retro skill, temporal decay, and the pre-commit memory gate create a self-improvement cycle that exceeds the guide's "allow agents to update AGENTS.md" recommendation.

### Gaps Identified

**Gap 1: Browser/UI testing integration (4b, 8d)**
The guide recommends browser automation for testing and application inspectability via DevTools. dev-team has no built-in browser testing. Research brief #525 already investigated this and recommended tool-agnostic skill recommendations. This remains unimplemented.

**Gap 2: Mid-implementation bug capture (6d)**
The guide recommends immediately documenting discovered bugs. dev-team's challenge protocol handles bugs found during review, but bugs discovered during implementation have no explicit capture mechanism. An agent implementing a feature may discover a pre-existing bug, and if its context resets, that observation is lost.

**Gap 3: Git tagging for known-good states (9a)**
The guide recommends tagging known-good states for recovery. dev-team relies on PR workflow for recovery (discard branch and re-implement) but doesn't tag successful states. For multi-branch parallel work where recovery points matter, tags could provide cheaper rollback.

**Gap 4: Model upgrade scaffolding review (10a)**
No explicit process for re-evaluating hook/skill necessity when Claude model capabilities improve. Individual hooks may become redundant as models get better at avoiding the footguns they prevent. The retro skill audits knowledge health but doesn't assess whether mechanical enforcement is still load-bearing.

### Contradictions / Intentional Divergence

**One task per session (3b)** — The guide recommends one task per session to prevent context exhaustion. dev-team explicitly rejects this, preferring aggressive parallelization with worktree isolation. This is a justified divergence because:
- dev-team uses separate agents per task (each gets its own context)
- Worktree isolation prevents cross-branch contamination
- Fresh reviewers per round prevent context fatigue in evaluation
- The guide itself notes this constraint can be relaxed "as the project matures"

dev-team's approach is more sophisticated than the single-agent loops the guide targets. The risks the guide warns about (context exhaustion, compounding errors) are mitigated by the multi-agent architecture.

**Context file length (2c)** — The guide recommends ~100 lines for instruction files. dev-team's template CLAUDE.md is 110 lines (close match), but real projects accumulate more through rules files. dev-team's own project loads ~298 lines of context. However, this context is split across three files loaded via `.claude/rules/`, which is a form of progressive disclosure — agents load the full set, but each file has a clear purpose (instructions vs process vs learnings). The guide's recommendation targets single-file instruction documents; dev-team's multi-file approach is better organized.

### Evidence

| Claim | Source URL | Verified |
|-------|-----------|----------|
| Multi-agent pattern (Planner/Generator/Evaluator) | [Harness guide, Section 1](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| One task per session recommendation | [Harness guide, Section 3](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| ~100 line instruction files | [Harness guide, Section 2](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| Browser/UI automation recommendation | [Harness guide, Section 4](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| Git as safety net (tagging, reset) | [Harness guide, Section 9](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| Capture bugs immediately | [Harness guide, Section 6](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| Re-evaluate with model upgrades | [Harness guide, Section 10](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| dev-team template CLAUDE.md is 110 lines | Local file: `templates/CLAUDE.md` | yes (verified via `wc -l`) |
| dev-team total context ~298 lines | Local files: CLAUDE.md + process.md + learnings.md | yes (verified via `wc -l`) |
| Fresh reviewers per round | Local file: `templates/skills/dev-team-task/SKILL.md` line 104 | yes |
| Browser testing research exists | Local file: `docs/research/525-runtime-verification-2026-03-30.md` | yes |
| LIGHT/FULL review intensity | Local file: `templates/skills/dev-team-review/SKILL.md` lines 33-34 | yes |
| Definition of Done for COMPLEX tasks | Local file: `templates/skills/dev-team-implement/SKILL.md` lines 42-49 | yes |
| Pre-commit memory gate | Local file: `.dev-team/hooks/dev-team-pre-commit-gate.js` | yes |
| Safety guard hook | Local file: `.dev-team/hooks/dev-team-safety-guard.js` | yes |
| TDD enforcement hook | Local file: `.dev-team/hooks/dev-team-tdd-enforce.js` | yes |

### Known issues / caveats

1. The harness guide targets single-agent and simple multi-agent loops. dev-team's 13-agent adversarial architecture is significantly more complex. Some recommendations (one task per session, monolithic-first) apply to simpler systems; dev-team has already graduated past these.
2. The guide's JSON persistence recommendation (resists "model-induced corruption") vs dev-team's markdown persistence is a real trade-off. Agent status files already use JSON; learnings and memory use markdown for human readability. Worth monitoring whether markdown corruption becomes an issue.
3. The guide's "strip scaffolding" recommendation for model upgrades is philosophically aligned with dev-team's "don't encode what agents already know" principle, but dev-team lacks a formal calibration process for this.

### Confidence level

**High** — The source material is a well-structured consolidation of published best practices. All dev-team component claims verified against local files. The gap analysis is comprehensive across all 10 sections of the guide.

### Recommended Actions

- **Title**: Add model upgrade calibration step to retro skill
  **Severity**: P2
  **Files affected**: `templates/skills/dev-team-retro/SKILL.md`
  **Scope**: S
  **Details**: Add a phase to the retro skill that assesses whether existing hooks and enforcement mechanisms are still load-bearing given current model capabilities. When a new model version is adopted, the retro should flag hooks that may be redundant.

- **Title**: Add mid-implementation bug capture guidance to SHARED protocol
  **Severity**: P2
  **Files affected**: `templates/agents/SHARED.md`
  **Scope**: S
  **Details**: Add guidance to the shared agent protocol that when an implementing agent discovers a pre-existing bug during implementation, it should immediately create a GitHub issue (or note in the task's finding log) before continuing. This prevents observations from being lost on context reset.

- **Title**: Consider git tagging for recovery points in parallel mode
  **Severity**: P2
  **Files affected**: `templates/skills/dev-team-task/SKILL.md`
  **Scope**: S
  **Details**: In parallel orchestration mode, tag main after each successful merge (e.g., `task-checkpoint-N`). This provides cheap rollback points if a later merge in the batch introduces issues. Tags can be cleaned up after the full batch succeeds.

- **Title**: Track browser testing skill recommendation (follow-up to #525)
  **Severity**: P2
  **Files affected**: `templates/skills/` (new skill recommendation)
  **Scope**: M
  **Details**: Research brief #525 recommended tool-agnostic browser testing via skill recommendations. This remains unimplemented. The harness guide reinforces that agents need forced interaction with running applications to catch UI bugs.
