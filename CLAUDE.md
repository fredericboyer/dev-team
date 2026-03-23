# dev-team

Adversarial AI agent team for any project. Installs Claude Code agents, hooks, and skills that enforce quality through productive friction.

## Project structure

- `bin/` — CLI entry point shim (`npx dev-team init`)
- `src/` — TypeScript source (compiled to `dist/` via `tsc`)
- `templates/` — Agent definitions, hook scripts, skills, and CLAUDE.md template that get copied into target projects
- `docs/adr/` — Architecture Decision Records. Every non-trivial decision gets an ADR.
- `tests/` — Unit, integration, and scenario tests
- `.claude/hooks/` — Our own hooks (not shipped to users)

## Workflow

- **Every piece of work starts with a GitHub Issue.** No exceptions.
- Branch naming: `feat/123-description` or `fix/456-description`
- Commits reference issues: `fixes #123` or `refs #123`
- All merges via PR. No direct pushes to main.
- **Aggressively parallelize with git worktrees.** When multiple issues touch independent files, work them simultaneously in separate worktrees. Do NOT work sequentially on issues that can be parallelized. Use the Agent tool with `isolation: "worktree"` to spawn parallel workstreams. Only sequence issues that have file conflicts.

## Development

- `npm test` — run all tests
- `node bin/dev-team.js init --all` — test the installer locally
- TypeScript source, compiled to CommonJS. Node.js 18+, zero runtime dependencies.

## Architecture decisions

Stored in `docs/adr/`. Read before making changes to foundational patterns. Update if your change affects an existing ADR.

<!-- dev-team:begin -->

## Dev Team

This project uses [dev-team](https://github.com/dev-team) — adversarial AI agents that enforce quality through productive friction.

### Agents

| Agent | Role | When to use |
|-------|------|-------------|
| `@dev-team-voss` | Backend Engineer | API design, data modeling, system architecture, error handling |
| `@dev-team-mori` | Frontend/UI Engineer | Components, accessibility, UX patterns, state management |
| `@dev-team-szabo` | Security Auditor | Vulnerability review, auth flows, attack surface analysis |
| `@dev-team-knuth` | Quality Auditor | Coverage gaps, boundary conditions, correctness verification |
| `@dev-team-beck` | Test Implementer | Writing tests, TDD cycles, translating audit findings into test cases |
| `@dev-team-deming` | Tooling Optimizer | Linters, formatters, CI/CD, hooks, onboarding, automation |
| `@dev-team-docs` | Documentation Engineer | Doc accuracy, stale docs, README/API docs, doc-code sync |
| `@dev-team-architect` | Architect | Architectural review, coupling, dependency direction, ADR compliance |
| `@dev-team-release` | Release Manager | Versioning, changelog, release readiness, semver validation |
| `@dev-team-lead` | Team Lead / Orchestrator | Auto-delegates to specialists, manages review loops, resolves conflicts |

### Workflow

For automatic delegation, use `@dev-team-lead` — it analyzes the task and routes to the right specialist.

For non-trivial work: explore the area first, then implement, then review.

Agents challenge each other using classified findings:
- `[DEFECT]` blocks progress. `[RISK]`, `[QUESTION]`, `[SUGGESTION]` are advisory.
- When agents disagree, they escalate to the human after one exchange each. Human decides.

### Hook directives are MANDATORY

When a dev-team hook outputs `ACTION REQUIRED — spawn these agents`, you MUST:
1. Spawn each listed agent as a **background** subagent using the Agent tool with `subagent_type: "general-purpose"`
2. Include the agent's full definition by reading from `.claude/agents/<agent>.md`
3. Include the changed file path and instruction to produce classified findings
4. After all reviews complete, delete `.claude/dev-team-review-pending.json`

Do NOT skip this. Do NOT treat hook output as optional. The pre-commit gate will BLOCK commits if flagged agents were not spawned. If you believe a review is unnecessary for trivial changes, delete `.claude/dev-team-review-pending.json` and explain why to the user.

### Skills

- `/dev-team:challenge` — critically examine a proposal or implementation
- `/dev-team:task` — start an iterative task loop with adversarial review gates
- `/dev-team:review` — orchestrated multi-agent parallel review of changes
- `/dev-team:audit` — full codebase security + quality + tooling audit

### Learnings — where to write what

All project and process learnings MUST go to in-repo files, NOT to machine-local memory (`~/.claude/projects/`). Machine-local memory is invisible to other developers, agents, and sessions.

| What | Where | Examples |
|------|-------|---------|
| Project patterns, process rules, tech debt, overruled challenges | `.claude/dev-team-learnings.md` | "We use PostgreSQL", "Hooks over guidelines", "Knuth's finding X was overruled because Y" |
| Agent-specific calibration | `.claude/agent-memory/<agent>/MEMORY.md` | Szabo: "Auth uses JWT not sessions", Knuth: "Coverage weak in parsers" |
| Formal architecture decisions | `docs/adr/` | ADR format, not learnings |
| User-specific preferences only | Machine-local memory | Personal style, name, role — things that vary per person, not per project |

When the human gives feedback about process, coding style, or tool behavior: write it to `dev-team-learnings.md`. Only use machine-local memory for things that are truly personal and would not apply to another developer on the same project.

<!-- dev-team:end -->





