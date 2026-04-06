# Research Brief: Evaluate /batch Skill as Complement to Parallel Task Mode

**Issue:** #690
**Date:** 2026-04-03
**Researcher:** Turing
**Prior art:** Research brief #662 (Platform Capabilities, 2026-04-02) identified `/batch` overlap and recommended this evaluation.

---

## Question

Claude Code ships a built-in `/batch` skill that orchestrates parallel codebase changes via worktrees. `dev-team-task` parallel mode does similar orchestration but adds adversarial review gates. Should dev-team integrate `/batch`, replace parts of its parallel mode with it, or treat it as an independent tool for simpler use cases?

---

## 1. /batch Capabilities

### What /batch does

Per official documentation (https://code.claude.com/docs/en/skills#bundled-skills):

> Orchestrate large-scale changes across a codebase in parallel. Researches the codebase, decomposes the work into 5 to 30 independent units, and presents a plan. Once approved, spawns one background agent per unit in an isolated git worktree. Each agent implements its unit, runs tests, and opens a pull request. Requires a git repository.

### Step-by-step workflow

1. **Research phase** -- `/batch` reads the codebase to understand the scope of the requested change
2. **Decomposition** -- breaks the work into 5-30 independent units
3. **Plan presentation** -- shows the plan for human approval before proceeding
4. **Parallel execution** -- spawns one background agent per unit, each in its own git worktree
5. **Per-unit validation** -- each agent implements its unit and runs tests
6. **PR creation** -- each agent opens a pull request for its unit

### Key properties

| Property | Value |
|----------|-------|
| Decomposition range | 5-30 independent units |
| Isolation method | Git worktrees (one per agent) |
| Output | One PR per unit |
| Human checkpoint | Plan approval before execution |
| Review | None built-in |
| Customization | None -- no hooks, no injection points |
| Invocation | `/batch <instruction>` (bundled skill, always available) |

---

## 2. dev-team-task Parallel Mode Capabilities

### What it does

The task skill orchestrates a four-step pipeline per branch: Implement, Review, Merge, Extract. In parallel mode (multiple issues), Drucker coordinates all steps.

### Step-by-step workflow

1. **Phase 0: Brooks pre-assessment** -- identifies file conflicts, ADR needs, complexity per issue (SIMPLE/COMPLEX)
2. **Step 1: Parallel implementation** -- one agent per independent issue, each on its own branch via agent teams or worktree subagents
3. **Step 2: Adversarial review** -- per-branch review the moment implementation finishes (LIGHT for SIMPLE, FULL for COMPLEX)
4. **Step 3: Merge** -- per-branch merge via `dev-team-merge` as each branch clears review
5. **Step 4: Extract** -- Borges memory extraction across all branches

### Key properties

| Property | Value |
|----------|-------|
| Decomposition | Issue-driven (human provides issues), Brooks assesses complexity and file conflicts |
| Isolation method | Agent teams (preferred) or worktree subagents |
| Output | One PR per issue, merged sequentially |
| Human checkpoints | Issue creation, plan approval (optional), dispute escalation |
| Review | Adversarial multi-agent review with classified findings |
| Customization | Fully configurable agents, hooks, review tiers, finding vocabulary |
| Invocation | `dev-team-task` (project skill, requires dev-team installation) |

---

## 3. Comparison Matrix

| Dimension | `/batch` | `dev-team-task` parallel |
|-----------|----------|--------------------------|
| **Decomposition** | AI-driven (5-30 units from a single instruction) | Human-driven (one branch per GitHub issue) |
| **Granularity** | Fine-grained (e.g., "migrate each file") | Coarse-grained (e.g., "implement feature X") |
| **Review** | None | Adversarial multi-agent, classified findings |
| **Quality gates** | Tests pass | Tests pass + review evidence + finding resolution |
| **Memory/learning** | None | Borges extraction, metrics, learnings |
| **Conflict detection** | Assumes units are independent | Brooks pre-assessment identifies file conflicts |
| **Sequential chains** | Not supported | Supported (sequential gate for dependent issues) |
| **Merge strategy** | Leaves PRs open for human merge | Automated merge via `dev-team-merge` |
| **Setup cost** | Zero (built-in) | Requires dev-team installation |
| **Customization** | None | Full (agents, hooks, skills, rules) |

---

## 4. Use Cases Where /batch Is Sufficient

`/batch` is well-suited for **mechanical, repetitive transformations** where:

1. **No adversarial review is needed** -- the change is deterministic or trivially verifiable
2. **Units are truly independent** -- no shared state, no file conflicts
3. **The instruction is uniform** -- same transformation applied N times across the codebase
4. **Quality is enforced by existing CI** -- test suites and linters catch regressions

**Concrete examples:**
- Migrate imports from one module to another across 20 files
- Add TypeScript strict-null checks to each package in a monorepo
- Rename a deprecated API call across the codebase
- Add license headers to all source files
- Convert callback-style code to async/await in each module

**Anti-patterns for /batch** (use `dev-team-task` instead):
- Feature implementation requiring design decisions
- Changes that need architectural review
- Security-sensitive modifications
- Changes where units interact or share state
- Work that requires memory extraction or process metrics

---

## 5. Can dev-team-task Delegate to /batch?

### The delegation idea

`dev-team-task` could use `/batch` for Step 1 (implementation) while retaining Steps 2-4 (review, merge, extract). This would leverage `/batch`'s native worktree isolation and decomposition while preserving dev-team's adversarial review loop.

### Analysis

**Arguments for delegation:**

1. `/batch` handles worktree creation, cleanup, and per-unit PR creation natively -- dev-team reimplements this
2. `/batch`'s 5-30 unit decomposition could complement Brooks' pre-assessment for fine-grained work
3. Reduces dev-team's maintenance burden for parallel execution mechanics

**Arguments against delegation:**

1. **No injection points.** `/batch` is not customizable (confirmed in #662 research, caveat 3). dev-team cannot inject agent selection, review gates, or finding classification into `/batch`'s workflow. It always creates PRs using its own decomposition logic.

2. **Decomposition mismatch.** `/batch` decomposes a single instruction into 5-30 units. dev-team decomposes by GitHub issue. These are fundamentally different scoping models. A batch unit is a file-level transformation; a dev-team issue is a feature-level deliverable.

3. **Agent identity loss.** `/batch` spawns generic agents. dev-team routes to specialized agents (Voss for negotiation, Deming for process, Hamilton for implementation) based on the task. This routing is central to the adversarial model.

4. **Review topology mismatch.** `/batch` produces N PRs with no review. dev-team reviews each branch the moment implementation finishes. Grafting review onto `/batch` output would require: waiting for all units to complete, then reviewing each PR independently, then merging. This is the batch-all-then-review-all antipattern that dev-team explicitly avoids (see learnings: "Start reviews/merges immediately as each PR lands").

5. **Memory gap.** `/batch` has no concept of memory extraction, metrics, or learnings. These would need to run after `/batch` completes, breaking the integrated four-step model.

### Verdict

**Do not delegate to `/batch`.** The integration cost exceeds the benefit. `/batch`'s lack of customization makes it impossible to inject dev-team's core value propositions (adversarial review, agent specialization, memory extraction) into the workflow.

---

## 6. Recommendation: Complementary Tools, Not Integration

`/batch` and `dev-team-task` serve different purposes and should coexist as independent tools:

| Scenario | Recommended tool |
|----------|-----------------|
| Mechanical transformation across many files | `/batch` |
| Feature implementation with quality gates | `dev-team-task` |
| Migration with architectural review needed | `dev-team-task` |
| Bulk refactoring with CI as quality gate | `/batch` |
| Multi-issue sprint with adversarial review | `dev-team-task` parallel mode |
| One-off codebase-wide find-and-replace | `/batch` |

### Actionable guidance for dev-team users

Add guidance to the CLAUDE.md template or rules explaining when to use which:

> **Parallel execution:** Use `/batch` for mechanical, repetitive transformations (migrations, renames, bulk refactoring) where CI alone provides sufficient quality assurance. Use `dev-team-task` for feature work, security-sensitive changes, or any work requiring adversarial review and memory extraction.

### No code changes needed

This evaluation confirms that `/batch` is a complement, not a replacement or integration target. No changes to `templates/skills/dev-team-task/SKILL.md` are needed. The only recommended action is documentation guidance.

---

## Evidence

| Claim | Source URL | Verified |
|-------|-----------|----------|
| `/batch` decomposes into 5-30 independent units with worktree isolation | https://code.claude.com/docs/en/skills#bundled-skills | yes |
| `/batch` spawns one background agent per unit, each opens a PR | https://code.claude.com/docs/en/skills#bundled-skills | yes |
| `/batch` requires a git repository | https://code.claude.com/docs/en/skills#bundled-skills | yes |
| `/batch` presents a plan for approval before execution | https://code.claude.com/docs/en/skills#bundled-skills | yes |
| `/batch` is not customizable (no hooks, no injection points) | Confirmed by #662 caveat 3 + skills docs (no `hooks` or extensibility for bundled skills) | yes |
| Worktrees provide isolated working directories sharing repo history | https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees | yes |
| dev-team task skill orchestrates four steps: implement, review, merge, extract | templates/skills/dev-team-task/SKILL.md | yes |
| Brooks pre-assessment identifies file conflicts and complexity | templates/skills/dev-team-task/SKILL.md lines 146-151 | yes |
| "Start reviews/merges immediately" is a validated learning | .claude/rules/dev-team-learnings.md | yes |

---

## Confidence Level

**High.** All claims about `/batch` verified against official Claude Code documentation. All claims about `dev-team-task` verified against the skill definition. The recommendation is conservative (no integration) which carries low risk.

---

## Recommended Actions

- **Documentation only.** Add guidance to `templates/CLAUDE.md` or `.claude/rules/` explaining when to use `/batch` vs `dev-team-task`. This could be a one-liner in the Skills section of the CLAUDE.md template.
  - **Severity:** P3 (nice-to-have)
  - **Files affected:** `templates/CLAUDE.md` or project rules
  - **Scope:** S (documentation only)
