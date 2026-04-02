# ADR-038: Runtime-native directory layout

Date: 2026-03-30
Status: accepted
Supersedes: ADR-036 (agent path decisions), ADR-025 (customization-only policy for .claude/)

## Context

Since v1.0, dev-team has stored all agent definitions, skills, and agent memory under `.dev-team/`. Claude Code discovers agents via `.claude/agents/*.agent.md` — so we created symlinks from `.claude/skills/` to `.dev-team/skills/` and relied on `.dev-team/agents/` as the canonical location. This created several problems:

1. **Symlink fragility**: Symlinks from `.claude/skills/` to `.dev-team/skills/` break across platforms, in worktrees, and when users copy projects.
2. **Agent discovery**: Claude Code's native agent discovery expects `.claude/agents/*.agent.md`. Storing agents in `.dev-team/agents/*.md` means they are invisible to the runtime without explicit `@agent` references.
3. **Memory colocation**: Agent memory in `.dev-team/agent-memory/` is disconnected from the agent definitions in `.dev-team/agents/`. The `memory: project` frontmatter field tells Claude Code to use its native memory system, but the MEMORY.md files live in a non-standard location.
4. **ADR-025 conflict**: ADR-025 reserved `.claude/` for project-specific customization only. But agents and memory ARE runtime-native artifacts — they belong where the runtime expects them.

The v3.0 multi-runtime adapter work (ADR-036) already established that each runtime adapter generates files in the runtime's native location. The Claude Code adapter was the exception — it still wrote to `.dev-team/agents/`.

## Decision

### 1. Each runtime owns its agent directory

The Claude Code adapter generates to `.claude/agents/` using the `.agent.md` extension (Claude Code's native agent file format). Agent files are named `dev-team-{name}.agent.md`.

### 2. Agent memory moves to `.claude/agent-memory/`

Agent memory directories move from `.dev-team/agent-memory/` to `.claude/agent-memory/`. This colocates memory with the agents that use it and aligns with the runtime-native principle.

### 3. Skills install directly — no symlinks

Skills install directly to `.claude/skills/` with no intermediate `.dev-team/skills/` directory and no symlinks. This eliminates the fragility of cross-directory symlinks.

### 4. `.dev-team/` retains operational files

`.dev-team/` keeps files that are dev-team operational artifacts, not runtime-native:

- `config.json` — dev-team preferences and version tracking
- `hooks/*.js` — hook script files (referenced by `.claude/settings.json`)
- `metrics.md` — calibration metrics log
- `.reviews/` — review sidecar files
- `.memory-reviewed` — memory gate override flag

### 5. Migration strategy

`dev-team update` auto-migrates v2.x installations:

- Detects `.dev-team/agents/` and moves files to `.claude/agents/` (renaming `.md` to `.agent.md`)
- Detects `.dev-team/agent-memory/` and moves to `.claude/agent-memory/`
- Removes `.dev-team/skills/` symlinks (skills already in `.claude/skills/`)
- Removes `.dev-team/learnings.md` if `.claude/rules/dev-team-learnings.md` exists
- Migration is idempotent — safe to run multiple times

## Consequences

### Easier

- Agent discovery works natively in Claude Code without explicit references
- No symlink maintenance or repair logic needed
- Skills work reliably across platforms and worktrees
- Memory is colocated with agents in the runtime's expected location

### Harder

- Breaking change requires major version bump (v3.0.0)
- Existing v2.x users need to run `dev-team update` to migrate
- Documentation and templates need path updates across the codebase
- `.claude/` now contains both dev-team managed files and project-specific customizations (clear separation via naming convention: `dev-team-*` prefix)
