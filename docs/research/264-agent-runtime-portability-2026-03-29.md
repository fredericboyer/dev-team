# Research Brief: Agent Runtime Portability

**Issue**: #264 (v2.0 vision — multi-runtime support)
**Researcher**: Turing
**Date**: 2026-03-29

## Question

What standards, protocols, and formats exist today that would enable dev-team's agent definitions, skills, and hooks to be portable across the most agent runtimes?

## Background

dev-team currently targets Claude Code exclusively. Its artifacts — agent definitions, skills, hooks, rules, settings, and memory — use Claude Code's proprietary formats. The v2.0 vision asks: what's the most portable approach for supporting multiple runtimes?

This brief surveys the current landscape of agent runtime configuration, identifies emerging standards, and evaluates portability architecture options.

---

## Part 1: Existing Standards Survey

### AGENTS.md — The Instruction-Layer Standard

**Status**: Linux Foundation project under the Agentic AI Foundation (AAIF), announced December 2025. Originally released by OpenAI in August 2025 for Codex CLI.

**What it is**: A plain Markdown file providing project-specific instructions to coding agents. No required frontmatter, no mandatory sections, no structured data schema. "AGENTS.md is just standard Markdown. Use any headings you like."

**Discovery**: Agents locate the nearest AGENTS.md in the directory tree. The closest file takes precedence. Monorepos can use nested files per subproject. Codex's implementation walks from Git root to CWD, checking for `AGENTS.override.md` then `AGENTS.md` in each directory.

**What it does NOT define**:

- Hooks or lifecycle events
- Skills or callable commands
- Memory or state persistence
- Multi-agent coordination
- Structured metadata or frontmatter

