# Research Synthesis: Shaping dev-team's Future

> Compiled March 2026 from 20+ papers, industry reports, and production case studies across three domains: agent memory, multi-agent orchestration, and adversarial code review.

## Executive Summary

Dev-team's core architecture is well-validated by current research. The specialized reviewer decomposition (Szabo/Knuth/Brooks), one-exchange escalation limit, and hierarchical orchestration via Drucker all align with findings from NeurIPS 2025, ICLR 2025, and production systems at HubSpot and Microsoft. Three areas need significant improvement: **agent memory** (completely non-functional), **review signal quality** (high false positive rate without filtering), and **orchestration resilience** (context exhaustion in multi-round workflows).

---

## 1. Agent Memory

### The Problem

All 12 agent memory files are empty despite enforcement mechanisms. Research identifies this as a known failure mode: passive memory systems that rely on agents voluntarily writing don't get written to.

### Key Research Findings

| Source | Key Finding |
|--------|------------|
| [Memory in the Age of AI Agents](https://arxiv.org/abs/2512.13564) (Survey, Dec 2025) | Three memory forms: token-level (files), parametric (weights), latent (hidden states). Token-level dominates agent systems. Three functions: factual, experiential, working. Experiential memory (lessons from past actions) is the most relevant for calibration. |
| [A-MEM](https://arxiv.org/abs/2502.12110) (NeurIPS 2025) | Zettelkasten-inspired structured notes with 7 fields. Memory evolution: new entries trigger re-evaluation of existing ones. 85-93% token reduction vs. baselines. |
| [Memori](https://arxiv.org/html/2603.19935) (Mar 2026) | Semantic triples (subject-predicate-object) for atomic facts. 81.95% on LoCoMo with only 1,294 tokens per query. Outperforms Zep, LangMem, Mem0. |
| [Memory for Autonomous LLM Agents](https://arxiv.org/html/2603.07670) (Survey, Mar 2026) | Four-layer model: working, episodic, semantic, procedural. Write-path needs filtering, deduplication, priority scoring. "Start simple, instrument, graduate to learned control only when data justifies it." |
| [G-Memory](https://arxiv.org/abs/2506.07398) (Jun 2025) | Three-tier multi-agent hierarchy: insight graphs, query graphs, interaction graphs. Up to 20.89% improvement on action tasks. |
| [RCR-Router](https://arxiv.org/abs/2508.04903) (Aug 2025) | Role-aware context routing: dynamically selects memory subsets per agent based on role. 30% token reduction while maintaining quality. |
| [LEGOMem](https://arxiv.org/abs/2510.04851) (Oct 2025) | Decomposes trajectories into reusable memory units across orchestrator-level and agent-level. Even small models benefit substantially from procedural memory. |

### What Doesn't Work

- **Summarization drift**: Repeated compression destroys edge-case knowledge — the specific details that make calibration valuable.
- **Self-reinforcing errors**: False reflections entrench without contradictory evidence.
- **Long context is not memory**: 200K token windows consistently underperform purpose-built memory systems.
- **Fully shared memory**: Causes information leakage and attention dilution in multi-agent systems.
- **Advisory/optional writes**: Every "should write" instruction in dev-team has produced zero writes. The pattern is well-documented in the literature.

### Recommendations for dev-team

**R1: Automate memory formation (P0).** Memory extraction should be a side effect of agent output, not an optional action. After every review that produces classified findings, Borges should automatically extract structured entries. The current design where Borges "audits and directs but does not write" is architecturally wrong — a librarian that only audits empty shelves produces empty shelves forever.

**R2: Adopt structured entries over free text (P0).** Replace empty MEMORY.md templates with structured, queryable entries:

```markdown
### [2026-03-24] Finding summary
- **Type**: DEFECT | RISK | SUGGESTION | OVERRULED
- **Source**: PR #NNN
- **Tags**: auth, sql, boundary-condition
- **Outcome**: accepted | overruled | deferred
- **Context**: One-sentence explanation
```

Human-readable markdown, parseable for automated processing. Tags enable similarity matching.

**R3: Two-tier memory structure (P1).** Separate shared team memory (learnings.md — project facts, overruled challenges, cross-agent decisions) from agent calibration (MEMORY.md — domain-specific findings, known patterns, active watch lists). Orchestrator memory contains *what to delegate and why*; agent memory contains *how to execute their specialty in this codebase*.

**R4: Implement memory evolution (P1).** New entries should trigger re-evaluation of existing ones. When 3+ findings on the same tag are overruled, promote to a calibration rule: "Reduce severity for [tag] findings in this project." When an accepted finding contradicts an existing entry, mark the old one as superseded.

**R5: Solve cold start with seed memories (P1).** After first review cycle, Borges generates seeds from project config (package.json, tsconfig, CI config) and initial audit findings. Agents start with project-specific facts before any reviews occur.

**R6: Role-aware memory loading (P2).** Each agent loads its own memory + shared learnings + relevant cross-agent entries filtered by domain tags. Szabo loads Voss entries tagged `auth`; it does not load Tufte's documentation patterns. 30% token savings per RCR-Router.

**R7: Temporal decay (P2).** Entries get `last-verified` dates. Borges flags entries not verified in 30+ days, archives those over 90 days. Prevents staleness accumulation.

**What NOT to do:** Don't use vector embeddings (overkill at dev-team's scale — flat markdown with tags is sufficient and preserves zero-dependency constraint). Don't implement RL-based memory management (the problem is nothing gets written, not retrieval quality). Don't share all memory with all agents.

---

## 2. Multi-Agent Orchestration

### Key Research Findings

| Source | Key Finding |
|--------|------------|
| [Anthropic 2026 Agentic Coding Trends Report](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf) | Multi-agent teams (Planner/Architect/Implementer/Tester/Reviewer) dramatically more reliable than single-agent for complex tasks. |
| [AI Agent Delegation Patterns](https://zylos.ai/research/2026-03-08-ai-agent-delegation-team-coordination-patterns) (Zylos, Mar 2026) | Hierarchical consistently outperforms flat. Tree-based delegation over star topology. Coordination failures account for 37% of multi-agent failures. |
| [Multi-Agent Pattern in Production](https://www.chanl.ai/blog/multi-agent-orchestration-patterns-production-2026) (Chanl.ai, 2026) | "Passing Ships Problem": parallel agents can't see each other's progress. Fix: shared scratchpad. Plan-and-execute cost optimization: 83% savings using expensive model for planning, cheap for execution. |
| [Microsoft AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) (Mar 2026) | Five patterns: Sequential, Concurrent, Group Chat, Handoff, Magentic. Limit group chat to 3 or fewer agents. Validate agent output before passing to next agent. |
| [Rise of AI Teammates in SE 3.0](https://arxiv.org/html/2507.15003v1) | Cross-vendor review provides stronger diversity than same-vendor adversarial prompting. Agents avoid hard problems (9.1% cyclomatic complexity changes vs 23.3% for humans). TypeScript's type system gives implicit advantage to agents. |

### What dev-team already gets right

| Feature | Research validation |
|---------|-------------------|
| Drucker as hierarchical orchestrator | Confirmed as dominant production pattern (all sources) |
| Brooks pre-assessment for file independence | Maps to DEPART's perception phase; unique competitive advantage |
| Parallel implementation via worktrees | Matches Microsoft's concurrent orchestration pattern |
| Iteration cap (10 per branch) | Microsoft explicitly recommends iteration caps for maker-checker loops |
| Model tier assignment (ADR-008) | Validated by Chanl.ai's cost optimization findings (83% savings possible) |
| One-exchange escalation limit | More disciplined than industry norm; prevents coordination stalls |

### Recommendations for dev-team

**R8: Complexity-based triage for watch lists (P0).** Current watch-list triggers are file-pattern-based (static). A one-line typo fix in an auth file triggers the same full Szabo review as a major auth rewrite. Score diffs by lines changed, files changed, and complexity indicators. Select review depth: LIGHT (advisory only), STANDARD (current), DEEP (additional reviewers).

**R9: Output validation at handoff points (P0).** Before routing implementing agent output to reviewers, verify: diff is non-empty, tests were run and pass, output addresses the stated issue. Catches silent failures before they waste reviewer tokens. **With agent teams (see Section 4)**, this can be enforced via `TaskCompleted` hooks natively.

**R10: Shared context for parallel work (P1).** ADR-019 Phase 1 has agents working "without awareness of each other." Even when files don't overlap, agents can make conflicting design decisions. **Agent teams (see Section 4) solve this natively** with shared task lists and peer-to-peer messaging. If agent teams are not available, fall back to a shared context scratchpad file.

**R11: Context compaction between review waves (P1).** After each review wave, Drucker compacts findings into a structured summary before spawning the next round. New reviewers get the current diff + compact summary, not full history. Prevents context window exhaustion in multi-round defect routing. **Reduced priority with agent teams** — each teammate has its own context window, so cross-agent context doesn't accumulate. Still relevant within a single agent's multi-round work.

**R12: Agent calibration metrics (P1).** After each task cycle, Borges records: agents spawned, defect counts per agent per round, false positive rate (overruled by human), time-to-convergence. Enables data-driven delegation decisions and identifies agents needing prompt tuning.

**R13: Resist agent proliferation (P2).** Microsoft limits group chat to 3 agents. Chanl.ai: "Better prompts or tools often solve problems requiring new agents." Dev-team has 12 agents. Before adding a 13th, verify the gap can't be addressed by improving an existing agent.

**R14: Scenario-level integration tests (P2).** Individual agent tests pass but systems fail at handoffs. Add tests exercising the full Drucker-to-specialist-to-reviewer-to-defect-routing loop.

---

## 3. Adversarial Code Review

### Key Research Findings

| Source | Key Finding |
|--------|------------|
| [HubSpot Sidekick](https://www.infoq.com/news/2026/03/hubspot-ai-code-review-agent/) (InfoQ, Mar 2026) | Multi-model system with a **judge agent** filtering review comments. 90% faster time-to-first-feedback. 80% thumbs-up rate. Key insight: the system's value comes from silence — commenting only when substantive. |
| [DORA 2025 Report](https://dora.dev/research/2025/dora-report/) | 90% AI adoption increase correlates with +9% bugs, +91% review time, +154% PR size. Individual productivity up but organizational delivery flat. AI is an amplifier: strengthens strong teams, worsens weak ones. |
| [Professional Developers Don't Vibe, They Control](https://arxiv.org/abs/2512.14012) (UC San Diego/Cornell, Dec 2025) | Senior developers give agents only 2.1 steps at a time despite plans with 70+ steps. All 11 developers building features created design plans first. Developers naturally apply adversarial patterns. |
| [Multi-Agent Debate](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/) (ICLR/NeurIPS 2025) | **MAD consistently underperforms simpler approaches.** Self-Consistency averaged higher accuracy. Devil's advocate pattern performed worst. Adding rounds/agents showed no gains. Token consumption 2-3x higher. **Exception: heterogeneous models (different vendors) showed improvement.** |
| [Multi-Agent-as-Judge](https://arxiv.org/html/2507.21028v1) (MAJ-Eval) | Stakeholder-specific perspectives (dimensional evaluation) outperform single-metric evaluation. Agents should maintain principled positions, not forced consensus. Coordinator selects speakers by disagreement magnitude. |
| [AI Code Review Benchmarks](https://www.propelcode.ai/benchmarks) (Propel, 2026) | Best tools: 68% precision. Claude Code: 23% precision, 51% recall. **77% false positive rate** unfiltered. |
| [GPTLens](https://github.com/git-disl/GPTLens) | Two adversarial roles: Auditor (maximize recall) and Critic (maximize precision). Substantial reduction in both false positives and false negatives vs. one-stage detection. |
| [Mike Mason: Coherence Through Orchestration](https://mikemason.ca/writing/ai-coding-agents-jan-2026/) (Jan 2026) | METR study: experienced developers **19% slower** with AI while believing themselves **20% faster** — 39-point perception gap. LinearB: **67.3% AI-generated PR rejection rate** vs 15.6% manual. |

### What dev-team already gets right

| Feature | Research validation |
|---------|-------------------|
| Specialized dimensional reviewers (Szabo/Knuth/Brooks) | MAJ-Eval confirms stakeholder-specific review outperforms single-model (all sources) |
| One-exchange escalation | MAD research: multi-round debate consistently underperforms. Devil's advocate worst. Dev-team's limit is architecturally correct. |
| DEFECT as the only blocker | Avoids the "flipping correct answers to incorrect" failure from over-aggressive debate |
| Concrete scenarios required | Maps to "code-intention consistency checking" identified as essential for false positive reduction |
| Always-on, not opt-in | DORA: +154% PR size and +91% review time means review load is growing. Automated review is necessary infrastructure. |

### Recommendations for dev-team

**R15: Add a judge/critic filtering stage (P0).** The strongest finding across all sources. HubSpot's judge achieved 80% thumbs-up. GPTLens's Critic substantially reduced false positives. Claude has 23% precision unfiltered. Before reporting findings to the human, run a filtering pass: remove findings that contradict ADRs/learnings/memory, deduplicate overlapping agent findings, consolidate SUGGESTION-level items, suppress findings on generated/vendored files.

**R16: "Silence is golden" principle (P0).** HubSpot's key insight: value comes from "often leaving no comments at all." When a reviewer finds nothing substantive, report "No substantive findings" and stop. Do not manufacture SUGGESTION-level findings to fill the review.

**R17: Activate calibration through memory (P1).** When findings are accepted → reinforce in agent memory. When overruled → record pattern so agent generates fewer findings of that type. When overruled 3+ times on the same tag → calibration rule. Borges extracts this automatically (see R1).

**R18: Track review acceptance rate per agent (P1).** Findings per review, accepted vs overruled vs ignored, acceptance rate over time. Enables detecting when an agent's signal-to-noise ratio degrades.

**R19: Cross-model validation for high-risk changes (P3, future).** MAD research found heterogeneous models (different vendors) improve results while same-model debate does not. When multi-model support is available, consider running one reviewer on a different model family for security-sensitive changes.

---

## 4. Agent Teams — Native Multi-Agent Coordination

### Discovery

Claude Code (v2.1.32+) has an experimental **agent teams** feature that fundamentally changes the orchestration model. Unlike subagents (which can only report back to the caller), agent teams provide:

- **Peer-to-peer messaging**: teammates communicate directly via a mailbox system
- **Shared task list**: with dependency tracking, self-claiming, and file locking
- **Team lead + teammates**: lead decomposes work, teammates execute independently
- **Plan approval mode**: teammates plan before implementing, lead approves
- **Quality gate hooks**: `TeammateIdle` and `TaskCompleted` hooks enforce standards

### Key Technical Details

| Aspect | Detail |
|--------|--------|
| **Activation** | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json |
| **Communication** | Direct messaging between teammates, broadcast to all, automatic idle notifications |
| **Task coordination** | Shared task list with pending/in-progress/completed states and dependency tracking |
| **Context** | Each teammate has its own context window. Loads CLAUDE.md, MCP servers, skills. Does NOT inherit lead's conversation history. |
| **Display modes** | In-process (Shift+Down to cycle) or split panes (tmux/iTerm2) |
| **Team size** | 3-5 teammates recommended. 5-6 tasks per teammate. |
| **Token cost** | 3-5x higher than single session. Each teammate is a separate Claude instance. |
| **Model assignment** | Lead on Opus (planning), teammates on Sonnet (execution) — ~60% cost reduction |

### Limitations

- **Experimental**: disabled by default, may change between versions
- **No nested teams**: teammates cannot spawn their own teams
- **No session resumption**: `/resume` does not restore in-process teammates
- **One team per session**: clean up before starting a new team
- **Lead is fixed**: can't transfer leadership or promote teammates
- **Permissions**: all teammates inherit lead's permission mode at spawn

### How This Maps to dev-team

| Agent team role | Dev-team agent | Responsibility |
|----------------|---------------|----------------|
| Team lead | Drucker | Decompose issues, create task list, assign file ownership, coordinate reviews |
| Teammate (implementer) | Voss/Deming/Tufte/etc. | Own specific files, self-claim tasks, implement |
| Teammate (reviewer) | Szabo/Knuth/Brooks | Review in parallel, message implementers directly with findings |
| Teammate (librarian) | Borges | Extract memories, verify cross-agent coherence |
| Teammate (release) | Conway | Version bump, changelog, release |

### Impact on Existing Recommendations

| Recommendation | Impact |
|---------------|--------|
| **R9** (Output validation at handoffs) | **Simplified** — `TaskCompleted` hook provides native enforcement |
| **R10** (Shared context scratchpad) | **Superseded** — shared task list and peer messaging solve this natively |
| **R11** (Context compaction) | **Reduced priority** — each teammate has own context window |
| **R12** (Calibration metrics) | **Enhanced** — shared task list provides natural tracking surface |
| **R14** (Scenario tests) | **More important** — new coordination layer to test |

### New Recommendation

**R20: Adopt agent teams for milestone-level orchestration (P1, v0.10).** Migrate Drucker from single-subagent execution to team lead mode. This requires:
1. Enabling `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` during `dev-team init` (opt-in while experimental)
2. Updating Drucker's definition with team lead responsibilities (task decomposition, file ownership assignment, teammate spawning)
3. Defining file ownership conventions per agent domain
4. Adding `TeammateIdle` and `TaskCompleted` hooks for quality gates
5. Updating ADR-019 to reflect the agent teams model
6. Consider an ADR for the experimental feature dependency

**Risk**: Experimental feature. Mitigation: make it opt-in, fall back to subagent model if disabled. Design agent definitions to work in both modes.

### Onboarding Consideration

`dev-team init` must handle agent teams enablement:
- Detect Claude Code version (≥2.1.32 required)
- Offer opt-in: "Enable agent teams for parallel work? (experimental)"
- If accepted, add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to `.claude/settings.json`
- If declined or version too old, parallel mode falls back to worktree subagents

### Sources

- [Claude Code Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams) — Official docs
- [Claude Code Agent Teams Playbook](https://www.mejba.me/fr/blog/claude-code-agent-teams-playbook) — Implementation guide with patterns

---

## Consolidated Priority Matrix

| Priority | # | Recommendation | Domain | Effort | Impact |
|----------|---|---------------|--------|--------|--------|
| **P0** | R1 | Automate memory formation (Borges writes, not audits) | Memory | Medium | Fixes the #1 systemic issue |
| **P0** | R2 | Structured memory entries over free text | Memory | Low | Enables all other memory improvements |
| **P0** | R8 | Complexity-based triage for watch lists | Orchestration | Medium | Reduces noise, prevents productivity paradox |
| **P0** | R9 | Output validation at handoff points | Orchestration | Low | Catches silent failures |
| **P0** | R15 | Judge/critic filtering stage | Review | Medium | Directly reduces false positives |
| **P0** | R16 | "Silence is golden" for clean reviews | Review | Low | Immediate noise reduction |
| **P1** | R3 | Two-tier memory structure | Memory | Low | Better separation of concerns |
| **P1** | R4 | Memory evolution (not just append) | Memory | Medium | Prevents staleness, enables calibration |
| **P1** | R5 | Cold start seed memories | Memory | Medium | Bootstraps the system |
| **P1** | R10 | Shared context for parallel work | Orchestration | Low | Superseded by agent teams (R20); keep as fallback |
| **P1** | R11 | Context compaction between review waves | Orchestration | Medium | Reduced priority with agent teams; still relevant intra-agent |
| **P1** | R20 | Adopt agent teams for milestone orchestration | Orchestration | High | Enables true parallel execution with peer communication |
| **P1** | R12 | Agent calibration metrics | Orchestration | Medium | Data-driven prompt tuning |
| **P1** | R17 | Calibration through memory | Review | Low | Reduces false positives over time |
| **P1** | R18 | Track review acceptance rate | Review | Low | Enables tuning |
| **P2** | R6 | Role-aware memory loading | Memory | Medium | Token savings |
| **P2** | R7 | Temporal decay for memories | Memory | Low | Prevents staleness |
| **P2** | R13 | Resist agent proliferation | Orchestration | Low | Governance |
| **P2** | R14 | Scenario integration tests | Orchestration | High | Catches orchestration failures |
| **P3** | R19 | Cross-model validation | Review | High | Blocked on multi-model support |

---

## Key Validating Data Points

- **67.3%** of AI-generated PRs are rejected (LinearB) — adversarial review is essential, not overhead
- **77%** false positive rate for Claude on code review without filtering (Propel benchmarks) — judge/critic filtering is urgent
- **37%** of multi-agent failures are coordination failures (Zylos, Chanl.ai) — orchestration resilience matters
- **83%** cost reduction possible with plan-and-execute model tier optimization (Chanl.ai) — validates ADR-008
- **19% slower** with AI despite perceiving 20% faster (METR) — the productivity paradox is real
- **0 of 12** agent memory files populated in dev-team — the cold start problem is the #1 priority

---

## Sources

### Agent Memory
- [Memory in the Age of AI Agents](https://arxiv.org/abs/2512.13564) — Hu et al., Dec 2025
- [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) — Xu et al., NeurIPS 2025
- [Memori: Persistent Memory Layer](https://arxiv.org/html/2603.19935) — Mar 2026
- [Memory for Autonomous LLM Agents](https://arxiv.org/html/2603.07670) — Survey, Mar 2026
- [G-Memory](https://arxiv.org/abs/2506.07398) — Multi-agent hierarchical memory, Jun 2025
- [RCR-Router](https://arxiv.org/abs/2508.04903) — Role-aware context routing, Aug 2025
- [LEGOMem](https://arxiv.org/abs/2510.04851) — Modular procedural memory, Oct 2025
- [Awesome Memory for Agents](https://github.com/TsinghuaC3I/Awesome-Memory-for-Agents) — Paper list
- [Agent Memory Paper List](https://github.com/Shichun-Liu/Agent-Memory-Paper-List) — Paper list

### Orchestration
- [Anthropic 2026 Agentic Coding Trends Report](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf)
- [AI Agent Delegation and Team Coordination Patterns](https://zylos.ai/research/2026-03-08-ai-agent-delegation-team-coordination-patterns) — Zylos, Mar 2026
- [Multi-Agent Pattern in Production](https://www.chanl.ai/blog/multi-agent-orchestration-patterns-production-2026) — Chanl.ai, 2026
- [Microsoft AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — Azure Architecture Center, Mar 2026
- [Rise of AI Teammates in SE 3.0](https://arxiv.org/html/2507.15003v1) — arXiv

### Adversarial Code Review
- [HubSpot Sidekick AI Code Review](https://www.infoq.com/news/2026/03/hubspot-ai-code-review-agent/) — InfoQ, Mar 2026
- [Toward Agentic SE Beyond Code](https://arxiv.org/html/2510.19692v2) — arXiv
- [DORA 2025 Report](https://dora.dev/research/2025/dora-report/)
- [Professional Developers Don't Vibe, They Control](https://arxiv.org/abs/2512.14012) — UC San Diego/Cornell, Dec 2025
- [Multi-Agent Debate Underperforms](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/) — ICLR 2025
- [Multi-Agent-as-Judge](https://arxiv.org/html/2507.21028v1) — MAJ-Eval
- [AI Code Review Benchmarks 2026](https://www.propelcode.ai/benchmarks) — Propel
- [GPTLens](https://github.com/git-disl/GPTLens) — Adversarial smart contract auditing
- [Coherence Through Orchestration](https://mikemason.ca/writing/ai-coding-agents-jan-2026/) — Mike Mason, Jan 2026
- [Eight Trends in Software 2026](https://claude.com/blog/eight-trends-defining-how-software-gets-built-in-2026) — Claude Blog
