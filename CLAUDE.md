# dev-team

Adversarial AI agent team for any project. Installs Claude Code agents, hooks, and skills that enforce quality through productive friction.

## Project structure

- `bin/` — CLI entry point shim (`npx dev-team init`)
- `src/` — TypeScript source (compiled to `dist/` via `tsc`)
- `templates/` — Agent definitions, hook scripts, skills, and CLAUDE.md template that get copied into target projects
- `docs/adr/` — Architecture Decision Records. Every non-trivial decision gets an ADR.
- `tests/` — Unit, integration, and scenario tests
- `.dev-team/` — Our own agents, hooks, skills, memories, and config (not shipped to users)

## Workflow

- **Every piece of work starts with a GitHub Issue.** No exceptions.
- Branch naming: `feat/123-description` or `fix/456-description`
- Commits reference issues: `fixes #123` or `refs #123`
- All merges via PR. No direct pushes to main.
- **Aggressively parallelize independent work.** When multiple issues touch independent files, work them simultaneously — do NOT work sequentially on issues that can be parallelized. Only sequence issues that have file conflicts.
  - **Agent teams** (preferred for multi-issue batches): The main conversation loop acts as Drucker (team lead). Spawn implementation teammates via agent teams, each on its own branch. Never delegate to a Drucker subagent — the main loop IS Drucker. *(This is specific to the dev-team repo itself. The template section below has different guidance for user projects, where `@dev-team-drucker` can be used as a subagent.)*
  - **Worktree subagents** (fallback when agent teams are unavailable): Use the Agent tool with `isolation: "worktree"` to spawn parallel workstreams in separate worktrees.
  - The main loop must stay interactive at all times. All implementation happens via background teammates or subagents.

## Development

- `npm test` — run all tests
- `node bin/dev-team.js init --all` — test the installer locally
- TypeScript source, compiled to CommonJS. Node.js 22+, zero runtime dependencies.
- Version bumps: use `npm version <version> --no-git-tag-version` to update both `package.json` and `package-lock.json` atomically. Do not edit `package-lock.json` manually.

## Architecture decisions

Stored in `docs/adr/`. Read before making changes to foundational patterns. ADRs are immutable records — if a decision changes, write a new ADR that supersedes the original. Do not edit existing ADRs.

<!-- dev-team:begin -->

## Dev Team

