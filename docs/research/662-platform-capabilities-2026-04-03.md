# Research Brief: Platform Capabilities and Integration

**Issues:** #662, #603, #607
**Date:** 2026-04-02
**Researcher:** Turing

---

## Question

Three interrelated questions:

1. **#662 — Claude Code built-in capabilities:** What tools, commands, hooks, skills, and agent coordination primitives does Claude Code provide natively? Where does dev-team reimplement existing platform functionality?
2. **#603 — Hook patterns vs permission model:** Do dev-team hooks duplicate or conflict with the platform's permission/validation layers?
3. **#607 — Ultraplan integration:** Is Ultraplan available and does it improve task decomposition?

---

## 1. Claude Code Built-in Capabilities Inventory

### 1.1 Internal Tools

| Tool | Category | Permission Required | Notes |
|------|----------|-------------------|-------|
| `Read` | File I/O | No | Read files, images, PDFs, notebooks |
| `Write` | File I/O | Yes | Create or overwrite files |
| `Edit` | File I/O | Yes | Targeted string replacements |
| `NotebookEdit` | File I/O | Yes | Jupyter cell editing |
| `Glob` | Search | No | File pattern matching |
| `Grep` | Search | No | Content search (ripgrep-based) |
| `Bash` | Execution | Yes | Shell commands with sandbox support |
| `PowerShell` | Execution | Yes | Windows-only, opt-in preview |
| `WebFetch` | Network | Yes | URL fetching with AI summarization |
| `WebSearch` | Network | Yes | Web search |
| `Agent` | Orchestration | No | Spawn subagents |
| `TeamCreate` | Orchestration | No | Create agent teams (experimental) |
| `TeamDelete` | Orchestration | No | Disband agent teams |
| `SendMessage` | Orchestration | No | Inter-agent messaging |
| `TaskCreate` | Task mgmt | No | Create tasks |
| `TaskUpdate` | Task mgmt | No | Update task status/dependencies |
| `TaskList` | Task mgmt | No | List all tasks |
| `TaskGet` | Task mgmt | No | Get task details |
| `TaskStop` | Task mgmt | No | Kill background task |
| `TodoWrite` | Task mgmt | No | Non-interactive task checklist |
| `Skill` | Skills | Yes | Execute a skill |
| `CronCreate` | Scheduling | No | Session-scoped scheduled prompts |
| `CronDelete` | Scheduling | No | Cancel scheduled task |
| `CronList` | Scheduling | No | List scheduled tasks |
| `EnterPlanMode` | Planning | No | Switch to plan mode |
| `ExitPlanMode` | Planning | Yes | Present plan for approval |
| `EnterWorktree` | Isolation | No | Create git worktree |
| `ExitWorktree` | Isolation | No | Leave worktree |
| `AskUserQuestion` | UX | No | Multi-choice user prompts |
| `LSP` | Code intel | No | Language server integration |
| `ToolSearch` | Discovery | No | Search deferred MCP tools |
| `ListMcpResourcesTool` | MCP | No | List MCP resources |
| `ReadMcpResourceTool` | MCP | No | Read MCP resource by URI |

### 1.2 Built-in Slash Commands

55+ built-in commands. Key ones relevant to dev-team:

| Command | Purpose | Overlap with dev-team? |
|---------|---------|----------------------|
| `/agents` | Manage agent configurations | Partial — dev-team agents are file-based |
| `/batch <instruction>` | Parallel codebase changes via worktrees | **Yes** — overlaps with `dev-team-task` parallel mode |
| `/compact` | Context compaction | No |
| `/context` | Visualize context usage | No |
| `/diff` | Interactive diff viewer | No |
| `/effort` | Set model effort level | No |
| `/hooks` | View hook configurations | No |
| `/init` | Initialize project CLAUDE.md | Partial — `dev-team init` does more |
| `/loop <interval> <prompt>` | Repeat prompt on schedule | No |
| `/permissions` | Manage allow/ask/deny rules | No |
| `/plan` | Enter plan mode | Partial — dev-team task skill has its own planning |
| `/pr-comments` | Fetch GitHub PR comments | No |
| `/schedule` | Cloud scheduled tasks | No |
| `/security-review` | Security review of branch changes | **Yes** — overlaps with Szabo's function |
| `/simplify` | Multi-agent code simplification | Partial — spawns 3 review agents |
| `/skills` | List available skills | No |

