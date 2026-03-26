<!-- dev-team:begin -->

## Dev Team

This project uses [dev-team](https://github.com/dev-team) — adversarial AI agents that enforce quality through productive friction.

### Agents

Available agents: `@dev-team-voss`, `@dev-team-hamilton`, `@dev-team-mori`, `@dev-team-szabo`, `@dev-team-knuth`, `@dev-team-beck`, `@dev-team-deming`, `@dev-team-tufte`, `@dev-team-brooks`, `@dev-team-conway`, `@dev-team-drucker`, `@dev-team-turing`, `@dev-team-rams`, `@dev-team-borges`. See `.dev-team/agents/` for full definitions, roles, and when to use each agent.

### Capabilities

For automatic delegation, use `@dev-team-drucker` — it analyzes the task and routes to the right specialist.

For non-trivial work: explore the area first, then implement, then review.

**Automatic invocation (hooks):** Agents are auto-spawned based on changed file patterns. See `.dev-team/hooks/` for the watch-list patterns that determine which agents are triggered. Turing is on-demand only (spawned by Drucker for research tasks).

**End-of-workflow agents:** Borges is mandatory at end of every `/dev-team:task`, `/dev-team:review`, `/dev-team:audit`, and `/dev-team:retro`.

**Orchestration:** Drucker delegates tasks to the right implementing agent and spawns reviewers. Szabo, Knuth, and Brooks review all code changes.

**CRITICAL: Always run agents in the background.** When spawning Drucker or any agent for tasks that take more than a few seconds, use `run_in_background: true`. The main conversation loop must remain interactive.

Agents challenge each other using classified findings:
- `[DEFECT]` blocks progress. `[RISK]`, `[QUESTION]`, `[SUGGESTION]` are advisory.
- When agents disagree, they escalate to the human after one exchange each. Human decides.

### Parallel execution

When working on multiple independent issues, combine agent teams with worktree isolation:

- **Implementing agents** must use both `team_name` and `isolation: "worktree"` to prevent branch conflicts between parallel teammates.
- **Review/read-only agents** should assess whether they need access to an implementer's worktree (to run tests or read changed files in context), or should work in their own isolation for independent analysis.

**Agent teammate naming convention:** Use `{agent}-{role}[-{qualifier}]` when spawning teammates:
- `{agent}` — dev-team agent name (lowercase): `voss`, `deming`, `szabo`, etc.
- `{role}` — action: `implement`, `review`, `research`, `audit`, `extract`
- `{qualifier}` — optional, for disambiguation when multiple agents of the same type run in parallel (e.g., issue number, feature name)

| Role suffix | When used | Examples |
|-------------|-----------|---------|
| `-implement` | Implementing agent on a task branch | `voss-implement`, `deming-implement-auth` |
| `-review` | Reviewer in a review wave | `szabo-review`, `knuth-review` |
| `-research` | Turing research brief | `turing-research`, `turing-research-caching` |
| `-audit` | Full codebase audit pass | `szabo-audit`, `knuth-audit` |
| `-extract` | Borges memory extraction | `borges-extract` |

Drucker coordinates the review wave after all implementations complete.

**Handling unresponsive agents:** Background agents can get stuck without producing output. Apply this escalation pattern:
1. If an agent has not reported progress (status file, message, or commit) within **3 minutes**, send a status ping via `SendMessage`.
2. If no response within **1 additional minute**, terminate the agent.
3. Assess what was completed: check for partial output (status files, commits, branch changes).
4. Either re-spawn a fresh agent with the remaining work, or complete the work yourself.
5. Do not wait indefinitely — an unresponsive agent will not recover on its own.

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

| What | Where |
|------|-------|
| Project patterns, process rules, tech debt, overruled challenges | `.dev-team/learnings.md` (Tier 1) |
| Agent-specific calibration | `.dev-team/agent-memory/<agent>/MEMORY.md` (Tier 2) |
| Formal architecture decisions | `docs/adr/` |
| User-specific preferences only | Machine-local memory |

**Memory evolution:** New entries trigger re-evaluation of related existing entries. Duplicates are merged, contradictions are superseded, and 3+ overrules on the same tag generate calibration rules.

**Temporal decay:** Entries have `Last-verified` dates. Borges flags entries not verified in 30+ days and archives entries over 90 days to the `## Archive` section.

When the human gives feedback about process, coding style, or tool behavior: write it to `.dev-team/learnings.md`. Only use machine-local memory for things that are truly personal and would not apply to another developer on the same project.

<!-- dev-team:end -->
