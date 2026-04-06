# Architecture

High-level guide to dev-team's architecture. For detailed decisions, see individual [ADRs](docs/adr/).

## System Overview

dev-team is a CLI tool (`npx dev-team init`) that installs adversarial AI agents, hooks, and skills into any project. The installed components enforce quality through productive friction — agents implement, review, and challenge each other's work.

```mermaid
graph TB
    subgraph "dev-team package"
        CLI["bin/dev-team.js<br/>(CLI entry point)"]
        SRC["src/<br/>(TypeScript source)"]
        TPL["templates/<br/>(agents, hooks, skills, CLAUDE.md)"]
    end

    subgraph "Target project (after init/update)"
        CLAUDE_DIR[".claude/<br/>agents/ | rules/ | settings.json"]
        DEV_TEAM_DIR[".dev-team/<br/>hooks/ | config.json | metrics.md"]
        CLAUDE_MD["CLAUDE.md<br/>(project instructions)"]
    end

    CLI --> SRC
    SRC -->|"init / update"| TPL
    TPL -->|"copy + adapt"| CLAUDE_DIR
    TPL -->|"copy"| DEV_TEAM_DIR
    TPL -->|"merge"| CLAUDE_MD
```

The `init` command copies template files into the target project. The `update` command refreshes framework-managed files (`.dev-team/`) while preserving project-specific customizations (`.claude/hooks/`, `.claude/skills/`, `.claude/rules/`). Settings in `.claude/settings.json` are merged additively — new hooks are added but user entries are never removed.

## Agent Interaction Model

Thirteen agents collaborate through an orchestrated adversarial loop. Drucker (the orchestrator) delegates work to implementing agents, then spawns reviewers who challenge the implementation with classified findings.

```mermaid
graph TB
    Human((Human))

    subgraph "Orchestration"
        Drucker["Drucker<br/>(orchestrator)"]
    end

    subgraph "Research"
        Turing["Turing<br/>(researcher)"]
    end

    subgraph "Implementing agents"
        Voss["Voss<br/>(backend)"]
        Hamilton["Hamilton<br/>(infrastructure)"]
        Mori["Mori<br/>(frontend)"]
        Deming["Deming<br/>(tooling)"]
        Tufte["Tufte<br/>(documentation)"]
        Conway["Conway<br/>(release)"]
    end

    subgraph "Reviewing agents"
        Szabo["Szabo<br/>(security)"]
        Knuth["Knuth<br/>(correctness)"]
        Brooks["Brooks<br/>(architecture)"]
        Rams["Rams<br/>(design system)"]
    end

    subgraph "Memory"
        Borges["Borges<br/>(librarian)"]
    end

    Human -->|"task"| Drucker
    Drucker -->|"research brief<br/>(sequential, pre-implementation)"| Turing
    Turing -->|"findings"| Drucker
    Drucker -->|"pre-assessment"| Brooks
    Brooks -->|"ADR needed? complexity?"| Drucker
    Drucker -->|"delegate"| Voss & Hamilton & Mori & Deming & Tufte & Conway

    Voss & Hamilton & Mori & Deming & Tufte & Conway -->|"implementation"| Drucker
    Drucker -->|"review wave<br/>(parallel)"| Szabo & Knuth & Brooks & Rams

    Szabo & Knuth & Brooks & Rams -->|"classified findings"| Drucker
    Drucker -->|"DEFECT → fix"| Voss & Hamilton & Mori & Deming & Tufte & Conway
    Drucker -->|"advisory"| Human
    Drucker -->|"extract"| Borges
    Borges -->|"memory updates"| Drucker
    Drucker -->|"summary"| Human
```

### Finding classification

Reviewers classify findings to separate blocking issues from advisory feedback:

| Classification | Effect |
|---|---|
| `[DEFECT]` | Blocks progress — must be fixed before merge |
| `[RISK]` | Advisory — potential issue, reported to human |
| `[QUESTION]` | Advisory — needs clarification |
| `[SUGGESTION]` | Advisory — improvement idea |

When agents disagree, each side gets one exchange. If unresolved, the human decides. Drucker runs a judge filtering pass to remove contradictions with existing ADRs, deduplicate across reviewers, and validate that DEFECTs include concrete reproduction scenarios.

## Hook Execution Flow

Hooks fire automatically during Claude Code tool use. They are wired in `.claude/settings.json` and execute JavaScript scripts from `.dev-team/hooks/`.