### 1.3 Bundled Skills

| Skill | Purpose | Overlap with dev-team? |
|-------|---------|----------------------|
| `/batch` | Parallel codebase changes, 5-30 units, worktree isolation, PRs | **High** — overlaps with task skill parallel mode |
| `/claude-api` | API reference for Claude SDK | No |
| `/debug` | Enable debug logging and troubleshoot | No |
| `/loop` | Repeat prompt on interval | No |
| `/simplify` | Multi-agent code quality review | **Moderate** — 3 parallel reviewers, similar to `dev-team-review` |

### 1.4 Hook System (30 event types)

Complete list of hook event types:

| Event | Blocking? | dev-team uses? |
|-------|-----------|---------------|
| `SessionStart` | No | No |
| `InstructionsLoaded` | No | No |
| `UserPromptSubmit` | Yes | No |
| `PreToolUse` | Yes | **Yes** — safety-guard, pre-commit-lint, review-gate, tdd-enforce |
| `PermissionRequest` | Yes | No |
| `PermissionDenied` | No | No |
| `PostToolUse` | Yes | **Yes** — post-change-review, tdd-enforce, watch-list |
| `PostToolUseFailure` | No | No |
| `Notification` | No | No |
| `SubagentStart` | No | No |
| `SubagentStop` | Yes | No |
| `TaskCreated` | Yes | No |
| `TaskCompleted` | Yes | No |
| `Stop` | Yes | No |
| `StopFailure` | No | No |
| `TeammateIdle` | Yes | No |
| `ConfigChange` | Yes | No |
| `CwdChanged` | No | No |
| `FileChanged` | No | No |
| `WorktreeCreate` | Yes | **Yes** — worktree-create |
| `WorktreeRemove` | No | **Yes** — worktree-remove |
| `PreCompact` | No | No |
| `PostCompact` | No | No |
| `Elicitation` | Yes | No |
| `ElicitationResult` | Yes | No |
| `SessionEnd` | No | No |

**Unused hook events of interest:**
- `TaskCreated` / `TaskCompleted` — could enforce quality gates on task lifecycle
- `SubagentStart` / `SubagentStop` — could inject context or validate subagent work
- `TeammateIdle` — could keep teammates working (quality enforcement)
- `Stop` — could run post-turn validation
- `UserPromptSubmit` — could validate user prompts before processing

Hook handler types: **command** (shell script), **http** (webhook), **prompt** (AI-evaluated), **agent** (full agent evaluation). dev-team only uses **command** hooks. The **prompt** and **agent** hook types are particularly interesting — they could replace some of the review-gate logic with AI-native evaluation rather than regex pattern matching.

### 1.5 Subagent System

Built-in subagent types:
- **Explore** — fast, read-only (Haiku model), file discovery/search
- **Plan** — research agent for plan mode (inherits model)
- **general-purpose** — full capabilities (inherits model)
- **statusline-setup** — Sonnet, `/statusline` config
- **Claude Code Guide** — Haiku, help questions

Custom subagent frontmatter fields: `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, `initialPrompt`.

Key capability: **Subagents can have scoped hooks** defined in their frontmatter. This means dev-team agent definitions could carry their own enforcement hooks.

### 1.6 Agent Teams (Experimental)

Coordination primitives:
- `TeamCreate` — spawn team with multiple teammates
- `TeamDelete` — disband team
- `SendMessage` — inter-agent messaging (also resumes stopped subagents)
- Shared task list (TaskCreate/TaskUpdate/TaskList/TaskGet)
- Task dependencies with automatic unblocking
- File-locked task claiming (no race conditions)
- `TeammateIdle` hook for quality gates

Limitations: experimental, no session resumption with in-process teammates, one team per session, no nested teams, lead is fixed.

### 1.7 Skills System

Frontmatter fields: `name`, `description`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`.

