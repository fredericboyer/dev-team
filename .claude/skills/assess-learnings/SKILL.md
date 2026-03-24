---
name: assess-learnings
description: Audit team learnings, agent memories, and CLAUDE.md template to identify project-agnostic improvements to dev-team templates. Creates GitHub issues for actionable items. Local to this repo — not shipped to users.
user_invocable: true
---

# Assess Learnings (Meta)

Audit `.dev-team/learnings.md`, agent memories, and `templates/CLAUDE.md` to identify **project-agnostic** improvements to the dev-team tool itself (templates, agent definitions, hooks, skills).

**Critical rule:** Every improvement must benefit ALL projects that install dev-team, not just this repo. If a finding is specific to this project, it stays in `.dev-team/learnings.md` — it does NOT become a template change.

## Steps

### 1. Read current state

- Read `.dev-team/learnings.md` — shared team learnings
- Read all `.dev-team/agent-memory/*/MEMORY.md` — agent calibration data
- Read `templates/CLAUDE.md` — the primary instruction surface shipped to all projects
- Read recent git log (`git log --oneline -20`) for context on recent changes

### 2. Assess each learning

For each entry in learnings.md, evaluate:

| Question | Action if yes |
|----------|---------------|
| Is this stale? (contradicted by current code) | Remove or update |
| Is this enforced? (hook, skill, or agent definition) | Mark as enforced |
| Should this be enforced? (repeated manually) | Create issue to add enforcement |
| Is this generic enough to bake into the tool? | Create issue in templates/ |
| Should this be in CLAUDE.md template? | Create issue to update templates/CLAUDE.md |
| Is this specific to this repo only? | Keep as-is |

### 3. Assess agent memories

For each agent memory file:
- Is it empty? → Flag as gap (Borges should have populated this)
- Is it stale? → Flag for update
- Does it contradict learnings.md? → Flag inconsistency
- Does it contain calibration that could improve the agent definition? → Create issue to update the agent template

### 4. Assess CLAUDE.md template

`templates/CLAUDE.md` is the primary instruction surface — every project gets it. Check:
- Are workflow instructions accurate? (agent table, hook triggers, skill list)
- Are there learnings that should be baked into CLAUDE.md as permanent instructions?
- Are there stale instructions that no longer match current behavior?
- Are there missing sections? (e.g., new skills added but not listed, new agents without hook descriptions)
- Does the "Hook directives are MANDATORY" section reflect current enforcement mechanisms?
- Is the "Learnings — where to write what" table still accurate?
- Does the skills list match what's actually in `templates/skills/`?
- Are agent descriptions consistent with their actual definitions in `templates/agents/`?

If CLAUDE.md template is outdated or incomplete, create an issue to update `templates/CLAUDE.md`.

### 5. Assess agent definitions for improvement

For each agent in `templates/agents/`:
- Read the agent definition and its memory file
- Compare against recent session findings — are there patterns the agent misses?
- Check if review findings reveal gaps in the agent's instructions
- Identify if the agent's scope, challenge style, or review protocol needs tuning
- Cross-reference with eval results (if available in `tests/evals/`) — do expected findings match actual agent behavior?

### 6. Identify improvement opportunities

Look for patterns across team learnings, agent memories, AND CLAUDE.md:
- Learnings that keep getting re-added (not sticking)
- Process friction points mentioned multiple times
- Workarounds that should be permanent fixes
- Gaps between what's documented and what's enforced
- Agent findings that were repeatedly overruled (calibration needed)
- Agent findings that were consistently valuable (reinforce in definition)
- Cross-agent blind spots (no agent catches a certain class of issue)
- CLAUDE.md instructions that conflict with actual behavior

### 7. Create issues

For each actionable finding, categorize and create:

**Every issue MUST target `templates/` (the shipped tool).** Do NOT modify `.dev-team/` directly — those files get overwritten by `dev-team update`. Improvements go into `templates/` and ship to all projects in the next release.

**Template improvements (project-agnostic):**
- Agent definition updates → `templates/agents/` (better instructions, scope, challenge style)
- Hook improvements → `templates/hooks/` (better patterns, fewer false positives)
- Skill improvements → `templates/skills/` (better workflows)
- CLAUDE.md template updates → `templates/CLAUDE.md` (accuracy, completeness, new sections)
- Enforcement gaps → new hooks or skill steps in templates

**Agent calibration (project-agnostic):**
- Patterns an agent consistently misses → improve the agent's template definition
- False positives an agent consistently produces → tighten the agent's review criteria
- Blind spots across all agents → consider new agent or expanded scope

**NOT template changes (keep in local learnings only):**
- Project-specific conventions (e.g., "we use PostgreSQL")
- Team-specific preferences (e.g., "prefer bundled PRs")
- Repo-specific workarounds

For each issue:
1. Create GitHub issue with appropriate milestone
2. Reference the specific learning, memory entry, or session evidence
3. Explain why this benefits all projects, not just this one

### 8. Clean up

- Remove stale learnings
- Update quality benchmarks
- Report summary: X learnings assessed, Y issues created, Z stale entries removed

## When to run

- End of major work sessions
- Before releases
- When learnings file exceeds 150 lines
- On request: `/assess-learnings`
