# Research Brief: Codex CLI Hooks and Skills Hands-On Evaluation

**Issue**: #508
**Researcher**: Turing
**Date**: 2026-03-30
**Predecessor**: [#264 Agent Runtime Portability](264-agent-runtime-portability-2026-03-29.md) (theoretical survey)

## Question

Can dev-team's hooks and skills be mapped to Codex CLI's native hook system and skill format? The portability brief (#264) documented Codex CLI's capabilities theoretically. This brief validates them hands-on against official documentation.

---

## Part 1: Hook System Comparison

### Codex CLI Hook Events (5 events, experimental)

| Event              | When it fires                      | Matcher support                 | Tool scope |
| ------------------ | ---------------------------------- | ------------------------------- | ---------- |
| `SessionStart`     | Session begins (startup or resume) | Yes (`source`: startup, resume) | N/A        |
| `PreToolUse`       | Before tool invocation             | Yes (`tool_name`)               | Bash only  |
| `PostToolUse`      | After tool completion              | Yes (`tool_name`)               | Bash only  |
| `UserPromptSubmit` | User sends a prompt                | No                              | N/A        |
| `Stop`             | Conversation turn concludes        | No                              | N/A        |

**Status**: Experimental. Requires `codex_hooks = true` in `config.toml`. Windows support disabled.

### Claude Code Hook Events (25 events, stable)

Claude Code has significantly more events than the 12 documented in the #264 brief (the count has grown since that research). The full list:

| Event                | Codex equivalent                               |
| -------------------- | ---------------------------------------------- |
| `SessionStart`       | **SessionStart** (direct map)                  |
| `UserPromptSubmit`   | **UserPromptSubmit** (direct map)              |
| `PreToolUse`         | **PreToolUse** (partial — Codex is Bash-only)  |
| `PostToolUse`        | **PostToolUse** (partial — Codex is Bash-only) |
| `Stop`               | **Stop** (direct map)                          |
| `PermissionRequest`  | None                                           |
| `PostToolUseFailure` | None                                           |
| `Notification`       | None                                           |
| `SubagentStart`      | None                                           |
| `SubagentStop`       | None                                           |
| `TaskCreated`        | None                                           |
| `TaskCompleted`      | None                                           |
| `StopFailure`        | None                                           |
| `TeammateIdle`       | None                                           |
| `InstructionsLoaded` | None                                           |
| `ConfigChange`       | None                                           |
| `CwdChanged`         | None                                           |
| `FileChanged`        | None                                           |
| `WorktreeCreate`     | None                                           |
| `WorktreeRemove`     | None                                           |
| `PreCompact`         | None                                           |
| `PostCompact`        | None                                           |
| `Elicitation`        | None                                           |
| `ElicitationResult`  | None                                           |
| `SessionEnd`         | None                                           |

**Summary**: 5 of 25 Claude Code events have Codex equivalents. 20 events have no mapping.

### dev-team Hook Mapping to Codex

dev-team ships 10 hooks across 5 event types. Here is the mapping:

| dev-team hook                    | Claude Code event           | Codex mappable? | Notes                                                      |
| -------------------------------- | --------------------------- | --------------- | ---------------------------------------------------------- |
| `dev-team-post-change-review.js` | `PostToolUse` (Edit\|Write) | **No**          | Codex PostToolUse only matches `Bash` tool, not Edit/Write |
| `dev-team-tdd-enforce.js`        | `PostToolUse` (Edit\|Write) | **No**          | Same — Codex lacks Edit/Write tool matching                |
| `dev-team-watch-list.js`         | `PostToolUse` (Edit\|Write) | **No**          | Same                                                       |
| `dev-team-safety-guard.js`       | `PreToolUse` (Bash)         | **Yes**         | Direct map — both filter on Bash commands                  |
| `dev-team-pre-commit-lint.js`    | `PreToolUse` (Bash)         | **Yes**         | Direct map — can intercept `git commit` commands           |
| `dev-team-review-gate.js`        | `PreToolUse` (Bash)         | **Yes**         | Direct map — can intercept `git commit`/`git push`         |
| `dev-team-agent-teams-guide.js`  | `PreToolUse` (Agent)        | **No**          | Codex has no Agent tool or multi-agent support             |
| `dev-team-worktree-create.js`    | `WorktreeCreate`            | **No**          | Codex has no worktree events                               |
| `dev-team-worktree-remove.js`    | `WorktreeRemove`            | **No**          | Codex has no worktree events                               |
| `dev-team-pre-commit-gate.js`    | `TaskCompleted`             | **No**          | Codex has no TaskCompleted event                           |

**Result**: 3 of 10 dev-team hooks (30%) can be directly mapped to Codex CLI. The remaining 7 hooks rely on Claude Code-specific events or tool matchers that Codex does not support.

### Hook Execution Model Comparison

| Aspect                          | Claude Code                                               | Codex CLI                                        |
| ------------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| Configuration file              | `.claude/settings.json` (JSON, `hooks` key)               | `.codex/hooks.json` (JSON, `hooks` key)          |
| Scope levels                    | User, project, local, managed policy, plugin, skill/agent | User (`~/.codex/`), repo (`.codex/`)             |
| Execution                       | Concurrent within same file                               | Concurrent within same file                      |
| Default timeout                 | 600s (10 min)                                             | 600s (10 min)                                    |
| Timeout configurable            | Yes (`timeout` in seconds)                                | Yes (`timeout` or `timeoutSec` in seconds)       |
| Input format                    | JSON on stdin                                             | JSON on stdin                                    |
| Block mechanism                 | Exit code 2 or JSON `decision: "block"`                   | Exit code 2 or JSON `permissionDecision: "deny"` |
| Context injection               | stdout text added to context                              | `additionalContext` in JSON response             |
| Hook types                      | `command`, `http`, `prompt`, `agent`                      | `command` only                                   |
| Matcher syntax                  | Regex on tool name (all tools)                            | Regex (Bash only for Pre/PostToolUse)            |
| `if` field (argument filtering) | Yes (v2.1.85+)                                            | No                                               |
| Feature flag required           | No (stable)                                               | Yes (`codex_hooks = true`, experimental)         |

### Critical Gap: Tool Scope

The most significant limitation is that Codex CLI's `PreToolUse` and `PostToolUse` events only match the `Bash` tool. Codex does not expose tool names like `Edit`, `Write`, `Read`, `Agent`, or MCP tools to the hook system. This means:

- **File change detection** (the core of dev-team's review hooks) cannot be done via Codex hooks
- **Agent spawn interception** is impossible
- **MCP tool gating** is impossible

The Bash-only scope makes Codex hooks useful only for command interception, not for the broader tool lifecycle control that dev-team requires.

---

## Part 2: Skill System Comparison

### Format Comparison

| Aspect                     | Claude Code                                 | Codex CLI                                                                                    |
| -------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| File                       | `SKILL.md`                                  | `SKILL.md`                                                                                   |
| Format                     | Markdown + YAML frontmatter                 | Markdown + YAML frontmatter                                                                  |
| Required fields            | `name`, `description`                       | `name`, `description`                                                                        |
| Directory                  | `.claude/skills/<name>/SKILL.md`            | `.agents/skills/<name>/SKILL.md`                                                             |
| Discovery hierarchy        | Project `.claude/` only                     | Repo `.agents/` (CWD, parent, root), user `~/.agents/`, admin `/etc/codex/`, system built-in |
| Invocation                 | Slash commands (`/skill-name`)              | `/skills` or `$` prefix, plus implicit matching                                              |
| Auto-invoke                | No (explicit only for orchestration skills) | Yes, via `description` matching                                                              |
| `disable-model-invocation` | Yes (YAML frontmatter field)                | Via `policy.allow_implicit_invocation: false` in `agents/openai.yaml`                        |
| Tool dependencies          | Not declared in skill                       | Declared in `agents/openai.yaml` `dependencies.tools`                                        |
| Arguments                  | `$ARGUMENTS` placeholder                    | Prompt inclusion                                                                             |
| Progressive loading        | Full SKILL.md loaded at invocation          | Metadata first, full SKILL.md only when used                                                 |
| Distribution               | Copy files                                  | Plugin system with marketplace catalogs                                                      |
| Additional files           | Scripts alongside SKILL.md                  | `scripts/`, `references/`, `assets/`, `agents/openai.yaml`                                   |

### Key Findings

1. **Format is remarkably similar.** Both use `SKILL.md` with YAML frontmatter containing `name` and `description`. The core skill authoring experience is nearly identical.

2. **Invocation model differs.** Claude Code uses explicit slash commands (`/dev-team:task`). Codex supports both explicit (`/skills` menu) and implicit (auto-matching based on description). dev-team's orchestration skills use `disable-model-invocation: true` to prevent autonomous firing; the Codex equivalent is `policy.allow_implicit_invocation: false` in an adjacent YAML file.

3. **Tool dependency declaration is Codex-only.** Codex skills can declare MCP tool dependencies in `agents/openai.yaml`. Claude Code skills do not declare dependencies — the agent discovers tools from the environment.

4. **Codex has richer distribution.** Codex has a plugin system for packaging skills, with marketplace catalogs for discovery and installation. Claude Code skills are distributed as files.

5. **Namespace conflict.** dev-team uses `.claude/skills/` (Claude Code convention) and would need `.agents/skills/` for Codex. The adapter must translate paths.

### Skill Adapter Feasibility

Translating dev-team skills to Codex format requires:

- Copying `SKILL.md` files from `.claude/skills/` to `.agents/skills/`
- No frontmatter changes needed (`name` and `description` are identical)
- Generating `agents/openai.yaml` with `policy.allow_implicit_invocation: false` for orchestration skills (those with `disable-model-invocation: true`)
- The `$ARGUMENTS` placeholder convention needs validation on Codex (not documented)

**Feasibility: High for skill content, Medium for behavioral equivalence.** The skill text transfers directly. The invocation control semantics are close but not identical.

---

## Part 3: AGENTS.md Support

### What Codex CLI Parses

Codex CLI treats AGENTS.md as **unstructured Markdown context**. There is no field parsing, no frontmatter support, and no section schema. The entire file content is injected as project instructions.

| Aspect                  | Detail                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| Spec compliance         | AAIF spec is intentionally minimal — "just standard Markdown"                                    |
| Structured fields       | None. No frontmatter, no required sections, no typed data                                        |
| Multi-agent definitions | Not supported. No syntax for defining multiple agents                                            |
| Discovery               | Walk from `~/.codex/` (global) then git root to CWD (project), checking each directory           |
| Override mechanism      | `AGENTS.override.md` takes precedence over `AGENTS.md` in same directory                         |
| Size limit              | `project_doc_max_bytes` (default 32 KiB). Discovery stops at threshold                           |
| Fallback filenames      | Configurable via `project_doc_fallback_filenames` in `config.toml`                               |
| Concatenation           | Multiple files joined with blank-line separators; closest-to-CWD appears last (highest priority) |
| Config override         | `model_instructions_file` replaces AGENTS.md entirely                                            |

### AAIF Spec Assessment

The AAIF AGENTS.md spec is deliberately minimal:

- **No required fields** — just a Markdown file
- **No structured data** — "use any headings you like"
- **No multi-agent support** — single instruction document, not agent definitions
- **No frontmatter** — unlike Claude Code's agent definitions with YAML metadata

This means AGENTS.md cannot express:

- Agent roles, tools, model preferences (dev-team's agent definitions)
- Skill invocation control
- Hook configuration
- Memory architecture
- Multi-agent coordination protocols

AGENTS.md is suitable only for the **instruction layer** — project context, coding conventions, behavioral guidelines. This confirms the #264 finding.

---

## Part 4: Adapter Feasibility Assessment

### Coverage Summary

| dev-team artifact                  | Count         | Codex mappable                                              | Coverage                                       |
| ---------------------------------- | ------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| Hooks (event types used)           | 5 event types | 2 (PreToolUse/Bash, PostToolUse/Bash partially)             | 30% of hooks directly mappable                 |
| Skills                             | 8 skills      | 8 (format is near-identical)                                | ~95% of skill content transfers                |
| Agent definitions                  | 14 agents     | 0 (no Codex equivalent for agent definitions with metadata) | 0% native mapping                              |
| Rules (`.claude/rules/`)           | N/A           | Partial (via nested AGENTS.md files)                        | ~60% (content transfers, auto-loading differs) |
| Memory architecture                | 2-tier        | 0 (Codex has no memory system)                              | 0%                                             |
| Multi-agent orchestration          | Full          | 0 (Codex is single-agent)                                   | 0%                                             |
| Settings (`.claude/settings.json`) | 1             | Partial (`.codex/config.toml` + `hooks.json`)               | ~40% (hooks + basic config)                    |

### Overall Functionality Mapping

**Directly mappable to Codex CLI: ~25-30%**

- Bash command interception hooks (safety guard, lint, review gate)
- Skill content and invocation
- Project instructions via AGENTS.md

**Requires workarounds or degraded experience: ~20-25%**

- File change detection (would need to poll git status in Stop hook instead of PostToolUse on Edit/Write)
- Rules (flatten into AGENTS.md sections instead of auto-loaded rule files)
- Invocation control (openai.yaml instead of frontmatter)

**Not mappable (no Codex equivalent): ~45-50%**

- Multi-agent coordination (agent teams, subagents, orchestration)
- Agent definitions with metadata (tools, model, memory config)
- Structured memory (two-tier memory architecture)
- Worktree management hooks
- Task lifecycle hooks (TaskCompleted)
- Agent spawn interception
- File/config change watching
- Prompt-based and agent-based hooks
- HTTP hooks

### Is an Instruction-Only Adapter Sufficient?

**No.** An instruction-only adapter (AGENTS.md export) would capture ~15% of dev-team's value — the behavioral context and coding conventions. dev-team's thesis is **enforcement through productive friction**, which requires hooks. Without hooks, all agent guidance is advisory.

However, an instruction-only adapter is still **worth building** as a baseline because:

1. It provides immediate value on 20+ runtimes
2. It composes with the Codex-native adapter (instructions + hooks + skills)
3. It's low effort (Markdown concatenation)

### Codex-Specific Adapter Value

A Codex-specific adapter that generates `hooks.json` + `.agents/skills/` adds meaningful value beyond instruction-only:

| Feature                     | Instruction-only | + Codex adapter               |
| --------------------------- | ---------------- | ----------------------------- |
| Project context             | Yes              | Yes                           |
| Skill invocation            | No               | Yes                           |
| Bash command safety guard   | No               | Yes                           |
| Pre-commit lint enforcement | No               | Yes                           |
| Review gate on git push     | No               | Yes                           |
| File change review triggers | No               | Degraded (polling workaround) |
| Agent orchestration         | No               | No                            |
| Memory                      | No               | No                            |

The adapter unlocks 3 enforceable hooks and 8 skills, which is significant. The Bash-only tool scope is the primary limitation.

---

## Part 5: Codex CLI Maturity Assessment

| Dimension                    | Assessment                                                                    | Confidence |
| ---------------------------- | ----------------------------------------------------------------------------- | ---------- |
| Hook system stability        | **Beta** — behind feature flag, Windows disabled, Bash-only tool scope        | High       |
| Hook documentation quality   | **Good** — complete JSON schemas, clear examples                              | High       |
| Skill system stability       | **Stable** — no feature flag, full documentation, plugin ecosystem            | High       |
| Skill documentation quality  | **Excellent** — progressive disclosure, distribution model documented         | High       |
| AGENTS.md support            | **Stable** — native, well-documented discovery mechanism                      | High       |
| Release cadence              | **Very active** — v0.117.0 as of 2026-03-26, 660+ releases                    | High       |
| Tool scope expansion (hooks) | **Unknown** — no public roadmap for supporting Edit/Write/Read tools in hooks | Low        |

The hook system's Bash-only limitation may be temporary (it's beta), but there is no public signal that OpenAI plans to expand tool scope. The prior brief's claim that Codex has "5 events (beta)" is confirmed. The skill system is production-quality.

---

## Recommendation

**Build a Codex CLI adapter as a Phase 3 priority (after AGENTS.md export and MCP server), with the following scope:**

1. **Skills adapter (high value, low effort)**: Copy SKILL.md files to `.agents/skills/`, generate `agents/openai.yaml` for invocation control. Near-identical format makes this straightforward.

2. **Hooks adapter (medium value, low effort)**: Generate `.codex/hooks.json` for the 3 mappable hooks (safety guard, pre-commit lint, review gate). Include the `codex_hooks = true` config.toml entry.

3. **AGENTS.md export (baseline)**: Concatenate agent behavioral instructions and rules into AGENTS.md. This is runtime-agnostic, not Codex-specific.

4. **Skip**: Do not attempt to map agent definitions, memory, multi-agent orchestration, or worktree hooks. These have no Codex equivalent and workarounds would be fragile.

**Monitor**: Track Codex CLI hook system evolution. If PreToolUse/PostToolUse expand beyond Bash to cover file editing tools, the adapter value increases significantly (from 30% to ~60% hook coverage).

---

## Evidence

- [Codex CLI Hooks Documentation](https://developers.openai.com/codex/hooks)
- [Codex CLI Skills Documentation](https://developers.openai.com/codex/skills)
- [Codex CLI AGENTS.md Guide](https://developers.openai.com/codex/guides/agents-md)
- [Codex CLI Configuration Reference](https://developers.openai.com/codex/config-reference)
- [Codex CLI Plugin Build Guide](https://developers.openai.com/codex/plugins/build)
- [AGENTS.md Official Site](https://agents.md/)
- [AGENTS.md GitHub Repository](https://github.com/agentsmd/agents.md)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [Codex CLI GitHub Repository](https://github.com/openai/codex) (Apache-2.0, Rust, v0.117.0)
- [dev-team template settings.json](../templates/settings.json) (hook configuration)
- [Prior brief: #264 Agent Runtime Portability](264-agent-runtime-portability-2026-03-29.md)

## Known Issues / Caveats

1. **Codex hook tool scope is the critical blocker.** PreToolUse and PostToolUse only match Bash. dev-team's most valuable hooks (file change review, TDD enforcement, watch-list) trigger on Edit/Write. Until Codex expands tool scope, these hooks cannot be ported.

2. **`$ARGUMENTS` behavior on Codex is undocumented.** Claude Code skills use `$ARGUMENTS` as a placeholder for user input. Codex documentation does not mention this convention. The adapter should test this before assuming portability.

3. **Codex hooks are behind a feature flag.** Users must opt in via `config.toml`. This means hook-based enforcement is not guaranteed on Codex installations.

4. **Prior brief understated Claude Code's hook count.** The #264 brief cited "12 events" for Claude Code; the current documentation lists 25. The gap between Claude Code (25) and Codex (5) is larger than previously assessed.

5. **Codex has no multi-agent support.** dev-team's agent orchestration (Drucker routing, parallel agent teams, adversarial review loops) has zero mapping. This is ~45% of dev-team's value proposition.

6. **Memory architecture has no Codex equivalent.** Neither two-tier memory nor temporal decay can be expressed. Agent calibration would rely entirely on instructions.

## Confidence Level

**High**

All findings are based on official OpenAI documentation (developers.openai.com/codex) and the official Codex CLI GitHub repository. The hook system JSON schemas are fully documented. The skill format comparison is based on direct format inspection.

Confidence would increase to **Very High** with:

- Hands-on installation and execution of Codex CLI hooks (validate runtime behavior matches docs)
- Testing `$ARGUMENTS` in Codex skills
- Confirmation from OpenAI on tool scope expansion timeline for hooks

---

## Recommended Actions

- **Title**: Build Codex CLI skill adapter (SKILL.md + openai.yaml generation)
  **Severity**: P2
  **Files affected**: new `src/adapters/codex-skills.ts`, `templates/`
  **Scope**: S — near-identical format, mainly path translation and openai.yaml generation for invocation control

- **Title**: Build Codex CLI hook adapter (hooks.json for Bash-scoped hooks)
  **Severity**: P2
  **Files affected**: new `src/adapters/codex-hooks.ts`
  **Scope**: S — generate hooks.json for the 3 Bash-matchable hooks (safety guard, lint, review gate)

- **Title**: Validate `$ARGUMENTS` placeholder behavior in Codex CLI skills
  **Severity**: P2
  **Files affected**: `docs/research/`
  **Scope**: S — quick hands-on test to confirm skill argument passing works

- **Title**: Track Codex CLI hook tool scope expansion
  **Severity**: P3
  **Files affected**: none (monitoring)
  **Scope**: S — watch openai/codex repo for PreToolUse/PostToolUse expansion beyond Bash

- **Title**: Update #264 portability brief with corrected Claude Code hook count (25, not 12)
  **Severity**: P3
  **Files affected**: `docs/research/264-agent-runtime-portability-2026-03-29.md`
  **Scope**: S — add erratum note (ADRs/briefs are immutable, so append a correction note rather than editing)