Key features:
- `context: fork` — run skill in isolated subagent
- `agent` field — specify which subagent type executes the skill
- Scoped hooks in skill frontmatter
- Dynamic context injection via `` !`command` `` syntax
- `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N` substitutions
- `${CLAUDE_SKILL_DIR}`, `${CLAUDE_SESSION_ID}` variables
- Plugin distribution for cross-project sharing
- Auto-discovery from nested directories (monorepo support)

---

## 2. Gap Analysis: dev-team vs Platform (#662)

### 2.1 What dev-team reimplements

| dev-team Feature | Platform Equivalent | Overlap Level | Notes |
|-----------------|---------------------|---------------|-------|
| Safety guard hook | Platform sandbox + permission rules | **High** | sandbox blocks filesystem/network at OS level; permission deny rules block tools. Safety guard adds heuristic layer on top — the hook itself says "NOT a security boundary" |
| Task skill parallel mode | `/batch` bundled skill | **Moderate** | `/batch` does 5-30 unit decomposition with worktree isolation + PRs. Task skill adds adversarial review gates |
| Agent spawning via hooks | `SubagentStart`/`SubagentStop` hooks | **Low** | dev-team post-change-review outputs "spawn these agents" as text; platform hooks could intercept and auto-spawn |
| Review orchestration | `/simplify` bundled skill | **Low** | `/simplify` spawns 3 agents for code quality; dev-team review is domain-specific (security, quality, tooling) |
| `/security-review` | Built-in `/security-review` | **High** | Platform now has a native security review command |
| Task decomposition | Plan mode + `/batch` | **Moderate** | Platform has plan mode for exploration + batch for parallel decomposition |
| Memory system | Built-in agent memory (`memory` field) | **Moderate** | Platform supports `user`, `project`, `local` memory scopes per agent. dev-team has its own 2-tier architecture |

### 2.2 What dev-team adds beyond the platform

| dev-team Feature | Platform Gap Filled |
|-----------------|-------------------|
| Adversarial review loop | Platform has no iterative review-fix cycle |
| Finding classification ([DEFECT]/[RISK]/[QUESTION]/[SUGGESTION]) | No built-in classification vocabulary |
| Review evidence gate (commit-time enforcement) | No built-in "must review before commit" |
| TDD enforcement | No built-in test-first enforcement |
| Pre-commit lint hook | Platform sandbox doesn't enforce lint |
| Agent-patterns.json (file-to-agent mapping) | No built-in file-pattern-to-agent routing |
| Watch list (configurable pattern matching) | No built-in configurable file watchers |
| Memory formation gates (Borges) | No built-in memory quality enforcement |
| Metrics collection | No built-in process metrics |
| Multi-runtime adapter system | Platform is Claude Code only |

### 2.3 Where dev-team could simplify

1. **Safety guard** — The hook acknowledges it's "NOT a security boundary." With the sandbox and permission deny rules, the safety guard's value is reduced to catching "common foot-guns." Consider: is the maintenance cost justified given the platform handles the hard security?

2. **Security review** — Platform now has `/security-review`. Szabo adds domain-specific depth, but for projects without Szabo customization, the built-in command may suffice.

3. **Parallel task decomposition** — `/batch` handles worktree isolation, decomposition, and PR creation natively. The task skill's unique value is the adversarial review gates, not the parallelization.

4. **Agent memory** — Platform memory (`memory: project` in agent frontmatter) provides the same persistence as dev-team's Tier 2 (`.claude/agent-memory/`). The memory path is identical. dev-team's Tier 1 (learnings via rules) has no platform equivalent — this is genuinely additive.

5. **Scoped hooks in agents** — Agent definitions can carry their own hooks. dev-team could move some enforcement closer to agents rather than relying on global hooks.