**Adoption** (as of March 2026): GitHub Copilot, Cursor, Windsurf, Zed, Warp, JetBrains Junie, OpenAI Codex CLI, Google Gemini CLI, Jules, Amp, Devin, Aider, goose (Block), Kilo Code, RooCode, Augment Code. Claude Code does **not** natively auto-load AGENTS.md (open feature request: anthropics/claude-code#6235, #31005).

**Assessment**: AGENTS.md is the de facto standard for the instruction layer — the lowest common denominator. It covers only one of dev-team's six artifact types (rules/instructions). It cannot express hooks, skills, memory, or multi-agent coordination.

Sources:

- [AGENTS.md official site](https://agents.md/)
- [AGENTS.md GitHub repo](https://github.com/agentsmd/agents.md)
- [OpenAI Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- [AAIF announcement](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [InfoQ coverage](https://www.infoq.com/news/2025/08/agents-md/)

### MCP (Model Context Protocol) — The Tool Integration Standard

**Status**: Linux Foundation project under AAIF. Originally released by Anthropic in November 2024. Current spec version: 2025-11-25. 2026 roadmap published.

**What it is**: A JSON-RPC client-server protocol enabling LLMs to access external tools, resources, and data through standardized mechanisms. It is an integration layer for tool access, not an agent definition format.

**What it covers**:

- Tool definitions (name, description, input schema)
- Resource access (data retrieval)
- Prompt templates
- Transport: stdio, HTTP+SSE, Streamable HTTP

**What it does NOT cover (today)**:

- Agent behavioral instructions (that's AGENTS.md's domain)
- Agent-to-agent communication (on the 2026 roadmap)
- Hook/event lifecycle
- Memory persistence
- Multi-agent orchestration

**2026 Roadmap priorities**: Transport scalability, agent-to-agent communication, governance maturation, enterprise readiness. The agent communication extensions would allow MCP servers to act as agents themselves.

**Adoption**: Supported by Claude Code, GitHub Copilot, Cursor, Windsurf, Cline, Amazon Q Developer, OpenAI Codex, and most major runtimes.

**Assessment**: MCP is the standard for tool integration, not for agent definitions. dev-team's hooks could potentially be exposed as MCP tools, but the protocol cannot express behavioral instructions, skill workflows, or memory. MCP is complementary to AGENTS.md, not a replacement.

Sources:

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [2026 MCP Roadmap](http://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [MCP GitHub](https://github.com/modelcontextprotocol/modelcontextprotocol)

### Adjacent Agent Communication Protocols

Four protocols address agent interoperability at different levels. None target coding agent configuration specifically:

| Protocol                               | Scope                                                     | Relevance to dev-team                          |
| -------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| **MCP**                                | Tool invocation for LLMs                                  | High — tool integration layer                  |
| **A2A** (Google, v0.3)                 | Agent-to-agent task delegation via Agent Cards + JSON-RPC | Low — enterprise orchestration, not IDE agents |
| **ACP** (Agent Communication Protocol) | REST-native async agent messaging                         | Low — infrastructure-level                     |
| **ANP** (Agent Network Protocol)       | Decentralized P2P agent discovery via DIDs                | Low — internet-scale, not project-level        |

**W3C**: AI Agent Protocol Community Group developing web-based agent discovery and collaboration. WebMCP allows websites to expose JS functionality as agent tools.

**IETF**: AI Agent Discovery and Invocation Protocol (AIDIP) presented at IETF 125 (March 2026) — HTTP-based agent discovery and unified invocation. Early stage.

**Assessment**: No W3C/IETF standard addresses coding agent configuration portability. The AAIF (AGENTS.md + MCP + goose) is the closest thing to a governing body for this space.

Sources:

- [Agent Interoperability Protocols Survey (arXiv)](https://arxiv.org/html/2505.02279v1)
- [Google A2A Announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [IETF Agentic AI Standards blog](https://www.ietf.org/blog/agentic-ai-standards/)

---

## Part 2: Runtime Capability Matrix

### Legend

- **Full**: Native, documented support
- **Partial**: Limited or workaround-based
- **None**: Not supported
- **Via MCP**: Available through MCP server integration

| Capability                      | Claude Code                        | GitHub Copilot                         | Cursor                          | Windsurf                   | Codex CLI                     | Gemini CLI                  | Amazon Q Dev            | Aider          | Cline               |
| ------------------------------- | ---------------------------------- | -------------------------------------- | ------------------------------- | -------------------------- | ----------------------------- | --------------------------- | ----------------------- | -------------- | ------------------- |
| **Instruction file**            | CLAUDE.md                          | copilot-instructions.md + AGENTS.md    | .cursor/rules/                  | .windsurf/rules/           | AGENTS.md                     | GEMINI.md                   | JSON config             | CONVENTIONS.md | .clinerules/        |
| **AGENTS.md support**           | None (requested)                   | Full                                   | Full                            | Full                       | Full (native)                 | Full                        | Unknown                 | Full           | Full                |
| **Directory hierarchy**         | Full (.claude/)                    | Full (.github/)                        | Full (.cursor/rules/)           | Full (.windsurf/rules/)    | Full (.codex/, .agents/)      | Full (nested GEMINI.md)     | Partial (.qdeveloper/)  | Partial        | Full (.clinerules/) |
| **Path-scoped rules**           | Full (rules/\*.md)                 | Full (.instructions.md + applyTo glob) | Full (glob in rule frontmatter) | Full (activation modes)    | Partial (directory nesting)   | Partial (directory nesting) | Partial (glob in JSON)  | None           | Partial             |
| **Hooks/events**                | Full (12 events)                   | None                                   | None                            | None                       | Partial (5 events, beta)      | None                        | Partial (hooks in JSON) | None           | None                |
| **Skills/commands**             | Full (slash commands via SKILL.md) | Partial (Copilot Extensions)           | None                            | Partial (Workflows)        | Full (.agents/skills/)        | None                        | None                    | None           | None                |
| **Memory persistence**          | Full (rules + agent memory)        | None                                   | None                            | Partial (Cascade memories) | None                          | Partial (/memory command)   | None                    | None           | None                |
| **Multi-agent coordination**    | Full (agent teams, subagents)      | None                                   | None                            | None                       | None                          | None                        | None                    | None           | None                |
| **MCP support**                 | Full                               | Full                                   | Full                            | Full                       | Full                          | Full                        | Full                    | None           | Full                |
| **Frontmatter in instructions** | Yes (YAML in agents, skills)       | Yes (.instructions.md)                 | Yes (MDC format)                | Yes (activation mode)      | No (AGENTS.md) / Yes (skills) | No                          | N/A (JSON)              | No             | No                  |

### Key Observations

1. **Instructions are universally supported** — every runtime reads Markdown files with project context. Format varies but function is identical.

2. **Hooks are rare** — only Claude Code has mature hook support (12 events). Codex CLI has beta hooks (5 events). No other runtime supports hooks natively.

3. **Skills exist in two runtimes** — Claude Code and Codex CLI both support skill-like packages (Markdown + optional scripts). The formats differ significantly but share conceptual structure.

4. **Multi-agent is Claude Code only** — no other runtime supports multi-agent coordination. This is dev-team's most differentiating capability and least portable.

5. **MCP is nearly universal** — 8 of 9 runtimes support MCP. This is the most reliable cross-runtime integration point.

6. **Memory is sparse** — only Claude Code has structured memory persistence. Windsurf and Gemini have basic memory features.

---

## Part 3: Common Denominator Analysis

### Universally Portable (works on all runtimes)

- **Markdown instructions**: Project context, coding conventions, behavioral guidelines
- **MCP tools**: External tool integration (8/9 runtimes)

### Partially Portable (works on 2-3 runtimes)

- **Skills/commands**: Claude Code + Codex CLI (different formats, same concept)
- **Hooks/events**: Claude Code + Codex CLI (similar event model, different config)
- **Path-scoped rules**: Claude Code, Copilot, Cursor, Windsurf (different frontmatter)

### Not Portable (single runtime only)

- **Multi-agent coordination**: Claude Code only
- **Agent definitions with YAML frontmatter**: Claude Code format
- **Structured memory**: Claude Code format

### The Portability Gap

dev-team's value proposition rests on capabilities that are **not** in the portable intersection:

| dev-team Artifact | Portability                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Agent definitions | NOT portable — behavioral Markdown is portable, but frontmatter (tools, model, memory) is Claude Code-specific |
| Skills            | Partially portable — Codex CLI has a similar concept (.agents/skills/)                                         |
| Hooks             | Partially portable — Codex CLI has a beta hook system                                                          |
| Rules             | Highly portable — Markdown instructions work everywhere                                                        |
| Settings          | NOT portable — .claude/settings.json is Claude Code-specific                                                   |
| Memory            | NOT portable — structured agent memory is Claude Code-only                                                     |

---

## Part 4: Portability Architecture Options

### Option A: Lowest Common Denominator (AGENTS.md Only)

**Approach**: Express all agent instructions as plain AGENTS.md files. Drop hooks, skills, memory, and multi-agent features.

**Pros**:

- Works on 20+ runtimes today
- Zero maintenance burden — the format is trivial
- AAIF governance provides stability

**Cons**:

- Loses 80% of dev-team's value (adversarial review loops, hooks, skills, memory calibration)
- AGENTS.md has a 150-line best practice / 32KB hard limit — dev-team's agent definitions alone exceed this
- No enforcement — all instructions are advisory with no hook-based gates

**Verdict**: Not viable. dev-team's entire thesis is enforcement through productive friction. AGENTS.md-only reduces dev-team to a documentation generator.

### Option B: Portable Core + Runtime Adapters

**Approach**: Define a canonical format for all dev-team artifacts. Ship adapter modules that translate the canonical format into each runtime's native conventions at install time.

```
dev-team canonical format
    |
    +-- Claude Code adapter  --> .claude/, CLAUDE.md, hooks, skills, rules
    +-- Codex CLI adapter    --> .codex/, AGENTS.md, hooks.json, .agents/skills/
    +-- Copilot adapter      --> .github/copilot-instructions.md, .instructions.md
    +-- Cursor adapter       --> .cursor/rules/*.md
    +-- Windsurf adapter     --> .windsurf/rules/*.md
    +-- Generic adapter      --> AGENTS.md (instruction-only fallback)
```

**Pros**:

- Preserves full capability on capable runtimes (Claude Code, Codex CLI)
- Graceful degradation — less capable runtimes get what they can support
- Single source of truth — agent definitions authored once
- Adapter pattern is proven (Babel, PostCSS, Terraform providers)

**Cons**:

- Significant engineering investment (one adapter per runtime)
- Must track runtime format changes (cursor just migrated .cursorrules to .cursor/rules/)
- Feature gap creates confusing "works on Claude Code but not on Cursor" situations
- Testing matrix grows multiplicatively

**Verdict**: Most promising approach. The canonical format should be a superset that maps cleanly to AGENTS.md (for instructions) and MCP (for tool integration), with runtime-specific extensions for hooks, skills, and memory.

### Option C: MCP-Based Architecture

**Approach**: Express dev-team's agents, skills, and hooks as MCP servers. Runtimes that support MCP get full capability.

**Pros**:

- MCP is supported by 8/9 runtimes evaluated
- Tool definitions map naturally to MCP tool schemas
- MCP servers can run arbitrary logic (equivalent to hooks)
- Future MCP agent-to-agent features could enable multi-agent portability

**Cons**:

- MCP defines tool interfaces, not behavioral instructions — agent definitions still need a separate format
- MCP servers require a runtime process (Node.js, Python) — heavier than static Markdown files
- MCP cannot express "read this context before every request" — that's AGENTS.md's job
- Memory and multi-agent coordination have no MCP equivalent today
- Operational complexity: each MCP server is a process to manage

**Verdict**: Complementary, not primary. MCP is the right vehicle for dev-team's hook enforcement (tool gating, review gates) and skill execution on runtimes that lack native hooks. But agent behavioral instructions must still be expressed as Markdown files.

### Option D: Hybrid — AGENTS.md Core + MCP Enforcement + Runtime Adapters

**Approach**: Combine the strengths of all three:

1. **AGENTS.md** for behavioral instructions (universal layer)
2. **MCP servers** for enforcement and tool integration (near-universal layer)
3. **Runtime adapters** for native features where available (capability layer)

```
Canonical agent definition (dev-team format)
    |
    +-- Instructions --> AGENTS.md (universal)
    |                    + runtime-specific files where beneficial
    |
    +-- Enforcement  --> MCP server (hooks, review gates, tool gating)
    |                    + native hooks where available (Claude Code, Codex)
    |
    +-- Skills       --> MCP tools (callable via any MCP-supporting runtime)
    |                    + native skills where available (Claude Code, Codex)
    |
    +-- Memory       --> Files in repo (portable) + runtime-specific integration
    |
    +-- Settings     --> Per-runtime adapter (settings.json, config.toml, etc.)
```

**Pros**:

- Maximum reach: AGENTS.md works everywhere, MCP works on 8/9 runtimes
- Maximum depth: native features used where available
- Graceful degradation: instruction-only runtimes still get behavioral context
- MCP servers provide enforcement on runtimes that lack native hooks
- Future-proof: as MCP gains agent communication, the enforcement layer strengthens

**Cons**:

- Most complex to implement
- Three layers to maintain instead of one
- MCP enforcement server is a new component to build and ship

**Verdict**: Recommended. This is the architecture that preserves dev-team's value proposition while maximizing portability. The key insight is that dev-team's artifacts decompose cleanly into three concerns (instructions, enforcement, native integration) that map to three standards at different maturity levels.

---

## Part 5: Risk Assessment

### Convergence Signals (Positive)

1. **AAIF under Linux Foundation** — AGENTS.md, MCP, and goose under one foundation with Amazon, Google, Microsoft, OpenAI, Anthropic, and Cloudflare as members. This is the strongest convergence signal.

2. **AGENTS.md adoption is near-universal** — 20+ runtimes in <12 months. The instruction layer is effectively standardized.

3. **MCP adoption is equally broad** — near-universal tool integration standard.

4. **Runtime instruction formats are converging** — Cursor migrated from .cursorrules to .cursor/rules/ (closer to Claude Code's .claude/rules/). Copilot added AGENTS.md support. Windsurf moved from .windsurfrules to .windsurf/rules/.

### Fragmentation Risks (Negative)

1. **Claude Code has not adopted AGENTS.md** — the most capable runtime uses its own format. Open feature requests exist but no commitment. This is the single largest portability risk for dev-team.

2. **Hooks are not standardizing** — Claude Code and Codex CLI have similar but incompatible hook systems. No standard is emerging. Hook portability will require MCP-based enforcement.

3. **Skills have no standard** — Claude Code's SKILL.md and Codex's .agents/skills/ are conceptually similar but structurally different. No cross-runtime skill format exists or is proposed.

4. **Multi-agent coordination is proprietary** — Claude Code's agent teams have no equivalent anywhere. This capability cannot be made portable in the near term.

5. **Format churn is high** — Cursor's .cursorrules deprecated in months. Windsurf's .windsurfrules deprecated. Runtime-specific formats have short half-lives (6-12 months). AGENTS.md and MCP, under AAIF governance, are more stable.

### Half-Life Estimates

| Format                          | Estimated Half-Life | Reasoning                                          |
| ------------------------------- | ------------------- | -------------------------------------------------- |
| AGENTS.md                       | 3+ years            | AAIF governance, near-universal adoption           |
| MCP                             | 3+ years            | AAIF governance, enterprise investment             |
| CLAUDE.md                       | 2+ years            | Anthropic's primary format, large user base        |
| .cursor/rules/                  | 1-2 years           | Already migrated once, Cursor supports AGENTS.md   |
| .windsurf/rules/                | 1-2 years           | Already migrated once, Windsurf supports AGENTS.md |
| .github/copilot-instructions.md | 2+ years            | GitHub platform, but AGENTS.md also supported      |
| Runtime-specific hooks formats  | Unknown             | No standard emerging, high fragmentation risk      |

---

## Recommendation

**Adopt Option D (Hybrid)** with a phased implementation:

### Phase 1: Canonical Format + AGENTS.md Export (Low effort, high reach)

- Define a canonical agent definition format (superset of AGENTS.md)
- Add an AGENTS.md export adapter to `dev-team init` — generates AGENTS.md from agent definitions
- This immediately gives dev-team users instruction-layer portability across 20+ runtimes
- No changes to Claude Code-native artifacts

### Phase 2: MCP Enforcement Server (Medium effort, high value)

- Build a dev-team MCP server that exposes review gates, hook logic, and skill execution as MCP tools
- Runtimes that support MCP (8/9) get enforcement without native hooks
- This is the key unlock for Copilot, Cursor, Windsurf portability — they get enforcement through MCP

### Phase 3: Runtime Adapters for Capable Runtimes (Medium effort, targeted)

- Codex CLI adapter: generate hooks.json + .agents/skills/ from canonical format
- Copilot adapter: generate .instructions.md files with applyTo globs
- Cursor/Windsurf adapters: generate native rule files
- These provide native-feel integration where the runtime supports it

### Phase 4: Monitor and Adapt (Ongoing)

- Track AGENTS.md spec evolution under AAIF
- Track MCP agent communication features (2026 roadmap)
- Track Claude Code AGENTS.md adoption
- Re-evaluate when MCP agent-to-agent communication lands

### What NOT to Do

- Do not drop Claude Code-native features to chase portability
- Do not build adapters for every runtime — focus on the top 3-4 by market share
- Do not wait for a single standard to emerge — the hybrid approach hedges correctly
- Do not express agent behavioral instructions as MCP (wrong abstraction level)

---

## Evidence

- [AGENTS.md official site](https://agents.md/)
- [AGENTS.md GitHub repo](https://github.com/agentsmd/agents.md)
- [OpenAI Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- [OpenAI Codex Skills](https://developers.openai.com/codex/skills)
- [OpenAI Codex Hooks](https://developers.openai.com/codex/hooks)
- [AAIF announcement (Linux Foundation)](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP 2026 Roadmap](http://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [MCP GitHub](https://github.com/modelcontextprotocol/modelcontextprotocol)
- [Agent Interoperability Protocols Survey (arXiv 2505.02279)](https://arxiv.org/html/2505.02279v1)
- [Google A2A Protocol](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [A2A Protocol Spec](https://a2a-protocol.org/latest/specification/)
- [IETF Agentic AI Standards](https://www.ietf.org/blog/agentic-ai-standards/)
- [GitHub Copilot Custom Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Cursor Rules](https://docs.cursor.com/context/rules-for-ai)
- [Windsurf Rules](https://docs.windsurf.com/windsurf/cascade/workflows)
- [Aider Conventions](https://aider.chat/docs/usage/conventions.html)
- [Amazon Q Developer Custom Agents](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-custom-agents.html)
- [Cline .clinerules](https://cline.bot/blog/clinerules-version-controlled-shareable-and-ai-editable-instructions)
- [Gemini CLI GEMINI.md](https://geminicli.com/docs/cli/gemini-md/)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)
- [InfoQ: AGENTS.md Emerges as Open Standard](https://www.infoq.com/news/2025/08/agents-md/)
- [Claude Code AGENTS.md feature request #6235](https://github.com/anthropics/claude-code/issues/6235)
- [Claude Code AGENTS.md feature request #31005](https://github.com/anthropics/claude-code/issues/31005)

## Known Issues / Caveats

1. **Claude Code AGENTS.md support is uncertain.** The most capable runtime has not committed to AGENTS.md. If Anthropic adds support, Option D becomes strictly better. If not, the AGENTS.md export still covers all other runtimes.

2. **MCP enforcement adds operational complexity.** An MCP server is a running process. Users who currently enjoy dev-team as static file installation would need to run a server. This could be mitigated by auto-starting the MCP server via runtime config.

3. **Hook semantics differ between runtimes.** Claude Code's 12-event model is richer than Codex CLI's 5-event beta. A canonical hook format must define a common event vocabulary with runtime-specific mappings.

4. **Runtime format churn is real.** Cursor and Windsurf both deprecated their original formats within months. Adapters for non-standard formats will require maintenance as formats evolve.

5. **Multi-agent portability is 12+ months away.** MCP's agent-to-agent communication is on the 2026 roadmap but not yet specified. dev-team's multi-agent orchestration will remain Claude Code-exclusive in the near term.

6. **Amazon Q Developer data is sparse.** The JSON configuration format is documented but not all capabilities could be verified through public documentation. The hooks and MCP support claims need hands-on verification.

## Confidence Level

**Medium-High**

The instruction layer (AGENTS.md) and tool integration layer (MCP) are well-documented with clear adoption data. The runtime capability matrix is based on official documentation for all nine runtimes. The architectural recommendation follows established patterns (adapter, facade).

Confidence would increase to High with:

- Hands-on testing of Codex CLI hooks and skills (to validate adapter feasibility)
- Confirmation of Claude Code's stance on AGENTS.md
- Prototype of the MCP enforcement server (to validate the hybrid approach)
- Amazon Q Developer hands-on validation

---

## Recommended Actions

- **Title**: Define canonical agent definition format (superset of AGENTS.md)
  **Severity**: P1
  **Files affected**: `src/`, `templates/`, new `src/formats/canonical.ts`
  **Scope**: L — requires designing the canonical schema, migrating existing agent definitions, and building the core abstraction layer

- **Title**: Add AGENTS.md export adapter to `dev-team init`
  **Severity**: P1
  **Files affected**: `src/init.ts`, new `src/adapters/agents-md.ts`, `templates/`
  **Scope**: M — generate AGENTS.md from existing agent definitions during init, giving immediate 20+ runtime reach

- **Title**: Build dev-team MCP enforcement server prototype
  **Severity**: P1
  **Files affected**: new `src/mcp/`, `templates/`
  **Scope**: L — expose review gates, hook logic, and skill execution as MCP tools for runtimes without native hooks

- **Title**: Build Codex CLI adapter (hooks.json + .agents/skills/)
  **Severity**: P2
  **Files affected**: new `src/adapters/codex.ts`
  **Scope**: M — Codex CLI is the closest runtime to Claude Code in capability, making it the highest-value second adapter

- **Title**: Build GitHub Copilot adapter (.instructions.md files)
  **Severity**: P2
  **Files affected**: new `src/adapters/copilot.ts`
  **Scope**: S — Copilot's format is simpler (instructions only), making the adapter straightforward

- **Title**: Build Cursor/Windsurf adapters (.cursor/rules/, .windsurf/rules/)
  **Severity**: P2
  **Files affected**: new `src/adapters/cursor.ts`, `src/adapters/windsurf.ts`
  **Scope**: S — instruction-only adapters with path-scoped rule support

- **Title**: Track Claude Code AGENTS.md adoption status
  **Severity**: P2
  **Files affected**: none (monitoring)
  **Scope**: S — watch anthropics/claude-code#6235 and #31005 for movement; adjust adapter strategy if adopted

- **Title**: Evaluate Codex CLI hooks and skills hands-on for adapter feasibility
  **Severity**: P2
  **Files affected**: `docs/research/`
  **Scope**: S — hands-on validation of the Codex CLI beta hook system and skill format to confirm adapter feasibility
