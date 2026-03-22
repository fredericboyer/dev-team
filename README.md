# dev-team

Adversarial AI agent team for any project. Installs [Claude Code](https://claude.ai/claude-code) agents, hooks, and skills that enforce quality through productive friction.

Instead of an AI that agrees with everything, dev-team gives you six opinionated specialists that challenge each other — and you.

## Install

```bash
npx @fredericboyer/dev-team init        # Interactive wizard
npx @fredericboyer/dev-team init --all  # Everything, no prompts
```

Requires Node.js 18+ and Claude Code.

## What you get

### Agents

| Agent | Role | When to use |
|-------|------|-------------|
| `@dev-team-voss` | Backend Engineer | API design, data modeling, system architecture, error handling |
| `@dev-team-mori` | Frontend/UI Engineer | Components, accessibility, UX patterns, state management |
| `@dev-team-szabo` | Security Auditor | Vulnerability review, auth flows, attack surface analysis |
| `@dev-team-knuth` | Quality Auditor | Coverage gaps, boundary conditions, correctness verification |
| `@dev-team-beck` | Test Implementer | Writing tests, TDD cycles, translating audit findings into test cases |
| `@dev-team-deming` | Tooling Optimizer | Linters, formatters, CI/CD, hooks, onboarding, automation |

Szabo and Knuth use Opus (deep analysis, read-only). Voss, Mori, Beck, and Deming use Sonnet (implementation, full access).

### Hooks

| Hook | Trigger | What it does |
|------|---------|-------------|
| Safety guard | Before Bash commands | Blocks dangerous commands (`rm -rf`, `chmod 777`, force push to main, `DROP TABLE/DATABASE`, `curl\|sh`, and others) |
| TDD enforcement | After file edits | Blocks implementation changes when no corresponding test file exists and no tests were modified in the session |
| Post-change review | After file edits | Routes files to domain agents for review (security → Szabo, API → Mori, infra → Voss, tooling → Deming, code → Knuth). Advisory, does not block. |
| Pre-commit gate | On task completion | Reminds about running review agents before committing. Advisory, does not block. |
| Task loop | On stop | Manages iterative task loop with adversarial review gates |

All hooks are Node.js scripts — work on macOS, Linux, and Windows.

### Skills

| Skill | What it does |
|-------|-------------|
| `/dev-team:challenge` | Critically examine a proposal, approach, or implementation |
| `/dev-team:task` | Start an iterative task loop with adversarial review gates |

### Challenge protocol

Agents challenge each other using classified findings:

- **[DEFECT]** — Concretely wrong. Blocks progress.
- **[RISK]** — Not wrong today, but creates a likely failure mode. Advisory.
- **[QUESTION]** — Decision needs justification. Advisory.
- **[SUGGESTION]** — Works, but here's a specific improvement. Advisory.

Rules: concrete evidence required, one exchange before escalation, human decides disputes.

## How it works

### Task loop (`/dev-team:task`)

For non-trivial work, the task loop enforces quality convergence:

1. Implementing agent works on the task
2. Review agents challenge in parallel
3. If any `[DEFECT]` found → loop continues with fixes
4. If no `[DEFECT]` remains → done
5. Max iterations (default: 10) as safety cap

The implementing agent can't declare "done" alone — the adversarial review is the quality gate.

### Agent memory

Each agent maintains persistent memory (`.claude/agent-memory/<agent>/MEMORY.md`) that calibrates over time:

- Project-specific patterns and conventions
- What challenges were accepted vs. overruled
- Quality benchmarks learned from the codebase

Shared team learnings are stored in `.claude/dev-team-learnings.md`.

## Customization

After installation, you can:

- **Edit agent prompts** in `.claude/agents/` to adjust focus areas or challenge style
- **Disable hooks** by removing entries from `.claude/settings.json`
- **Add your own agents** following the same frontmatter format
- **Tune agent memory** in `.claude/agent-memory/` to accelerate calibration

## What gets installed

```
.claude/
  agents/           # Agent definitions (YAML frontmatter + prompt)
  hooks/            # Quality enforcement scripts
  skills/           # Skill definitions
  agent-memory/     # Per-agent persistent memory
  settings.json     # Hook configuration
CLAUDE.md           # Project instructions (dev-team section added via markers)
```

## Contributing

1. Every piece of work starts with a [GitHub Issue](https://github.com/fredericboyer/dev-team/issues)
2. Branch naming: `feat/123-description` or `fix/456-description`
3. Commits reference issues: `fixes #123` or `refs #123`
4. All merges via PR — no direct pushes to main
5. Run `npm test` before pushing

### Development

```bash
npm install          # Install dependencies (dev only, zero runtime deps)
npm run build        # Compile TypeScript
npm test             # Build + run all tests
npm run lint         # Run oxlint
npm run format       # Run oxfmt
```

Architecture decisions are documented in `docs/adr/`.

## License

MIT
