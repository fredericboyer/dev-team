# dev-team

Adversarial AI agent team for any project. Installs Claude Code agents, hooks, and skills that enforce quality through productive friction.

## Project structure

- `bin/` — CLI entry point (`npx dev-team init`)
- `lib/` — Core logic (init, prompts, file helpers). Zero npm dependencies.
- `templates/` — Agent definitions, hook scripts, skills, and CLAUDE.md template that get copied into target projects
- `docs/adr/` — Architecture Decision Records. Every non-trivial decision gets an ADR.
- `tests/` — Unit, integration, and scenario tests
- `.claude/hooks/` — Our own hooks (not shipped to users)

## Workflow

- **Every piece of work starts with a GitHub Issue.** No exceptions.
- Branch naming: `feat/123-description` or `fix/456-description`
- Commits reference issues: `fixes #123` or `refs #123`
- All merges via PR. No direct pushes to main.
- Use git worktrees for parallel work on separate issues.

## Development

- `npm test` — run all tests
- `node bin/dev-team.js init --all` — test the installer locally
- CommonJS, Node.js 18+, zero dependencies

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

### Workflow

For non-trivial work: explore the area first, then implement, then review.

Agents challenge each other using classified findings:
- `[DEFECT]` blocks progress. `[RISK]`, `[QUESTION]`, `[SUGGESTION]` are advisory.
- When agents disagree, they escalate to the human after one exchange each. Human decides.

### Skills

- `/dev-team:challenge` — critically examine a proposal or implementation
- `/dev-team:task` — start an iterative task loop with adversarial review gates

<!-- dev-team:end -->