---

## 3. Hook Patterns vs Permission Model (#603)

### 3.1 Platform Permission Layers

The platform has a multi-layered validation architecture:

1. **Permission rules** (deny > ask > allow, evaluated in order)
2. **Permission modes** (default, acceptEdits, plan, auto, dontAsk, bypassPermissions)
3. **Auto mode classifier** (AI classifier model evaluating each action)
4. **Sandbox** (OS-level filesystem/network isolation for Bash)
5. **Protected directory enforcement** (.git, .claude, .vscode, .idea, .husky always prompt)
6. **Hook-based validation** (PreToolUse, PermissionRequest hooks)

### 3.2 Audit of dev-team Hooks

| Hook | Event | What it does | Conflict with platform? | Duplication? |
|------|-------|-------------|------------------------|-------------|
| **safety-guard** | PreToolUse(Bash) | Blocks rm -rf, force push main, DROP TABLE, chmod 777, curl\|bash | **No conflict.** Complements sandbox. | **Partial** — `curl\|bash` is blocked by auto mode classifier by default. Force push to main is also blocked by auto mode. Sandbox blocks filesystem. |
| **pre-commit-lint** | PreToolUse(Bash) | Runs lint+format on `git commit` | **No conflict.** Additive enforcement. | **None** — platform has no lint enforcement. |
| **review-gate** | PreToolUse(Bash) | Blocks `git commit` without review evidence | **No conflict.** Additive enforcement. | **None** — platform has no review evidence enforcement. |
| **tdd-enforce** | PostToolUse(Edit/Write) | Blocks impl files without test files | **No conflict.** Additive enforcement. | **None** — platform has no TDD enforcement. |
| **post-change-review** | PostToolUse(Edit/Write) | Outputs agent spawn recommendations | **No conflict.** Advisory only (exit 0). | **None** — platform has no file-pattern-to-agent routing. |
| **watch-list** | PostToolUse(Edit/Write) | Outputs spawn recommendations from config | **No conflict.** Advisory only (exit 0). | **None** — platform has no configurable watch lists. |
| **pre-commit-gate** | PreToolUse(Bash) | Memory freshness gate on `git commit` | **No conflict.** Additive enforcement. | **None** — platform has no memory enforcement. |
| **worktree-create** | WorktreeCreate | Custom worktree creation logic | **No conflict.** Uses the designated hook event. | **None** — this IS the platform integration point. |
| **worktree-remove** | WorktreeRemove | Custom worktree cleanup | **No conflict.** Uses the designated hook event. | **None** — this IS the platform integration point. |
| **agent-teams-guide** | PreToolUse(Agent) | Guides agent team usage | **No conflict.** Advisory context injection. | **None** |

### 3.3 Potential Conflicts

**Auto mode interaction:** When auto mode is enabled, it drops blanket allow rules like `Bash(*)` and subjects commands to classifier evaluation. dev-team hooks run *before* auto mode evaluation (PreToolUse fires before permission evaluation). This means:
- dev-team hooks that **block** (exit 2) take precedence over auto mode — the command never reaches the classifier
- dev-team hooks that **allow** (exit 0 with `permissionDecision: "allow"`) can be overridden by the classifier if it disagrees
- **Risk:** If a user enables auto mode, the classifier may block commands that dev-team hooks intended to allow. This is defense-in-depth (good), but could cause unexpected blocks in auto mode.

**Permission deny rule interaction:** A deny rule in managed settings blocks a tool before hooks run. If an organization denies `Bash(git push *)` via managed settings, dev-team's safety guard never sees the command. This is correct behavior but worth documenting.

### 3.4 Assessment

**No conflicts found.** All dev-team hooks are either:
- Additive enforcement (pre-commit-lint, review-gate, tdd-enforce, pre-commit-gate)
- Advisory context (post-change-review, watch-list, agent-teams-guide)
- Platform integration points (worktree-create, worktree-remove)
- Complementary heuristics (safety-guard)