This project uses [dev-team](https://github.com/dev-team) — adversarial AI agents that enforce quality through productive friction.

### Agents

| Agent | Role | When to use |
|-------|------|-------------|
| `@dev-team-voss` | Backend Engineer | API design, data modeling, system architecture, error handling |
| `@dev-team-hamilton` | Infrastructure Engineer | Dockerfiles, IaC, CI/CD, k8s, deployment, health checks, monitoring |
| `@dev-team-mori` | Frontend/UI Engineer | Components, accessibility, UX patterns, state management |
| `@dev-team-szabo` | Security Auditor | Vulnerability review, auth flows, attack surface analysis |
| `@dev-team-knuth` | Quality Auditor | Coverage gaps, boundary conditions, correctness verification |
| `@dev-team-beck` | Test Implementer | Writing tests, TDD cycles, translating audit findings into test cases |
| `@dev-team-deming` | Tooling Optimizer | Linters, formatters, CI/CD, hooks, onboarding, automation |
| `@dev-team-tufte` | Documentation Engineer | Doc accuracy, stale docs, README/API docs, doc-code sync |
| `@dev-team-brooks` | Architect & Quality Reviewer | Architectural review, coupling, ADR compliance, quality attributes (performance, maintainability, scalability) |
| `@dev-team-conway` | Release Manager | Versioning, changelog, release readiness, semver validation |
| `@dev-team-drucker` | Team Lead / Orchestrator | Auto-delegates to specialists, manages review loops, resolves conflicts |
| `@dev-team-turing` | Pre-implementation Researcher | Library evaluation, migration paths, trade-off analysis, security pattern research |
| `@dev-team-rams` | Design System Reviewer | Token compliance, spacing consistency, component API usage, design-code alignment |
| `@dev-team-borges` | Librarian | End-of-task memory extraction, cross-agent coherence, system improvement |

### Capabilities

For automatic delegation, use `@dev-team-drucker` — it analyzes the task and routes to the right specialist.

For non-trivial work: explore the area first, then implement, then review.

**Automatic invocation (hooks):**
- **Szabo** — auto-flagged when security-sensitive files change (auth, token, session, crypto, etc.)
- **Knuth** — auto-flagged when any non-test implementation code changes
- **Mori** — auto-flagged when API contract files change (/api/, /routes/, schema, etc.)
- **Hamilton** — auto-flagged when infrastructure/operations files change (Dockerfile, docker-compose, CI workflows, Terraform, Helm, k8s, health checks, monitoring config, .env templates, etc.)
- **Voss** — auto-flagged when app config/data files change (.env, config, migrations, database, etc.)
- **Deming** — auto-flagged when tooling files change (eslint, CI workflows, package.json, etc.)
- **Tufte** — auto-flagged when documentation files change (.md, /docs/, README, etc.) AND when significant implementation files change to detect doc-code drift
- **Brooks** — auto-flagged when any non-test implementation code changes (quality attributes) and when architectural boundaries are touched (/adr/, /core/, /domain/, /lib/, build config, etc.)
- **Conway** — auto-flagged when release artifacts change (package.json, changelog, version files, release/publish/deploy workflows, etc.)
- **Turing** — on-demand only. Spawned by Drucker when task involves library selection, migration, or unfamiliar domain. Not auto-triggered by hooks.
- **Rams** — auto-flagged when frontend/UI component files change (same trigger as Mori). Gracefully no-ops when no design system is detected.

**End-of-workflow agents:**
- **Borges** — mandatory at end of every `/dev-team:task`, `/dev-team:review`, `/dev-team:audit`, and `/dev-team:retro`. Extracts structured memory entries, reviews cross-agent coherence, and identifies system improvement opportunities.

**Orchestration:**
- **Drucker** — delegates tasks to the right implementing agent and spawns reviewers. Szabo, Knuth, and Brooks review all code changes.

**CRITICAL: Always run agents in the background.** When spawning Drucker or any agent for tasks that take more than a few seconds, use `run_in_background: true`. The main conversation loop must remain interactive.

Agents challenge each other using classified findings:
- `[DEFECT]` blocks progress. `[RISK]`, `[QUESTION]`, `[SUGGESTION]` are advisory.
- When agents disagree, they escalate to the human after one exchange each. Human decides.

### Parallel execution

When working on multiple independent issues, use agent teams or worktree subagents to run parallel agents on separate branches. Drucker coordinates the review wave after all implementations complete.

> **Note:** If your project's workflow section (above the `dev-team:begin` marker) already designates the main conversation loop as the team lead, do not spawn a separate Drucker subagent — the main loop IS Drucker. Otherwise, `@dev-team-drucker` can be used as a subagent for delegation.

### Hook directives are MANDATORY

When a dev-team hook outputs `ACTION REQUIRED — spawn these agents`, you MUST:
1. Spawn each listed agent as a **background** subagent using the Agent tool with `subagent_type: "general-purpose"`
2. Include the agent's full definition by reading from `.dev-team/agents/<agent>.md`
3. Include the changed file path and instruction to produce classified findings

Do NOT skip this. Do NOT treat hook output as optional. If you believe a review is unnecessary for trivial changes, explain why to the user.

### Skills

**Framework skills** (installed automatically, updated with `dev-team update`):
- `/dev-team:challenge` — critically examine a proposal or implementation
- `/dev-team:task` — start an iterative task loop with adversarial review gates
- `/dev-team:review` — orchestrated multi-agent parallel review of changes
- `/dev-team:audit` — full codebase security + quality + tooling audit
- `/dev-team:retro` — audit knowledge base health (learnings, agent memory, CLAUDE.md)

### Project-specific customization

`.dev-team/` is managed by dev-team and updated by `dev-team update`. Do not add project-specific files here.

Project-specific customization belongs in `.claude/`:

| What | Where |
|------|-------|
| Custom hooks (linting, workflow enforcement) | `.claude/hooks/` |
| Project-specific skills (merge, deploy, etc.) | `.claude/skills/` |
| Claude Code settings and hook wiring | `.claude/settings.json` |

`.claude/hooks/` and `.claude/skills/` are not overwritten by `dev-team update` — your project-specific customizations are safe. Only `.claude/settings.json` is merged additively (new product hooks are added, but user-added entries are never removed).

### Memory architecture (two-tier)

All project and process learnings MUST go to in-repo files, NOT to machine-local memory (`~/.claude/projects/`). Machine-local memory is invisible to other developers, agents, and sessions.

**Tier 1 — Shared team memory** (`.dev-team/learnings.md`):
Project facts, overruled challenges, cross-agent decisions, process rules. All agents read this at session start.

**Tier 2 — Agent calibration memory** (`.dev-team/agent-memory/<agent>/MEMORY.md`):
Domain-specific findings, known patterns, active watch lists. Each agent owns its own file. Entries include `Last-verified` dates for temporal decay.

| What | Where | Examples |
|------|-------|---------|
| Project patterns, process rules, tech debt, overruled challenges | `.dev-team/learnings.md` (Tier 1) | "We use PostgreSQL", "Hooks over guidelines", "Knuth's finding X was overruled because Y" |
| Agent-specific calibration | `.dev-team/agent-memory/<agent>/MEMORY.md` (Tier 2) | Szabo: "Auth uses JWT not sessions", Knuth: "Coverage weak in parsers" |
| Formal architecture decisions | `docs/adr/` | ADR format, not learnings |
| User-specific preferences only | Machine-local memory | Personal style, name, role — things that vary per person, not per project |

**Memory evolution:** New entries trigger re-evaluation of related existing entries. Duplicates are merged, contradictions are superseded, and 3+ overrules on the same tag generate calibration rules.

**Temporal decay:** Entries have `Last-verified` dates. Borges flags entries not verified in 30+ days and archives entries over 90 days to the `## Archive` section.

When the human gives feedback about process, coding style, or tool behavior: write it to `.dev-team/learnings.md`. Only use machine-local memory for things that are truly personal and would not apply to another developer on the same project.

<!-- dev-team:end -->





## Project-Specific Workflow

### Merging PRs

**Always use `/merge` to merge PRs.** Do not use raw `gh pr merge` or check Copilot comments separately.

The merge skill handles Copilot check run monitoring, auto-merge, CI verification, and post-merge actions automatically. This applies to all PRs — including those created by background agents.

