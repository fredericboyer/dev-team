# Product Requirements Document: dev-team

## Problem Statement

Engineering organizations adopting AI coding assistants face a cold-start problem: they get a powerful AI tool but no structure for how it should behave. Without opinionated agents, quality gates, or adversarial review, teams produce AI-assisted code that is confident but unchallenged — leading to subtle bugs, security gaps, and architectural drift that compound over time.

Today, teams either use raw Claude Code with no agent structure (missing quality enforcement) or build overly complex orchestration systems (over-engineering the solution). There is no lightweight, installable starting point that provides a structured, adversarial team of AI agents ready to work on any codebase.

## Target Audience

**Primary**: Engineering organizations (5-200 engineers) currently starting to adopt AI coding tools. They have existing codebases, established workflows, and need something that integrates without disruption.

**Secondary**: Individual developers who want a more rigorous AI coding experience — agents that challenge their work rather than just agreeing.

## User Personas

### Alex — Engineering Manager
- Leading a team of 15 engineers adopting Claude Code
- Wants guardrails: code quality shouldn't drop because "the AI said it was fine"
- Needs something the whole team can install in 5 minutes
- Values: consistency, enforcement, approachability

### Sam — Senior Engineer
- Comfortable with AI tools, wants them to do more
- Frustrated that Claude agrees with everything instead of pushing back
- Wants agents that think like their best colleagues: opinionated, precise, adversarial
- Values: depth, specificity, signal over noise

### Jordan — Security-conscious Tech Lead
- Responsible for security posture across 3 services
- Wants AI reviews that think like attackers, not just pattern-match OWASP checklists
- Needs security enforcement that can't be ignored (hooks > guidelines)
- Values: concrete attack paths, zero false sense of security

## Core Features (v0.1)

### 1. Six adversarial agents

**Model assignment principle**: Opus for deep analysis (read-only), Sonnet for implementation (full access), Haiku for future lightweight agents.

| Agent | Role | Model | What they do |
|-------|------|-------|-------------|
| **Voss** | Backend Engineer | sonnet | Constructs failure scenarios. Stress-tests data flow, error handling, API contracts. |
| **Mori** | Frontend/UI Engineer | sonnet | Becomes the user. Challenges UI state fidelity, accessibility, error communication. |
| **Szabo** | Security Auditor | opus | Constructs attack paths against actual code. Read-only — audits, does not implement. |
| **Knuth** | Quality Auditor | opus | Identifies coverage gaps and constructs counter-examples. Read-only — analyzes, does not write code. |
| **Beck** | Test Implementer | sonnet | Translates Knuth's findings into concrete, well-isolated tests. Enforces TDD discipline. |
| **Deming** | Tooling & DX Optimizer | sonnet | Identifies manual processes and replaces them with automation. Scans for missing tooling. |

Each agent has:
- Domain-specific focus areas (what they always check)
- A challenge style grounded in concrete scenarios, not abstract concerns
- Persistent memory that calibrates over time
- Language-agnostic expertise
- Model matched to cognitive demand (opus for analysis, sonnet for implementation)

### 2. Challenge protocol

Structured adversarial review with classification:
- `[DEFECT]` — blocks progress (concretely wrong)
- `[RISK]` — advisory (likely failure mode)
- `[QUESTION]` — needs justification
- `[SUGGESTION]` — works, but here's a specific improvement

Rules: concrete evidence required, one exchange before escalation, human decides disputes.

### 3. Enforced hooks (cross-platform, Node.js)

| Hook | Trigger | Behavior |
|------|---------|----------|
| `dev-team-safety-guard.js` | PreToolUse (Bash) | Blocks rm -rf, force push, DROP TABLE, etc. |
| `dev-team-tdd-enforce.js` | PostToolUse (Edit/Write) | Blocks impl changes without corresponding tests |
| `dev-team-post-change-review.js` | PostToolUse (Edit/Write) | Flags which agents should review based on changed files |
| `dev-team-pre-commit-gate.js` | TaskCompleted | Memory freshness check before committing |
| `dev-team-pre-commit-lint.js` | PreToolUse (Bash) | Lint + format checks before git commit |
| `dev-team-watch-list.js` | PostToolUse (Edit/Write) | Custom pattern-to-agent matching |