The safety-guard hook has the most overlap with platform capabilities but doesn't conflict — it runs earlier in the pipeline and catches different patterns than the sandbox or auto mode classifier.

---

## 4. Ultraplan Integration (#607)

### 4.1 What is Ultraplan?

Based on investigation:

- **Not documented in official Claude Code docs.** The official documentation at code.claude.com makes no mention of "ultraplan."
- Third-party sources (markdown.engineering, Medium articles) describe it as a feature that spawns a cloud-based Claude Code session (Opus model, 30-minute window) when the keyword "ultraplan" appears in a prompt.
- The feature appears to be triggered similarly to "ultrathink" — a keyword that sets extended thinking to high effort.
- **Official docs confirm `ultrathink`** as a keyword that "sets effort to high for that turn on Opus 4.6 and Sonnet 4.6" (source: code.claude.com/docs/en/common-workflows).
- `ultraplan` is NOT confirmed in official documentation.

### 4.2 Current dev-team Task Decomposition

The `dev-team-task` skill uses a four-step model:
1. Implementation (via `dev-team-implement` with Brooks pre-assessment)
2. Review (via `dev-team-review` with multi-agent parallel review)
3. Fix cycle (iterate until no [DEFECT] findings)
4. Extraction (via `dev-team-extract` for memory/metrics)

The `dev-team-implement` skill handles:
- Agent selection based on task domain
- Brooks pre-assessment for complexity
- Feature branch creation
- Validation

### 4.3 Recommendation

**Do not integrate ultraplan.** Reasons:
1. It is not documented in official Anthropic documentation — UNVERIFIED capability
2. Even if it exists, it spawns a remote session — this conflicts with dev-team's local-first model
3. The `/batch` bundled skill provides similar parallel decomposition with official support
4. dev-team's value is in the adversarial review loop, not in task decomposition mechanics

**Alternative:** Consider whether `/batch` (officially supported) could complement dev-team's task decomposition for the initial parallel work phase, with dev-team's review gates applied afterward.

---

## Evidence

| Claim | Source URL | Verified |
|-------|-----------|----------|
| Claude Code has 30+ internal tools including Agent, TeamCreate, SendMessage, TaskCreate/Update/List/Get | https://code.claude.com/docs/en/tools-reference | yes |
| 30 hook event types: SessionStart through SessionEnd | https://code.claude.com/docs/en/hooks | yes |
| 4 hook handler types: command, http, prompt, agent | https://code.claude.com/docs/en/hooks | yes |
| Built-in subagent types: Explore, Plan, general-purpose | https://code.claude.com/docs/en/sub-agents | yes |
| Agent teams are experimental, require CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS | https://code.claude.com/docs/en/agent-teams | yes |
| `/batch` bundled skill decomposes into 5-30 units with worktree isolation | https://code.claude.com/docs/en/skills#bundled-skills | yes |
| `/simplify` spawns 3 parallel review agents | https://code.claude.com/docs/en/skills#bundled-skills | yes |
| `/security-review` built-in command analyzes branch changes for vulnerabilities | https://code.claude.com/docs/en/commands | yes |
| Auto mode classifier blocks curl\|bash, force push, production deploys by default | https://code.claude.com/docs/en/permission-modes | yes |
| Sandbox provides OS-level filesystem and network isolation for Bash | https://code.claude.com/docs/en/permissions | yes |
| Permission rules evaluated deny > ask > allow | https://code.claude.com/docs/en/permissions | yes |
| Subagent frontmatter supports `hooks` field for scoped lifecycle hooks | https://code.claude.com/docs/en/sub-agents | yes |
| Skill frontmatter supports `hooks` field for scoped hooks | https://code.claude.com/docs/en/skills | yes |
| `context: fork` runs skill in isolated subagent | https://code.claude.com/docs/en/skills#run-skills-in-a-subagent | yes |
| `ultrathink` keyword sets effort to high for that turn | https://code.claude.com/docs/en/common-workflows | yes |
| `ultraplan` as an official feature | N/A | **no — UNVERIFIED** |
| Agent memory supports user/project/local scopes via `memory` frontmatter | https://code.claude.com/docs/en/sub-agents#enable-persistent-memory | yes |
| PreToolUse hooks fire before permission evaluation | https://code.claude.com/docs/en/hooks | yes |
| 55+ built-in slash commands | https://code.claude.com/docs/en/commands | yes |
| TaskCreated/TaskCompleted hooks can enforce quality gates | https://code.claude.com/docs/en/agent-teams | yes |
| TeammateIdle hook can keep teammates working | https://code.claude.com/docs/en/agent-teams | yes |
| Skills support `paths` field for file-pattern activation | https://code.claude.com/docs/en/skills | yes |