```mermaid
graph LR
    subgraph "PreToolUse (before tool runs)"
        direction TB
        Bash_trigger["Bash tool invoked"]
        SG["safety-guard<br/>blocks dangerous commands"]
        PCL["pre-commit-lint<br/>oxlint/oxfmt on commit"]
        RG["review-gate<br/>requires review evidence"]
        Bash_trigger --> SG --> PCL --> RG
    end

    subgraph "PostToolUse (after tool runs)"
        direction TB
        Edit_trigger["Edit/Write tool completes"]
        PCR["post-change-review<br/>spawn reviewer agents"]
        TDD["tdd-enforce<br/>require tests for code"]
        WL["watch-list<br/>flag watched file changes"]
        Edit_trigger --> PCR --> TDD --> WL
    end

    subgraph "Lifecycle hooks"
        direction TB
        WC["WorktreeCreate<br/>setup new worktree"]
        WR["WorktreeRemove<br/>cleanup worktree"]
        TC["TaskCompleted<br/>pre-commit gate"]
        AG["Agent tool<br/>agent-teams-guide"]
    end
```

**PreToolUse hooks** intercept tool calls before execution. The safety guard blocks destructive commands (`rm -rf`, `git push --force`). The review gate blocks commits that lack review evidence — enforcing the adversarial loop at commit time (ADR-029).

**PostToolUse hooks** fire after file changes. The post-change-review hook matches changed files against patterns in `agent-patterns.json` and emits `ACTION REQUIRED` directives to spawn the appropriate reviewer agents. The watch-list hook flags changes to sensitive files.

**Lifecycle hooks** handle worktree creation/removal for parallel agent isolation and the pre-commit gate for memory update verification.

## Skill Composition

Skills are user-invocable workflows defined in Markdown (`SKILL.md`). Orchestration skills compose other skills via the `--embedded` flag, which produces compact output suitable for skill-to-skill invocation (ADR-035).

```mermaid
graph TB
    Task["dev-team-task<br/>(orchestration loop)"]

    Implement["dev-team-implement<br/>(agent selection, branch, PR)"]
    Review["dev-team-review<br/>(parallel reviewer wave)"]
    Merge["dev-team-merge<br/>(CI wait, thread resolution, auto-merge)"]
    Extract["dev-team-extract<br/>(Borges memory + metrics)"]

    Task -->|"Step 1"| Implement
    Task -->|"Step 2"| Review
    Review -->|"DEFECT found"| Implement
    Task -->|"Step 3"| Merge
    Task -->|"Step 4"| Extract

    subgraph "Standalone skills"
        Challenge["dev-team-challenge<br/>(critical examination)"]
        Audit["dev-team-audit<br/>(full codebase audit)"]
        Retro["dev-team-retro<br/>(knowledge base health)"]
        Scorecard["dev-team-scorecard<br/>(process conformance)"]
    end

    Audit -->|"at end"| Extract
    Retro -->|"at end"| Extract
```

The task skill implements a four-step model per branch: **Implement** (agent works on branch, creates PR) **-> Review** (adversarial review, defect routing loop) **-> Merge** (CI verification, thread resolution) **-> Extract** (Borges memory extraction). Review intensity adapts to complexity — SIMPLE tasks get LIGHT (advisory-only) reviews, COMPLEX tasks get FULL (blocking DEFECT) reviews.

## Memory Architecture

Two-tier memory system ensures learnings are shared across all agents and sessions while allowing per-agent calibration.

```mermaid
graph TB
    subgraph "Tier 1 — Shared team memory"
        Learnings[".claude/rules/dev-team-learnings.md<br/>Project facts, process rules,<br/>overruled challenges"]
        Process[".claude/rules/dev-team-process.md<br/>Workflow, branching, integration"]
    end

    subgraph "Tier 2 — Agent calibration"
        SzaboMem[".claude/agent-memory/szabo/MEMORY.md"]
        KnuthMem[".claude/agent-memory/knuth/MEMORY.md"]
        BorgesMem[".claude/agent-memory/borges/MEMORY.md"]
        OtherMem["...other agents..."]
    end

    subgraph "Formal decisions"
        ADRs["docs/adr/<br/>Architecture Decision Records"]
    end

    Rules["Claude Code rules engine"]

    Learnings -->|"auto-loaded"| Rules
    Process -->|"auto-loaded"| Rules
    Rules -->|"injected into context"| AllAgents["All agents + subagents"]

    Borges["Borges<br/>(librarian)"] -->|"writes"| Learnings
    Borges -->|"writes"| SzaboMem & KnuthMem & BorgesMem & OtherMem
    Borges -->|"temporal decay<br/>30d flag, 90d archive"| SzaboMem & KnuthMem & BorgesMem & OtherMem
```