All hooks are Node.js scripts — work on macOS, Linux, and Windows.

### 4. Task loop (iterative quality convergence)

`/dev-team:task` — inspired by the Ralph Loop pattern. When tasked with non-trivial work:
1. Implementing agent works
2. Review agents challenge in parallel
3. If `[DEFECT]` found → loop continues with fixes
4. If no `[DEFECT]` → done
5. Max iterations as safety cap

The adversarial review IS the quality gate — the implementing agent can't declare "done" alone.

### 5. Continuous learning

Each agent maintains persistent memory (`.claude/agent-memory/<agent>/MEMORY.md`) that is automatically injected into their context every session:
- Project-specific patterns and conventions
- Adversarial calibration (what was accepted/overruled)
- Quality benchmarks

Shared team memory (`.dev-team/learnings.md`) captures cross-cutting learnings.

### 6. CLI installer (onboarding wizard)

```bash
npx dev-team init       # Interactive wizard
npx dev-team init --all # Everything, no prompts
```

Asks:
- Which agents to install
- Which quality hooks to enable (TDD, safety, review flagging, or None)
- Issue/PR workflow preferences (GitHub Issues, Jira, Linear, Other, None)
- Branch naming convention (or None)

Creates `.claude/agents/`, `.dev-team/hooks/`, `.dev-team/skills/`, `.claude/agent-memory/`, updates `CLAUDE.md` and `.claude/settings.json`.

### 7. Skills

| Skill | Purpose |
|-------|---------|
| `/dev-team:challenge` | Devil's advocate — critically examine a proposal, approach, or implementation |
| `/dev-team:task` | Start an iterative task loop with adversarial review gates |

## Success Criteria

1. **Install in under 2 minutes**: `npx dev-team init --all` completes and produces working agents
2. **Agents are invokable**: `@dev-team-voss`, `@dev-team-mori`, `@dev-team-szabo`, `@dev-team-knuth`, `@dev-team-beck`, `@dev-team-deming` work in Claude Code immediately after install
3. **Hooks fire reliably**: Safety guard blocks dangerous commands, TDD enforcement blocks impl without tests
4. **Cross-platform**: Works on macOS, Linux, Windows with Node.js 18+
5. **Language-agnostic**: Agents produce useful reviews on any codebase (Node.js, Python, Go, Java, etc.)
6. **Agents improve over time**: Memory files show accumulated learnings after 5+ sessions
7. **Adversarial signal > noise**: `[DEFECT]` challenges are actionable, not generic checklists

## Non-Goals

- **Not an orchestration framework**: dev-team does not replace the human as decision-maker. Agents advise; humans decide.
- **Not a CI/CD tool**: Hooks run locally in Claude Code sessions, not in CI pipelines (though the project itself uses CI/CD for its own development).
- **Not framework-specific**: No React, Django, Rails, or any framework-specific knowledge. Agents are language-agnostic.
- **Not a replacement for human code review**: Agents augment human review, they don't replace it.
- **Not a complex multi-agent orchestration system**: The main thread orchestrates, agents are subagents. No autonomous agent-to-agent communication in v0.1.

## Phased Roadmap

### v0.1 — Foundation (current)
- 6 agents (Voss, Mori, Szabo, Knuth, Beck, Deming)
- 5 hooks (safety, TDD, post-change review, pre-commit gate, task loop)
- 2 skills (challenge, task)
- CLI installer with onboarding wizard
- Persistent agent memory + shared team learnings
- Challenge protocol with classification system

### v0.2 — Expansion
- Additional agents: Docs, Architect, Release Manager
- `/dev-team:review` skill (orchestrated multi-agent parallel review)
- `/dev-team:audit` skill (security + quality + coverage scan)
- `npx dev-team update` command (upgrade agents in-place)
- Enhanced onboarding (Deming auto-scans for linters, SAST, CI gaps)