---

## Known Issues / Caveats

1. **Agent teams are experimental.** Building on TeamCreate/SendMessage is risky — the API could change. dev-team already uses it successfully but should monitor for breaking changes.

2. **Auto mode interaction is untested.** No dev-team user has reported running with auto mode enabled. The interaction between dev-team hooks and the auto mode classifier needs testing.

3. **`/batch` is not customizable.** It always creates PRs and uses its own decomposition logic. dev-team cannot inject adversarial review into `/batch`'s workflow.

4. **Platform `/security-review` scope is unclear.** It "analyzes pending changes on the current branch for security vulnerabilities" — unclear whether it matches Szabo's depth on auth, injection, data exposure patterns.

5. **Hook handler types `prompt` and `agent` are powerful but untested by dev-team.** These could replace regex-based validation in review-gate with AI-native evaluation, but would add latency and token cost.

---

## Confidence Level

**High** for capability inventory (#662) — all claims verified against official docs.

**High** for hook audit (#603) — all hooks reviewed against platform permission layers, no conflicts found.

**Medium** for Ultraplan (#607) — cannot confirm or deny existence beyond third-party reports. Recommendation to skip is high-confidence regardless.

Would increase to **High** across all areas with:
- Testing auto mode + dev-team hooks interaction
- Testing `/batch` as complement to dev-team task decomposition
- Comparing `/security-review` output quality against Szabo

---

## Recommended Actions

- **Title**: Evaluate `/batch` as complement to dev-team parallel task decomposition
  **Severity**: P2
  **Files affected**: `templates/skills/dev-team-task/SKILL.md`
  **Scope**: M

- **Title**: Test auto mode + dev-team hooks interaction
  **Severity**: P1
  **Files affected**: All `.dev-team/hooks/` scripts
  **Scope**: M

- **Title**: Assess whether safety-guard hook is still justified given sandbox + auto mode
  **Severity**: P2
  **Files affected**: `templates/hooks/dev-team-safety-guard.js`
  **Scope**: S

- **Title**: Evaluate platform `/security-review` vs Szabo agent depth
  **Severity**: P2
  **Files affected**: `.claude/agents/dev-team-szabo.agent.md`
  **Scope**: S

- **Title**: Explore `prompt` and `agent` hook types for AI-native review gate validation
  **Severity**: P2
  **Files affected**: `templates/hooks/dev-team-review-gate.js`
  **Scope**: M

- **Title**: Leverage TaskCreated/TaskCompleted hooks for quality enforcement in agent teams
  **Severity**: P2
  **Files affected**: `templates/hooks/`, `.claude/settings.json` template
  **Scope**: M

- **Title**: Add scoped hooks to agent definitions for agent-specific enforcement
  **Severity**: P2
  **Files affected**: `templates/agents/*.agent.md`
  **Scope**: L

- **Title**: Document auto mode interaction in dev-team README/CLAUDE.md
  **Severity**: P1
  **Files affected**: `templates/CLAUDE.md`, README
  **Scope**: S

- **Title**: Close #607 — Ultraplan is UNVERIFIED, not suitable for integration
  **Severity**: P2
  **Files affected**: None
  **Scope**: S
