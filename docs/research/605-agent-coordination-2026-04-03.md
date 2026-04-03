# Research Brief: Agent Coordination and Isolation

**Date**: 2026-04-02
**Issues**: #605, #604, #674
**Researcher**: Turing

---

## Question 1: Worktree Isolation vs Native Swarm Worker Gates (#605)

### What does Claude Code's native isolation provide?

Claude Code provides **three complementary isolation mechanisms**, not a single "swarm worker gate":

1. **Subagent isolation** -- Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions. Subagents return only their output to the orchestrator, not their full working context. They cannot spawn other subagents (no nesting).

2. **Agent team isolation** -- Each teammate is a separate Claude Code instance with its own 1M-token context window. Teammates load project context independently (CLAUDE.md, MCP servers, skills) but do NOT inherit the lead's conversation history. Communication is via mailbox (SendMessage/broadcast), not shared context.

3. **OS-level sandboxing** -- Uses Seatbelt (macOS) and bubblewrap (Linux) for filesystem and network isolation of Bash commands. Network traffic routes through a unix domain socket proxy that enforces domain restrictions. This is orthogonal to agent isolation -- it restricts what commands can do, not what agents can see.

**There is no documented "swarm worker gate" as a named permission layer.** The official permissions documentation describes a tiered permission system (read-only/bash/file-modification) with 6 evaluation scopes (managed settings > CLI args > local project > shared project > user settings), plus hooks and sandbox as complementary layers. The term "swarm worker gate" appears in third-party descriptions but is not in official documentation.

### Does our git worktree isolation duplicate, complement, or conflict?

**It complements.** Here is how the isolation layers stack:

| Layer | What it isolates | Who provides it | dev-team's worktree adds |
|-------|-----------------|-----------------|--------------------------|
| Context window | Agent memory, conversation history | Claude Code (subagents & teams) | Nothing -- already isolated |
| Tool access | Which tools an agent can use | Claude Code (subagent config) | Nothing -- already isolated |
| Filesystem | Which files an agent can read/write | Claude Code sandbox (Seatbelt/bubblewrap) | **Git branch isolation** -- prevents cross-branch contamination |
| Git state | Which branch, staging area, working tree | **Not isolated by Claude Code** | **Worktree gives each agent its own git state** |

The critical gap that worktrees fill: **Claude Code's native isolation does not isolate git state.** Agent teams sharing a working directory share the same `.git` index, staging area, and branch pointer. This causes the cross-branch contamination documented in dev-team-learnings.md (v1.7.0: 3 stray commits, agents switching branches under each other).

Agent teams provide context isolation (separate conversation windows) and communication isolation (mailbox-based messaging), but they share the filesystem by default. The official docs explicitly warn: "Two teammates editing the same file leads to overwrites. Break the work so each teammate owns a different set of files."

### Do agent teams leverage swarm worker gates?

