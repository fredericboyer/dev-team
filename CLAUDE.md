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

## Agents

This project uses its own agents. Invoke with `@dev-team-voss`, `@dev-team-mori`, `@dev-team-szabo`, `@dev-team-knuth`, `@dev-team-deming`.

When agents disagree, escalate to the human after one exchange each. Human decides, decision is final.

## Architecture decisions

Stored in `docs/adr/`. Read before making changes to foundational patterns. Update if your change affects an existing ADR.
