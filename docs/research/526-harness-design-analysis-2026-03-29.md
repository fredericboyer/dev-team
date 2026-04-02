# Research Brief: Harness Design for Long-Running Applications — Implications for dev-team

**Researcher**: Turing
**Date**: 2026-03-29
**Source**: [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (Prithvi Rajasekaran, Anthropic Engineering)

## Question

What patterns, insights, and recommendations from Anthropic's harness design article apply to dev-team's multi-agent orchestration system? Where does dev-team align, where does it diverge, and what should it adopt?

## Background

Anthropic published a detailed engineering article describing a three-agent harness (Planner, Generator, Evaluator) for autonomous long-running development tasks. The article builds on two prior Anthropic publications — [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) and [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — and references the foundational [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) guide.

dev-team is a multi-agent system with 14 agents, 10 hooks, and 8 skills that installs into projects using Claude Code. Its core loop is: Drucker (orchestrator) delegates to implementing agents, which are then reviewed by adversarial reviewer agents (Szabo, Knuth, Brooks), with Borges extracting memory at the end.

This brief analyzes every applicable pattern from the article and its linked resources, organized by: validation (what dev-team already does right), gaps (what dev-team should adopt), architecture insights, and contradictions.

---

## Part 1: Validated Patterns (dev-team already does this)

### V1. Generator-Evaluator Separation

**Article**: "When asked to evaluate work they've produced, agents tend to respond by confidently praising the work — even when, to a human observer, the quality is obviously mediocre... Tuning a standalone evaluator to be skeptical turns out to be far more tractable than making a generator critical of its own work."

**dev-team alignment**: This is the foundational principle of dev-team's adversarial review system (ADR-005). Implementing agents (Voss, Mori, Deming, Beck) never self-review. Separate reviewer agents (Szabo, Knuth, Brooks) provide independent evaluation. The article's GAN-inspired generator/evaluator split maps directly to dev-team's implementer/reviewer split.

**Assessment**: Strong validation. dev-team's architecture was independently designed around the same insight that Anthropic now documents as a core pattern. No action needed.

### V2. Orchestrator-Workers Pattern

**Article (Building Effective Agents)**: The "Orchestrator-Workers" pattern uses a "central LLM [that] dynamically breaks down unpredictable subtasks, delegates to workers, [and] synthesizes results."

**dev-team alignment**: Drucker is precisely this pattern. Drucker analyzes tasks, selects implementing and reviewing agents based on domain classification, manages the iteration loop, and synthesizes results. The `/dev-team:task` skill codifies the orchestration protocol.

**Assessment**: Strong validation. dev-team's Drucker agent is a textbook implementation of the Orchestrator-Workers pattern.

### V3. File-Based Communication Between Agents

**Article**: "Communication was handled via files: one agent would write a file, another agent would read it and respond either within that file or with a new file."

**dev-team alignment**: dev-team uses file-based communication extensively:

- `.dev-team/agent-status/<agent>.json` for progress reporting (ADR-026)
- `.dev-team/.reviews/` for review evidence (ADR-029)
- `.dev-team/metrics.md` for cross-session calibration data
- `.dev-team/agent-memory/*/MEMORY.md` for persistent agent knowledge
- Finding outcome logs passed as structured text between skills

**Assessment**: Strong validation. dev-team's file-based communication is more structured than the article's ad-hoc approach, with typed status files, structured memory formats, and defined schemas for finding logs.

### V4. Evaluator Criteria Design

**Article**: "Building an evaluator that graded outputs reliably — and with taste — meant first developing a set of criteria that could turn subjective judgments like 'is this design good?' into concrete, gradable terms." Four criteria: Design Quality, Originality, Craft, Functionality.

**dev-team alignment**: dev-team's challenge classification system (DEFECT/RISK/QUESTION/SUGGESTION) serves the same purpose — turning subjective "is this code good?" into concrete, categorized findings. The SHARED.md protocol requires concrete scenarios for every challenge, and the judge pass in `/dev-team:review` filters findings against ADRs, learnings, and agent memory.

**Assessment**: Strong validation. dev-team's classification is more operational (blocks/doesn't block) while the article's is more qualitative (scored rubrics). Both address the same core problem of making evaluation concrete and repeatable.

### V5. Structured Handoffs for Session Continuity

**Article (Long-Running Agents)**: "Finding a way for agents to quickly understand the state of work when starting with a fresh context window, which is accomplished with the `claude-progress.txt` file alongside the git history."

**dev-team alignment**: dev-team has multiple handoff mechanisms:

- Phase checkpoints in `/dev-team:task` (status lines at each step boundary)
- Agent status files written at phase boundaries
- Compact context summaries between review rounds ("produce a structured summary: all findings, files changed, outstanding items")
- Git commit history as implicit state

**Assessment**: Strong validation. dev-team's handoff mechanisms are richer than the article's single progress file, though they could be more formalized (see Gap G3).

### V6. Parallelization of Independent Work

**Article (Building Effective Agents)**: Parallelization via "sectioning" (independent subtasks) and "voting" (multiple perspectives).

**dev-team alignment**: dev-team's parallel mode in `/dev-team:task` sections independent issues across branches. The review skill spawns multiple reviewer agents in parallel (a form of voting — multiple perspectives on the same code). The process file mandates "aggressively parallelize independent work."

**Assessment**: Strong validation. dev-team implements both sectioning (parallel implementation branches) and voting (parallel review agents).

---

## Part 2: Gaps (dev-team should adopt)

### G1. Sprint Contracts — Negotiated Success Criteria Before Implementation

**Article**: "The generator and evaluator negotiated a sprint contract: agreeing on what 'done' looked like for that chunk of work before any code was written... Sprint 3 alone had 27 criteria."

**dev-team gap**: dev-team's task skill jumps from issue description directly to implementation. There is no negotiation step where the implementing agent and the reviewers agree on acceptance criteria before code is written. Reviewers discover the intent only when reviewing the diff.

**Impact**: Without pre-negotiated criteria, reviewers must infer intent from the code itself. This can lead to findings that are technically valid but miss the actual goal, or — worse — the implementer produces code that passes review but doesn't match what the human intended.

**Recommendation**: Add an optional "Definition of Done" step between Brooks pre-assessment and implementation in the task skill. The implementing agent proposes acceptance criteria derived from the issue; the orchestrator confirms before coding begins. For complex tasks (ADR-needed, multi-file), this could include testable criteria that the review step validates against. For simple tasks (bug fixes, config), skip this step.

### G2. Evaluator Calibration via Few-Shot Examples

**Article**: "I calibrated the evaluator using few-shot examples with detailed score breakdowns. This ensured the evaluator's judgment aligned with my preferences, and reduced score drift across iterations."

**dev-team gap**: dev-team's reviewer agents are calibrated through agent definitions (prose instructions) and agent memory (observed patterns). There are no few-shot examples showing "here is a finding that was correct" and "here is a finding that was noise." The closest mechanism is agent memory entries recording overrules, but these are unstructured text, not scored calibration examples.

**Impact**: Without concrete examples of good vs. bad findings, reviewer agents may drift over time. The 0% overrule rate (see research brief #490) makes it impossible to distinguish well-calibrated from rubber-stamped reviews. Few-shot calibration examples would make reviewer behavior more predictable and debuggable.

**Recommendation**: Create a calibration examples file for each reviewer agent (e.g., `.dev-team/agent-memory/dev-team-szabo/calibration-examples.md`) with 3-5 annotated examples: findings that were accepted (with why), findings that were overruled (with why), and findings that were correctly filtered by the judge pass. Reference this file in the agent definition. Borges could maintain these from the finding outcome log over time.

### G3. Explicit Context Reset Strategy

**Article**: "Compaction doesn't give the agent a clean slate, which means context anxiety can still persist. A reset provides a clean slate, at the cost of the handoff artifact having enough state for the next agent to pick up the work cleanly." The article documents that Sonnet 4.5 required context resets, Opus 4.5 largely removed the need, and Opus 4.6 eliminated it entirely.

**dev-team gap**: dev-team's task skill compacts context between review rounds ("produce a structured summary") but does not have an explicit strategy for when to reset vs. compact. The review skill spawns fresh reviewers each round (implicit reset), but the implementing agent carries growing context across iterations. There is no documented decision about which approach to use and when.

**Impact**: As tasks grow longer (multiple review rounds, complex implementations), implementing agents may experience the context anxiety the article describes — rushing to finish or dropping quality as context fills. The current approach works because most tasks resolve in 1-2 review rounds, but complex tasks could hit this ceiling.

**Recommendation**: Document a context management strategy in the task skill:

- **Reviewers**: Already use implicit reset (fresh spawn each round) — document this as intentional.
- **Implementing agents**: After 3+ review rounds, consider spawning a fresh implementing agent with a compact handoff (current findings, remaining defects, relevant code context) rather than continuing with a growing context.
- **Orchestrator**: The orchestrator (Drucker or main loop) accumulates context across the entire task. For parallel mode with 5+ branches, consider explicit context compaction between branch completions.

### G4. Browser/Runtime Verification of Outputs

**Article**: "Providing Claude with these kinds of testing tools dramatically improved performance, as the agent was able to identify and fix bugs that weren't obvious from the code alone." The evaluator uses Playwright MCP to interact with running applications, testing UI features and database states.

**dev-team gap**: dev-team's review agents review code statically — they read diffs and source files. They do not execute the code, run the application, or verify behavior at runtime. The closest mechanism is the Step 1 validation ("Tests pass: test command executed with exit code 0"), but this is the implementer self-testing, not the reviewer verifying.

**Impact**: For projects where dev-team is installed (web apps, APIs, CLI tools), static review misses entire categories of bugs: integration failures, UI rendering issues, race conditions, and state management problems. The article demonstrates that runtime verification via Playwright catches "feature gaps: missing audio recording, clip manipulation, effect visualizations" that code review alone would miss.

**Recommendation**: This is a larger architectural shift and should be evaluated as a potential v2.x feature. The pattern would be:

- Reviewer agents that can optionally invoke runtime verification tools (Playwright MCP, API testing)
- A new hook or skill step that spins up the application before review
- Criteria for when runtime review is warranted (UI changes, API changes) vs. overkill (documentation, config)
  This aligns with the existing template design principle of "platform-neutral" — the capability would be optional and project-configurable.

### G5. Penalty Language for Known Anti-Patterns

**Article**: "The criteria explicitly penalized highly generic 'AI slop' patterns." The frontend design skill includes explicit negative examples: "NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds)..."

**dev-team gap**: dev-team's agent definitions describe what agents should do, but rarely describe what they should NOT do with equal specificity. The "silence is golden" rule in SHARED.md is one exception. There are no explicit anti-pattern lists for common failure modes (e.g., "do NOT flag standard library usage as a dependency risk," "do NOT suggest extracting utility functions that are used only once").

**Impact**: Without explicit penalty language, agents fall back on generic patterns. Reviewer agents may generate noise findings that match known false-positive categories. The article demonstrates that negative examples ("don't do X") steer behavior as effectively as positive instructions ("do Y").

**Recommendation**: Add a "Known False Positives" section to each reviewer agent's definition or memory file. Populate from the finding outcome log — every finding with outcome `overruled` or `ignored` becomes a candidate anti-pattern. Borges already tracks overrules; this extends the pattern to proactive steering. Start with Szabo (security false positives are well-documented), Knuth (style vs. substance), and Brooks (over-engineering suggestions).

### G6. Harness Assumption Testing as Models Improve

**Article**: "Every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing." The article shows that Opus 4.6 made sprint decomposition unnecessary — a capability the harness previously compensated for.

**dev-team gap**: dev-team's architecture (14 agents, 10 hooks, 8 skills) encodes many assumptions about model limitations:

- That models can't self-review reliably (V1 above — still valid per article)
- That models need structured classification systems (DEFECT/RISK/etc.) to produce consistent output
- That models need separate orchestrators to manage multi-step workflows
- That models need file-based state because they can't maintain context across sessions
- That review agents need to be spawned fresh each round

Some of these assumptions may become stale as models improve. The article explicitly warns that "those assumptions become stale quickly and require regular re-examination."

**Recommendation**: Add a periodic "harness assumption audit" to the `/dev-team:retro` skill. Each retro should ask: "Which dev-team components compensate for model limitations? Are those limitations still present?" This should be a lightweight check, not a full redesign — just flagging components that might be over-engineering given current model capabilities. Track assumptions in a dedicated file (e.g., `docs/design/harness-assumptions.md`) with last-validated dates.

---

## Part 3: Architecture Insights

### A1. The Evaluator-Optimizer Pattern Is dev-team's Core Loop

**Article (Building Effective Agents)**: The "Evaluator-Optimizer" pattern: "Generator LLM produces responses; evaluator LLM provides iterative feedback. Works best with clear evaluation criteria and demonstrable improvement through refinement."

dev-team's task skill is a direct implementation of this pattern:

- Step 1 (Implement) = Generator
- Step 2 (Review) = Evaluator
- Iteration within Step 2 = the optimization loop
- DEFECT findings = concrete feedback that drives refinement
- Convergence (zero DEFECTs) = the stopping condition

The article's key finding — that this pattern "works best with clear evaluation criteria" — reinforces the importance of dev-team's classification system. The criteria ARE the challenge classifications. The stopping condition IS zero DEFECTs.

### A2. Planner-Generator-Evaluator Maps to Brooks-Implementer-Reviewers

The article's three-agent architecture maps cleanly to dev-team's task skill:

| Article Role | dev-team Role                              | Function                                                                        |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------------- |
| Planner      | Brooks (pre-assessment)                    | Analyzes requirements, identifies architectural needs, produces high-level plan |
| Generator    | Implementing agent (Voss/Mori/Deming/Beck) | Produces code implementation                                                    |
| Evaluator    | Review agents (Szabo/Knuth/Brooks)         | Tests output against criteria, files findings                                   |

The main structural difference: the article uses a single Evaluator; dev-team uses multiple parallel evaluators with different specializations (security, quality, architecture). dev-team's approach is richer — it provides multi-perspective evaluation that a single evaluator cannot match.

### A3. The Ralph Wiggum Method as an Alternative Paradigm

The article references the [Ralph Wiggum method](https://ghuntley.com/ralph/) — a bash loop that repeatedly feeds prompts to a coding agent:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

Key characteristics:

- Single-task-per-loop: each iteration does one thing
- Self-improvement: the agent updates its own docs during execution
- Back pressure via testing: validation occurs through tests, not reviewers
- Subagent parallelization for expensive operations (testing, analysis)
- Context management by spawning subagents for heavy work, preserving main agent context

**Comparison with dev-team**: Ralph is a fundamentally different philosophy. Where dev-team uses specialized agents with defined roles, Ralph uses a single general-purpose agent in a tight loop. Where dev-team uses adversarial review (external evaluation), Ralph uses back pressure from tests (self-evaluation via tooling).

Ralph's strengths that dev-team lacks:

- **Faster iteration cycle**: Ralph's loop takes minutes per iteration; dev-team's task loop can take 30+ minutes per review round due to multi-agent spawning overhead
- **Self-updating documentation**: Ralph updates its own learning files during execution; dev-team defers this to Borges at the end
- **Simplicity**: One agent, one loop, one prompt file

dev-team's strengths that Ralph lacks:

- **Multi-perspective evaluation**: Ralph has no adversarial review; dev-team has specialized reviewers
- **Persistent structured memory**: Ralph's learning files are unstructured; dev-team has typed memory with temporal decay
- **Orchestration intelligence**: dev-team routes tasks to domain specialists; Ralph uses one generalist

**Insight**: Ralph's tight-loop-with-back-pressure pattern could inform a "lightweight mode" for dev-team — simple tasks (bug fixes, config tweaks) might benefit from a faster loop with test-based validation rather than full multi-agent review. See Gap G1 recommendation about skipping the contract step for simple tasks.

### A4. Context Engineering Principles Confirm dev-team's Rules Architecture

**Article (Context Engineering)**: "Context must be treated as a finite resource." Recommendations include:

- Just-in-time context retrieval (load data on demand, not upfront)
- Progressive disclosure (agents discover context through exploration)
- Structured note-taking for persistent memory outside the context window
- Sub-agent architectures for clean context separation

dev-team's architecture aligns well:

- `.claude/rules/` files are loaded automatically (pre-loaded shared context)
- Agent definitions are read on demand when spawning (just-in-time)
- Agent memory files persist knowledge outside any single context window (structured notes)
- Fresh reviewer spawning per round provides clean context (sub-agent reset)

One tension: dev-team loads a significant amount of context upfront via rules (learnings, process, CLAUDE.md). The context engineering article warns about the "attention budget" — n-squared attention cost means longer contexts reduce precision. dev-team should monitor whether the combined size of rules files is approaching a point where it degrades agent performance.

---

## Part 4: Contradictions and Tensions

### C1. Planner Specificity — High-Level vs. Detailed

**Article**: "The planner was intentionally high-level to avoid cascading implementation errors" from over-specification early in development.

**dev-team tension**: Brooks' pre-assessment is already high-level (assesses whether an ADR is needed, not how to implement). However, the Gap G1 recommendation for sprint contracts / "Definition of Done" could create the over-specification risk the article warns about. If acceptance criteria are too detailed, they constrain the implementing agent and create cascading errors when early assumptions prove wrong.

**Resolution**: Sprint contracts should specify WHAT (observable outcomes) not HOW (implementation approach). Example: "API endpoint returns 200 with valid payload" not "implement using Express middleware with Joi validation." dev-team's existing principle of letting agents apply their built-in knowledge (ADR-034) already guards against over-specification.

### C2. Model Improvement Reduces Harness Complexity

**Article**: "Opus 4.6 provided further motivation to reduce harness complexity... I was able to drop context resets from this harness entirely." And: "As models improve, the boundary of what they can handle solo shifts."

**dev-team tension**: dev-team's complexity has been INCREASING over releases (from 6 agents in v1.0 to 14 in v1.8, from 4 hooks to 10, from 3 skills to 8). The article's thesis is that better models should lead to simpler harnesses, not more complex ones. This is the most significant tension in the analysis.

**Resolution**: The contradiction is more nuanced than it appears. The article's harness solves a single problem (build a frontend app). dev-team solves a meta-problem (install quality infrastructure into any project). dev-team's complexity growth reflects expanding scope (more agent types, more hook triggers, more skill compositions), not compensating for model limitations. However, the article's warning stands: each component should be regularly tested against "can the model do this without the component?" If the answer is yes, the component is overhead.

### C3. Cost-Benefit of Multi-Agent Review

**Article**: "Evaluator ROI varies: External evaluation adds value proportionally to task complexity. For tasks within a model's reliable range, evaluator overhead becomes unnecessary."

**dev-team tension**: dev-team runs the full adversarial review loop for every task, regardless of complexity. A typo fix gets the same Szabo/Knuth/Brooks review wave as a new architectural feature. The article explicitly states that for simple tasks, evaluator overhead is unnecessary.

**Resolution**: dev-team's review skill already has a "LIGHT" review concept (advisory only, referenced in ADR-029). This should be formalized: simple tasks (single-file changes, documentation, config) get LIGHT review (advisory, no DEFECT blocking), while complex tasks (multi-file, new patterns, architecture changes) get FULL review. Brooks' pre-assessment already classifies task complexity — this classification should drive review intensity.

---

## Part 5: Insights from Linked Resources

### L1. Feature Manifest Pattern (Long-Running Agents Article)

**Pattern**: A JSON file listing 200+ features with pass/fail status prevents agents from declaring work "done" prematurely.

**Application**: dev-team could use a similar pattern for complex tasks — a structured checklist derived from the issue description that the implementing agent must complete before declaring Step 1 done. Currently, Step 1 validation checks for "non-empty diff" and "tests pass" but not "all requirements addressed."

### L2. Init Script for Reproducible Environment (Long-Running Agents Article)

**Pattern**: An `init.sh` script bootstraps the development environment reproducibly for each session.

**Application**: dev-team's task skill assumes the environment is already set up. For long-running tasks or tasks that span multiple sessions, a project-specific init script (or equivalent hook) that verifies the development environment is ready before implementation begins would prevent wasted cycles on broken environments.

### L3. Tool Design as Prompt Engineering (Building Effective Agents)

**Pattern**: "Apply 'poka-yoke' principles: design parameters making errors harder to commit." Tool prompt engineering requires equal rigor as overall prompts.

**Application**: dev-team's hooks are tools in this sense — they accept inputs (changed files, commit contents) and produce outputs (spawn directives, block/allow decisions). Applying poka-yoke principles to hook design means: hooks should make it hard for agents to produce incorrect outputs. The review gate hook (ADR-029) already embodies this — it blocks commits without review evidence, making it structurally impossible to skip review.

### L4. Workflows vs. Agents Distinction (Building Effective Agents)

**Pattern**: Anthropic distinguishes "workflows" (predefined code paths) from "agents" (dynamic self-directed processes). Recommendation: "Start with simple prompts, optimize with comprehensive evaluation, and add multi-step agentic systems only when simpler solutions fall short."

**Application**: dev-team's skills are workflows (predefined steps). dev-team's agents are agents (dynamic within their domain). The task skill is a hybrid — it's a workflow that orchestrates agents. This hybrid approach is valid per Anthropic's guidance, but the distinction matters for new skill design: new skills should default to workflow patterns (defined steps) and only use agent patterns (dynamic delegation) when the step sequence genuinely can't be predetermined.

### L5. Simplicity First (Building Effective Agents and Context Engineering)

**Pattern**: Both articles emphasize starting simple: "Do the simplest thing that works" and adding complexity only when demonstrably improving outcomes.

**Application**: This reinforces C2 above. dev-team should periodically ask: "Is this component still earning its complexity?" The retro skill is the natural place for this assessment, but it currently focuses on memory health, not architectural health.

---

## Evidence

### Primary Source

- [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Prithvi Rajasekaran, Anthropic Engineering, 2026

### Linked Resources (Anthropic)

- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic Engineering
- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Anthropic Engineering
- [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) — Anthropic Research

### Linked Resources (External)

- [The Ralph Wiggum Method](https://ghuntley.com/ralph/) — Geoffrey Huntley
- [Frontend Design Skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) — Anthropic, Claude Code plugins
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) — Anthropic Platform

### dev-team Internal References

- ADR-005: Adversarial Agents
- ADR-019: Parallel Review Waves
- ADR-026: Agent Progress Reporting
- ADR-029: Stateless Commit Gates
- ADR-034: Delegate Language Knowledge
- Research Brief #490: Adversarial Review Health

---

## Known Issues / Caveats

1. **Article describes frontend/fullstack focus.** The three-agent architecture was built for generating web applications from scratch. dev-team operates on existing codebases across all domains. Some patterns (Playwright verification, sprint contracts with 27 criteria) apply more to greenfield work than to incremental changes on established projects.

2. **Cost asymmetry.** The article reports $124-$200 per task run. dev-team's task loop is cheaper per run (agents run shorter, more focused tasks) but the overhead of spawning multiple review agents adds latency. The cost-benefit trade-off is different: dev-team trades cost for multi-perspective coverage.

3. **Single author's experience.** The article is authored by one engineer at Anthropic Labs. The patterns are validated on a small number of projects (a retro game maker and a DAW). dev-team's patterns are validated on dev-team itself (dogfooding) plus user installations. Both have limited external validation.

4. **Model-specific findings may not generalize.** The article's context management findings are tied to specific model versions (Sonnet 4.5, Opus 4.5, Opus 4.6). dev-team supports model configuration per agent (ADR-008). Context management strategies should be parameterized by model capability, not hardcoded.

---

## Confidence Level

**High** for validation findings (V1-V6). The article confirms dev-team's core architectural decisions with independent evidence from Anthropic's own engineering practice.

**Medium** for gap recommendations (G1-G6). The gaps are real, but the applicability to dev-team's specific context (multi-project CLI tool vs. single-project harness) requires careful adaptation.

**Medium** for contradiction analysis (C1-C3). The tensions are genuine but resolvable — they point to refinement opportunities, not fundamental flaws.

---

## Recommended Actions

- **Title**: Add review intensity tiers (LIGHT/FULL) based on task complexity
  **Severity**: P1
  **Files affected**: `.dev-team/skills/dev-team-task/SKILL.md`, `.dev-team/skills/dev-team-review/SKILL.md`
  **Scope**: M
  **Description**: Formalize the LIGHT review concept already referenced in ADR-029. Brooks' pre-assessment should output a complexity classification (simple/complex). Simple tasks (single-file, documentation, config, bug fixes) get LIGHT review (advisory only, single reviewer). Complex tasks (multi-file, new patterns, ADR-needed) get FULL review (blocking DEFECTs, all three always-on reviewers). This addresses Contradiction C3 and aligns with the article's finding that "evaluator ROI varies proportionally to task complexity."

- **Title**: Add "known false positives" anti-pattern sections to reviewer agent definitions
  **Severity**: P1
  **Files affected**: `.dev-team/agents/dev-team-szabo.md`, `.dev-team/agents/dev-team-knuth.md`, `.dev-team/agents/dev-team-brooks.md`
  **Scope**: S
  **Description**: Add explicit penalty language for known noise patterns, following the article's demonstrated effectiveness of negative examples. Populate from the finding outcome log — overruled and ignored findings become anti-pattern entries. Borges should maintain these as part of memory evolution. Addresses Gap G5.

- **Title**: Add periodic harness assumption audit to retro skill
  **Severity**: P2
  **Files affected**: `.dev-team/skills/dev-team-retro/SKILL.md`, `docs/design/harness-assumptions.md` (new)
  **Scope**: M
  **Description**: Each retro should include a lightweight check: "Which dev-team components compensate for model limitations that may no longer exist?" Track assumptions in a dedicated file with last-validated dates. The article's core insight — "every component encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing" — should become a recurring audit item. Addresses Gap G6 and Contradiction C2.

- **Title**: Create evaluator calibration examples for reviewer agents
  **Severity**: P2
  **Files affected**: `.dev-team/agent-memory/dev-team-szabo/calibration-examples.md` (new), `.dev-team/agent-memory/dev-team-knuth/calibration-examples.md` (new), `.dev-team/agent-memory/dev-team-brooks/calibration-examples.md` (new)
  **Scope**: M
  **Description**: Create few-shot calibration files with 3-5 annotated examples per reviewer: findings that were correctly accepted, findings that were overruled (with reasoning), and findings correctly filtered by the judge pass. Reference in agent definitions. Borges should maintain these from the finding outcome log over time. Addresses Gap G2.

- **Title**: Add optional "Definition of Done" negotiation step to task skill
  **Severity**: P2
  **Files affected**: `.dev-team/skills/dev-team-task/SKILL.md`
  **Scope**: S
  **Description**: Between Brooks pre-assessment and implementation, the implementing agent proposes 3-5 testable acceptance criteria derived from the issue. Orchestrator confirms. Skip for simple tasks (bug fixes, config). Criteria specify WHAT (observable outcomes) not HOW (implementation approach). Addresses Gap G1 while respecting Contradiction C1.

- **Title**: Document context management strategy for long task loops
  **Severity**: P3
  **Files affected**: `.dev-team/skills/dev-team-task/SKILL.md`
  **Scope**: S
  **Description**: Document the existing implicit strategy (fresh reviewers = context reset, compact summaries between rounds) and add a guideline: after 3+ review rounds, consider spawning a fresh implementing agent with a compact handoff. This prevents context anxiety in long-running tasks. Addresses Gap G3.

- **Title**: Evaluate runtime verification capability for reviewer agents (research)
  **Severity**: P3
  **Files affected**: N/A (research task)
  **Scope**: L
  **Description**: Investigate adding optional Playwright/runtime verification to the review step for projects that support it. This is a v2.x feature exploration. The article demonstrates significant value from runtime testing ("caught feature gaps that weren't obvious from the code alone"). Scope: research brief on feasibility, architecture options, and configuration approach. Addresses Gap G4.