| Tier | Location | Scope | Loaded by |
|---|---|---|---|
| Tier 1 | `.claude/rules/` | All agents, all sessions | Claude Code rules engine (automatic) |
| Tier 2 | `.claude/agent-memory/<agent>/` | Per-agent calibration | Each agent at session start |
| ADRs | `docs/adr/` | Formal decisions | Agents when reviewing related areas |
| Machine-local | `~/.claude/projects/` | User-specific preferences only | Claude Code (automatic) |

Borges runs at the end of every workflow (`dev-team-extract`). It evaluates memory freshness via `Last-verified` dates, merges duplicates, supersedes contradictions, and generates calibration rules when 3+ findings on the same tag are overruled.

## File Layout

```
dev-team/
├── bin/                          # CLI entry point
│   └── dev-team.js
├── src/                          # TypeScript source → dist/
│   ├── formats/
│   │   ├── canonical.ts          # Canonical agent definition schema
│   │   └── adapters.ts           # Multi-runtime adapter registry
│   └── ...
├── templates/                    # Shipped to target projects
│   ├── agents/                   # 13 agent definitions (.md)
│   │   └── SHARED.md             # Shared protocol (all agents)
│   ├── hooks/                    # Hook scripts (.js)
│   │   ├── dev-team-safety-guard.js
│   │   ├── dev-team-review-gate.js
│   │   ├── dev-team-tdd-enforce.js
│   │   └── ...
│   ├── skills/                   # Skill definitions
│   │   ├── dev-team-task/
│   │   ├── dev-team-implement/
│   │   ├── dev-team-review/
│   │   ├── dev-team-merge/
│   │   ├── dev-team-extract/
│   │   └── ...
│   ├── settings.json             # Hook wiring template
│   └── CLAUDE.md                 # CLAUDE.md template
├── docs/adr/                     # Architecture Decision Records
├── tests/                        # Unit, integration, scenario tests
│
│── (Target project after install) ──
├── .claude/                      # Project-specific (preserved on update)
│   ├── agents/                   # Installed agent definitions
│   ├── rules/                    # Auto-loaded by all agents
│   │   ├── dev-team-learnings.md # Tier 1 shared memory
│   │   └── dev-team-process.md   # Workflow configuration
│   ├── agent-memory/             # Tier 2 per-agent calibration
│   ├── hooks/                    # User's custom hooks
│   ├── skills/                   # User's custom skills
│   └── settings.json             # Merged hook wiring
├── .dev-team/                    # Framework-managed (overwritten on update)
│   ├── hooks/                    # Framework hook scripts
│   ├── config.json               # Feature flags
│   └── metrics.md                # Delivery metrics (preserved)
└── CLAUDE.md                     # Project instructions
```

## Multi-runtime Adapter Flow

dev-team defines agents in a canonical Markdown+YAML format. Runtime adapters translate this into each platform's native configuration (ADR-036).

```mermaid
graph LR
    subgraph "Canonical definitions"
        Templates["templates/agents/*.md<br/>(Markdown + YAML frontmatter)"]
    end

    subgraph "Adapter registry (src/formats/)"
        Canon["canonical.ts<br/>parse portable + runtime-specific fields"]
        Adapters["adapters.ts<br/>RuntimeAdapter interface"]
    end

    subgraph "Runtime output"
        Claude[".claude/agents/*.agent.md<br/>(Claude Code — identity transform)"]
        Copilot[".github/copilot/*.md<br/>(GitHub Copilot)"]
        Codex[".codex/agents/*.md<br/>(OpenAI Codex)"]
    end

    Templates --> Canon
    Canon --> Adapters
    Adapters -->|"ClaudeCodeAdapter"| Claude
    Adapters -->|"CopilotAdapter"| Copilot
    Adapters -->|"CodexAdapter"| Codex
```

The canonical schema separates **portable fields** (name, description, instruction body) from **runtime-specific fields** (tools, model, memory). The Claude Code adapter is an identity transform — the canonical format is the Claude Code format. Other adapters map portable fields to their runtime's conventions and ignore unsupported runtime-specific fields. Select runtimes during init with `--runtime claude,copilot`.