### v0.3 — Distribution
- Plugin format for Claude Code marketplace
- `/dev-team:eject` command (plugin → local files)
- Custom agent authoring guide
- Preset bundles (backend-heavy, full-stack, data-pipeline)

### v0.4 — Orchestration
- Orchestrator / team lead agent (auto-delegates to specialists)
- Agent teams integration (direct inter-agent messaging)
- Agent watch lists (file pattern → auto-spawn domain agent)
- Post-commit hooks that auto-spawn reviewers

## Testing Strategy

### Unit tests
- CLI init logic (detection, prompting, file operations)
- File helpers (copy, merge, append-with-markers, settings merge)
- Hook logic (pattern matching, exit codes)

### Integration tests
- Fresh project installation
- Existing project installation (additive merge)
- Idempotency (run init twice)
- Cross-platform hook execution
- Agent frontmatter validation

### Scenario tests
- Small Node.js project: install dev-team, verify agents work
- Small Python project: verify language-agnostic claims
- Upgrade path: install v0.1, then v0.2, verify clean upgrade

### TDD enforcement
Implementation files cannot be modified without corresponding test changes. This prevents overengineering — you can only write code that a test demands.

## Release Process

### Versioning

Strict semantic versioning:
- **Major** (1.0.0 → 2.0.0): Breaking changes to agent behavior, hook behavior, CLI flags, or installed file structure that would break existing users.
- **Minor** (0.1.0 → 0.2.0): New agents, hooks, skills, or CLI features that are additive and backward-compatible.
- **Patch** (0.1.0 → 0.1.1): Bug fixes to existing agents, hooks, CLI, or documentation corrections.

### CI/CD

**Continuous Integration** (every push to `main` and every PR):
1. Test suite (unit + integration) across Node 18/20/22 × ubuntu/macos/windows
2. Agent frontmatter validation (required fields: name, description, model, memory)
3. Hook script syntax validation (Node `--check`)

**Release pipeline** (triggered by version tags `v*`):
1. Validate tag matches `package.json` version
2. Run full CI suite
3. Publish to npm
4. Create GitHub Release with changelog entry

### Prerequisites

Before the first release, these must be configured:
- [ ] `NPM_TOKEN` secret in GitHub repo settings (for npm publish)
- [ ] Branch protection on `main` (require PR, require CI pass, no force push)
- [ ] Verify `dev-team` package name is available on npm (or choose alternative)
- [ ] npm account or org configured for publishing

### Cutting a release

Every release follows this checklist:

```
1. Ensure main is green (CI passing, no open DEFECT issues)

2. Create a release branch:
   git checkout -b release/vX.Y.Z

3. Update version:
   - Edit package.json version field
   - Update CHANGELOG.md with new version entry

4. Changelog entry format:
   ## [X.Y.Z] - YYYY-MM-DD
   ### Added
   - New feature or agent
   ### Changed
   - Modified behavior
   ### Fixed
   - Bug fix

5. Commit:
   git commit -am "chore: release vX.Y.Z"

6. Open PR: release/vX.Y.Z → main
   - CI must pass
   - At least one human review

7. Merge PR

8. Tag the merge commit:
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z

9. Release workflow triggers automatically:
   - Validates tag matches package.json
   - Runs full test suite
   - Publishes to npm
   - Creates GitHub Release

10. Verify:
    - npm info dev-team shows new version
    - npx dev-team init --all works in a fresh directory
    - GitHub Release page has correct changelog
```

### What triggers a release

- **Feature complete for a roadmap milestone** (e.g., all v0.2 issues closed)
- **Critical bug fix** that affects users
- **Security fix** in hooks or agent behavior

Releases are deliberate, not automated on every merge. The team decides when to cut a release based on value delivered.

### Branch protection rules

The `main` branch should be protected with:
- Require PR before merging (no direct pushes)
- Require CI status checks to pass
- Require at least 1 review approval
- No force pushes
- No deletions

These are enforced by GitHub branch protection AND locally by `issue-pr-enforce.js` hook (`.claude/hooks/`).