Agent teams use:
- **Shared task list** with file-locking for race-condition prevention on task claiming
- **Mailbox system** for direct peer-to-peer messaging
- **Permission inheritance** from the lead (all teammates start with lead's permission settings)
- **No filesystem isolation** between teammates by default

The "swarm" terminology in community documentation refers to the multi-agent coordination pattern, not a specific security gate.

### Recommendation for #605

**Keep worktree isolation. It fills a real gap that Claude Code does not address natively.**

However, reduce the worktree infrastructure's complexity. Agent teams + worktrees is the right combination:
- Agent teams provide: context isolation, task coordination, peer messaging
- Worktrees provide: git state isolation (branch, staging, working tree)

The `INFRA_HOOKS` worktree serialization noted in dev-team-learnings.md is a workaround for Claude Code bugs (#34645, #39680). Monitor those upstream issues -- when fixed, the serialization hooks can be removed, but worktree isolation itself remains valuable.

---

## Question 2: UDS/Bridge Modes for Agent Coordination (#604)

### Are BRIDGE_MODE and UDS_INBOX accessible to external users?

**No.** These are internal implementation details of Claude Code's transport layer, not public APIs.

Based on analysis of Claude Code's architecture (source published via npm source maps, March 2026):

- **Bridge** (`replBridge.ts`) is the transport mechanism for synchronizing local REPL state with remote environments. It manages state sync, message routing, and permission delegation. It uses HTTP/WebSocket transports (V1/V2 versioned), not Unix domain sockets for inter-agent communication.

- **Remote Control** (the public-facing feature) uses outbound HTTPS only -- no inbound ports. Sessions register with the Anthropic API and poll for work. All traffic goes through TLS to the Anthropic API.

- **Teleport** is a session mode for cloud-hosted environments (distinct from Remote Control's local execution). Uses Bridge Proxy (WS/HTTP) transport with OAuth authentication.

- **UDS (Unix Domain Sockets)** are used specifically for the **sandbox network proxy** -- the mechanism that routes Bash subprocess network traffic through a controlled proxy for domain filtering. They are NOT used for agent-to-agent communication.

The three remote session modes are:

| Mode | Transport | Use case |
|------|-----------|----------|
| Teleport | Bridge Proxy (WS/HTTP) | Cloud environments |
| Direct Connect | Direct WebSocket | Local/remote port forwarding |
| SSH Sessions | SSH child process | Remote server access |

None of these are designed for or exposed as agent coordination APIs.

### How could they improve agent team handoffs?

**They cannot, in their current form.** The Bridge is a user-facing remote access mechanism, not an agent coordination protocol. Agent teams already have their own coordination substrate:

- **Mailbox**: Direct peer-to-peer messaging between teammates
- **Shared task list**: File-locked task claiming with dependency tracking
- **Team config**: `~/.claude/teams/{team-name}/config.json` with member discovery

### Is SendMessage-based coordination sufficient?

**Yes, for dev-team's current architecture.** The agent team mailbox system provides:

1. Direct peer messaging (teammate-to-teammate, not just hub-and-spoke)
2. Automatic message delivery (no polling required)
3. Idle notifications (teammates notify lead when done)
4. Shared task list with dependency tracking and file-locking for race conditions

The limitations are documented and known:
- No session resumption for in-process teammates
- Task status can lag (teammates sometimes fail to mark tasks complete)
- One team per session
- No nested teams

These are product maturity issues, not architectural gaps that Bridge/UDS could solve.

### Recommendation for #604

**Ignore BRIDGE_MODE and UDS_INBOX for agent coordination purposes.** They are internal transport mechanisms for remote access, not agent communication APIs. dev-team's SendMessage + task list coordination is the correct abstraction layer.

**Watch**: The `channels` feature (Telegram, Discord, custom server push events) could be more relevant for external event-driven agent coordination in the future, but it targets different use cases (CI failure notification, chat-triggered tasks).

---

## Question 3: DeepMind Multi-Agent Papers (#674)

### Survey of Relevant Publications (2024-2026)

**Important clarification**: The most relevant paper on scaling agent systems is NOT from DeepMind. The research landscape is broader.

#### Paper 1: "Towards a Science of Scaling Agent Systems" (Dec 2025)
- **Authors**: Yubin Kim, Ken Gu, et al. (18 authors)
- **Affiliation**: NOT DeepMind (academic institutions)
- **arxiv**: 2512.08296

Key findings directly relevant to dev-team:

| Finding | Implication for dev-team |
|---------|------------------------|
| **Tool-coordination trade-off**: tool-heavy tasks suffer disproportionately from multi-agent overhead | Validates dev-team's pattern of single implementing agent + parallel reviewers. Don't split implementation across agents for tool-heavy tasks. |
| **Capability saturation**: coordination yields diminishing/negative returns once single-agent baseline exceeds ~45% accuracy | Supports using Opus for implementation (high single-agent capability) rather than splitting across weaker models. |
| **Error amplification**: independent agents amplify errors 17.2x, centralized coordination contains to 4.4x | Strongly validates dev-team's Drucker centralized orchestration (ADR-015). Independent agents without coordinator would be catastrophic. |
| **Centralized +80.8% on parallelizable tasks, decentralized +9.2% on web navigation** | dev-team's hybrid model (centralized Drucker + parallel independent reviewers) is well-aligned. |
| **Framework predicts optimal strategy for 87% of configurations** | Task classification before agent selection (Phase 0: Brooks pre-assessment) is validated. |

#### Paper 2: "Scaling LLM-based Multi-Agent Collaboration" (Jun 2024)
- **Authors**: Chen Qian, Weize Chen, et al. (Tsinghua/OpenBMB)
- **arxiv**: 2406.07155

Key findings:

| Finding | Implication for dev-team |
|---------|------------------------|
| **Collaborative scaling follows logistic growth** -- emergence earlier than neural emergence | Adding agents has diminishing returns. dev-team's 3-5 agent sweet spot (1 implementer + 2-3 reviewers + Borges) is near optimal. |
| **Irregular topologies outperform regular ones** | dev-team's asymmetric topology (Drucker hub, specialist spokes, peer review waves) is better than fully-connected or ring topologies. |
| **Successfully scaled to 1000+ agents** | Not relevant for dev-team's use case. Coding tasks don't benefit from massive parallelism. |

#### Paper 3: "Collaborative Memory" (May 2025)
- **Authors**: Rezazadeh, Li, Lou, et al.
- **arxiv**: 2505.18279

Key findings:

| Finding | Implication for dev-team |
|---------|------------------------|
| **Two-tier memory**: private + shared with dynamic access control | Directly mirrors dev-team's memory architecture: Tier 1 shared (rules/learnings) + Tier 2 agent-specific (agent-memory/). |
| **Immutable provenance tracking** (agent, resource, timestamp) | dev-team's `Last-verified` dates and `Source` fields serve similar purpose but are less structured. |
| **Bipartite access control graphs** | dev-team's current model is simpler (all agents read shared, each agent writes own). Sufficient for current scale. |

#### Paper 4: "MIRIX: Multi-Agent Memory System" (Jul 2025)
- **Authors**: Yu Wang, Xi Chen (MIRIX AI)
- **arxiv**: 2507.07957

Key finding: Six specialized Memory Managers with a Meta Memory Manager for task routing. Relevant to #606 (Kairos memory system) more than to coordination.

### Patterns Compared Against dev-team Architecture

| Pattern | Academic finding | dev-team status | Gap? |
|---------|-----------------|-----------------|------|
| Centralized orchestration | 4.4x error containment vs 17.2x independent | Drucker (ADR-015) | No gap |
| Parallel review waves | Centralized +80.8% on parallelizable tasks | ADR-019 | No gap |
| Specialist agents | Modular > monolithic for multi-stage processes | 10+ specialist agents | No gap |
| Capability-matched routing | Task classification predicts optimal strategy 87% | Brooks pre-assessment (Phase 0) | No gap |
| Two-tier memory | Private + shared with access control | Tier 1 shared + Tier 2 agent-specific | No gap |
| Irregular topology | Outperforms regular (ring, fully-connected) | Asymmetric hub-spoke + peer review | No gap |
| Diminishing returns at scale | Logistic growth, saturation at ~45% single-agent | 3-5 agents per task | No gap |
| Conflict resolution | Centralized containment essential | One exchange + human escalation (ADR-015) | No gap |

### Recommendation for #674

**dev-team's architecture is well-aligned with current multi-agent research.** No architectural changes needed. Specific observations:

1. **Validate, don't change**: The academic findings confirm dev-team's existing patterns rather than suggesting new ones. Centralized orchestration, specialist agents, asymmetric topology, and two-tier memory are all validated.

2. **Watch the scaling law**: The ~45% capability saturation threshold is the most actionable finding. As single-agent capability improves (Opus 4.6 is already very capable), the value of multi-agent coordination may decrease for straightforward tasks. dev-team should track whether the adversarial review loop catches fewer real issues over time -- this could signal approaching saturation.

3. **Error amplification data strengthens the case for Drucker**: The 17.2x vs 4.4x error amplification finding is strong quantitative evidence that independent agents (no orchestrator) would be significantly worse. This supports the decision to always route through Drucker rather than letting users invoke specialist agents directly.

4. **No DeepMind-specific breakthrough found**: The search did not surface a DeepMind paper specifically about multi-agent LLM coding systems. The most relevant work comes from academic groups (scaling agent systems) and industry labs (collaborative memory). DeepMind's multi-agent work focuses on reinforcement learning for games and robotics, not LLM-based coding agents.

---

## Evidence Table

| Claim | Source URL | Verified |
|-------|-----------|----------|
| Subagents run in own context window with custom system prompt, tools, permissions | https://code.claude.com/docs/en/sub-agents | yes |
| Agent teams: each teammate is separate Claude Code instance | https://code.claude.com/docs/en/agent-teams | yes |
| Sandboxing uses Seatbelt (macOS) and bubblewrap (Linux) | https://code.claude.com/docs/en/sandboxing | yes |
| Network isolation via unix domain socket proxy | https://code.claude.com/docs/en/sandboxing | yes |
| Permission system: tiered (read-only, bash, file-modification) | https://code.claude.com/docs/en/permissions | yes |
| Agent teams share filesystem by default | https://code.claude.com/docs/en/agent-teams | yes |
| Task claiming uses file locking for race conditions | https://code.claude.com/docs/en/agent-teams | yes |
| Teammates start with lead's permission settings | https://code.claude.com/docs/en/agent-teams | yes |
| Subagents cannot spawn other subagents (no nesting) | https://code.claude.com/docs/en/sub-agents | yes |
| Remote Control uses outbound HTTPS only, no inbound ports | https://code.claude.com/docs/en/remote-control | yes |
| Bridge manages state sync via HTTP/WebSocket (V1/V2) | https://deepwiki.com/shihaohuang-notion/claude-code/9.2-remote-sessions-teleport-and-bridge | yes (third-party analysis of source) |
| "Swarm worker gate" as named permission layer | N/A | **UNVERIFIED -- not found in official docs** |
| BRIDGE_MODE / UDS_INBOX as public APIs | N/A | **UNVERIFIED -- internal implementation details only** |
| Error amplification: independent 17.2x, centralized 4.4x | https://arxiv.org/abs/2512.08296 | yes |
| Capability saturation at ~45% single-agent accuracy | https://arxiv.org/abs/2512.08296 | yes |
| Centralized coordination +80.8% on parallelizable tasks | https://arxiv.org/abs/2512.08296 | yes |
| Irregular topologies outperform regular ones | https://arxiv.org/abs/2406.07155 | yes |
| Collaborative scaling follows logistic growth | https://arxiv.org/abs/2406.07155 | yes |
| Two-tier memory (private + shared) with access control | https://arxiv.org/abs/2505.18279 | yes |
| MIRIX: 6 specialized Memory Managers + Meta Manager | https://arxiv.org/abs/2507.07957 | yes |
| Scaling paper is NOT from DeepMind | https://arxiv.org/abs/2512.08296 | yes |

---

## Known Issues / Caveats

1. **"Swarm worker gate" is community terminology, not official.** Issue #605 references this term but it does not appear in Claude Code's official documentation. The actual isolation model is multi-layered (context windows + permissions + sandbox) rather than a single gate.

2. **Bridge/UDS internals are based on leaked source analysis.** The npm source map leak (March 2026) exposed internal architecture, but these are not documented APIs and may change without notice.

3. **Agent teams are experimental.** The official docs carry an explicit warning: "Agent teams are experimental and disabled by default." Known limitations include no session resumption, task status lag, one team per session, no nested teams.

4. **Academic papers on multi-agent LLM systems are evolving rapidly.** The findings cited here (Dec 2025 - Jul 2025) may be superseded. The scaling laws and error amplification numbers are from controlled benchmarks, not production coding workflows.

5. **No DeepMind-specific coding agent paper found.** The #674 request asked specifically about DeepMind publications. While DeepMind has extensive multi-agent RL work, their focus is games/robotics, not LLM-based coding agents. The most relevant coding-agent research comes from other groups.

---

## Confidence Level

**High** for #605 (worktree isolation) -- based entirely on official Claude Code documentation.

**Medium** for #604 (UDS/Bridge) -- based on official docs for Remote Control plus third-party source analysis for internals. The conclusion (these are not agent coordination APIs) is high-confidence, but internal architecture details may be incomplete.

**Medium** for #674 (multi-agent papers) -- comprehensive survey of arxiv, but no specific DeepMind paper on LLM coding agents was found. The architectural validation is strong but based on general multi-agent research, not coding-specific studies.

---

## Recommended Actions

- **Title**: Close #605 with "no change needed" -- worktree isolation complements native agent team isolation
  **Severity**: P2
  **Files affected**: none (architecture validation)
  **Scope**: S

- **Title**: Close #604 with "not applicable" -- BRIDGE_MODE/UDS_INBOX are internal transport, not agent coordination APIs
  **Severity**: P2
  **Files affected**: none
  **Scope**: S

- **Title**: Add scaling-law reference to ADR-019 rationale (optional enrichment)
  **Severity**: P2
  **Files affected**: `docs/adr/019-parallel-review-waves.md` (note: ADRs are immutable, so this would be a new ADR or a learnings entry)
  **Scope**: S

- **Title**: Track upstream Claude Code agent team stability for worktree simplification
  **Severity**: P2
  **Files affected**: `.claude/rules/dev-team-learnings.md`
  **Scope**: S

- **Title**: Close #674 with summary -- dev-team architecture validated by multi-agent research, no changes needed
  **Severity**: P2
  **Files affected**: none (architecture validation)
  **Scope**: S
