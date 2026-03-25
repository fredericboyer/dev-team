---
name: assess-learnings
description: Audit team learnings, agent memories, and CLAUDE.md template to identify project-agnostic improvements to dev-team templates. Reports findings for human/orchestrator triage. Local to this repo — not shipped to users.
user_invocable: true
---

# Assess Learnings (Meta)

Audit `.dev-team/learnings.md`, agent memories, and `templates/CLAUDE.md` to identify **project-agnostic** improvements to the dev-team tool itself (templates, agent definitions, hooks, skills).

**Critical rule:** Every improvement must benefit ALL projects that install dev-team, not just this repo. If a finding is specific to this project, it stays in `.dev-team/learnings.md` — it does NOT become a template change.

**Assessment principle:** Use general detection patterns, not specific checklists. The goal is to find *any* inconsistency, staleness, or gap — not to check for known issues. Read each source, compare it against reality (actual files, actual behavior, actual counts), and flag anything that doesn't match. If a document says X but reality is Y, that's a finding — regardless of whether anyone has flagged it before.

## Steps

### 1. Read current state

- Read `.dev-team/learnings.md` — shared team learnings
- Read all `.dev-team/agent-memory/*/MEMORY.md` — agent calibration data
- Read `templates/CLAUDE.md` — the primary instruction surface shipped to all projects
- Read `CLAUDE.md` (project root) — includes both the dev-team managed section AND project-specific sections outside `<!-- dev-team:begin/end -->` markers
- Read `package.json` — for version, engines, dependencies, scripts
- Read `.dev-team/config.json` — for installed agents, hooks, skills configuration
- Read `.dev-team/metrics.md` — for calibration metrics (if exists)
- Read recent git log (`git log --oneline -20`) for context on recent changes
- Check latest release: `gh release list --limit 1`

### 2. Assess each learning

For each entry in learnings.md, evaluate:

| Question | Action if yes |
|----------|---------------|
| Is this stale? (contradicted by current code, config, or newer learnings) | Remove or update |
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
- Does it contain calibration that could improve the agent definition? → Capture as a finding and recommend an agent template update in the report

### 4. Assess CLAUDE.md (template AND project)

#### 4a. Template CLAUDE.md (`templates/CLAUDE.md`)

The primary instruction surface shipped to all projects. Check:
- Are workflow instructions accurate? (agent table, hook triggers, skill list)
- Are there learnings that should be baked into CLAUDE.md as permanent instructions?
- Are there stale instructions that no longer match current behavior?
- Are there missing sections? (e.g., new skills added but not listed, new agents without hook descriptions)
- Does the "Hook directives are MANDATORY" section reflect current enforcement mechanisms?
- Is the "Learnings — where to write what" table still accurate?
- Does the skills list match what's actually in `templates/skills/`?
- Are agent descriptions consistent with their actual definitions in `templates/agents/`?

#### 4b. Project CLAUDE.md — section OUTSIDE dev-team markers

The project-specific section (after `<!-- dev-team:end -->`) is NOT managed by dev-team update. It can drift. **Read every line** of the project-specific section and verify each claim:
- Does it reference tools, patterns, or workflows that are no longer current?
- Does it contradict the managed section above? Read both sections and compare — if the managed section describes one approach and the project section describes a different one, that's a DEFECT.
- Does it reference stale versions, paths, or conventions?
- For each technical claim (versions, tool names, workflow steps), verify against the actual source of truth (package.json, config files, installed tools).

#### 4c. Cross-file consistency

Claims made in one file should match reality in others. Verify:
- Version and runtime claims in documentation vs `package.json`
- Counts and inventories in learnings vs actual directory contents
- Configuration files vs actual installed files

### 5. Assess skills for behavior gaps

For each skill in `templates/skills/` AND `.claude/skills/`:

**Existence and format:**
- Read the skill definition
- Does it have proper frontmatter (name, description)?
- Does it follow the same structure as other skills?

**Behavioral accuracy:**
- Does the skill's documented behavior match how it's actually being used? **Verify by checking the last 5-10 merged PRs** (`gh pr list --state merged --limit 10 --json number`) — for each PR, check if the skill's steps were followed (e.g., were review comments addressed? were memory files updated? was the correct merge process used?).
- Are there steps that agents consistently skip? Look for "mandatory" or "MUST" instructions that lack a corresponding enforcement mechanism (hook or gate). Evidence of skipped steps includes: PRs merged without the skill being invoked, skill steps documented but no trace of their execution in PR history.

**Technical accuracy:**
- Does the skill reference tools, APIs, or commands that have changed since it was written?
- Are CLI commands in the skill correct for the current environment?

**Integration:**
- Does the skill integrate properly with other skills in the workflow?
- For workflow skills (`.claude/skills/`): does the skill match the project's actual workflow as documented in project CLAUDE.md?
- Are there steps the skill documents but doesn't fully implement? (e.g., does it instruct the agent to complete all parts of an interaction, or only some?)

**Completeness:**
- Does the skill handle all the scenarios it claims to? Check for edge cases it might miss.
- Is enforcement language consistent across similar skills?

### 6. Assess agent definitions for improvement

For each agent in `templates/agents/`:
- Read the agent definition and its memory file
- Compare against recent session findings — are there patterns the agent misses?
- Check if review findings reveal gaps in the agent's instructions
- Identify if the agent's scope, challenge style, or review protocol needs tuning
- Cross-reference with eval results (if available in `tests/evals/`) — do expected findings match actual agent behavior?

### 7. Identify improvement opportunities

Look for patterns across team learnings, agent memories, AND CLAUDE.md:
- Learnings that keep getting re-added (not sticking)
- Process friction points mentioned multiple times
- Workarounds that should be permanent fixes
- Gaps between what's documented and what's enforced
- Agent findings that were repeatedly overruled (calibration needed)
- Agent findings that were consistently valuable (reinforce in definition)
- Cross-agent blind spots (no agent catches a certain class of issue)
- CLAUDE.md instructions that conflict with actual behavior

### 8. Report findings

**Default: report only.** Do NOT create GitHub issues automatically. Present all findings to the caller as a structured report. The human or orchestrator decides which findings become issues.

For each finding, include:
1. **Severity**: DEFECT / RISK / SUGGESTION
2. **Description**: what's wrong and why
3. **Files affected**: specific paths
4. **Category**: which step found it (learnings / agent memory / CLAUDE.md / skills / agent definitions)
5. **Existing issue**: if an open issue already covers this, reference it. Check `gh issue list --state open`.
6. **Recommended action**: what should be done (template change, project-specific fix, learning update, etc.)

Categorize recommendations as:
- **Template improvements (project-agnostic)** → `templates/` changes that benefit all projects
- **Project-specific fixes** → `.claude/skills/`, project CLAUDE.md, learnings
- **No action needed** → already covered or not worth the effort

### 9. Clean up

- Remove stale learnings
- Update quality benchmarks
- Report summary: X learnings assessed, Y issues created, Z stale entries removed

## When to run

- End of major work sessions
- Before releases
- When learnings file exceeds 150 lines
- On request: `/assess-learnings`
