---
name: dev-team-review
description: Orchestrated multi-agent parallel review. Use to review a PR, branch, or set of changes with multiple specialist agents simultaneously. Spawns agents based on changed file patterns and produces a unified review summary.
disable-model-invocation: false
---

Run a multi-agent parallel review of: $ARGUMENTS

## Setup

0. **Parse flags:** If `$ARGUMENTS` contains `--light`, note LIGHT review mode and strip the flag. Process the remaining arguments as the review target.

1. Determine what to review:
   - If a PR number or branch is given, use `git diff` to get the changed files
   - If a directory or file pattern is given, review those files
   - If no argument, review all uncommitted changes (`git diff HEAD`)

2. Categorize changed files by domain to determine which agents to spawn. This skill is the **sole authority** for agent selection — the hooks no longer determine which agents to run. Use the following domain-to-agent routing to select reviewers based on the diff:
   - Security/auth/crypto/token → @dev-team-szabo
   - API routes/contracts/schemas → @dev-team-mori
   - Frontend/UI/components → @dev-team-rams
   - Config/data model/migrations → @dev-team-voss
   - Tooling/build/CI/linting → @dev-team-deming
   - Documentation/ADRs → @dev-team-tufte
   - Architecture/abstractions/boundaries → @dev-team-brooks
   - Release artifacts/versioning → @dev-team-conway
   - Infrastructure/deployment/ops → @dev-team-hamilton
   - Any implementation code (catch-all) → @dev-team-knuth + @dev-team-brooks

3. **Always-on reviewers** (spawn regardless of file patterns):
   - **@dev-team-szabo** — always included (security review)
   - **@dev-team-knuth** — included for any non-test code changes (quality/coverage)
   - **@dev-team-brooks** — included for any non-test code changes (architecture)

   **LIGHT review mode** (`--light` flag): Spawn only **one reviewer** — the most relevant agent based on file patterns. If no pattern-based agent is determined, default to @dev-team-knuth. In LIGHT mode, all findings are **advisory only** — `[DEFECT]` findings are downgraded to `[RISK]` in the report. LIGHT reviews do not block progress. The verdict is always "Approve (advisory)" with any findings noted.

## Pre-review validation

Before spawning reviewers, verify the changes are reviewable:
1. **Non-empty diff**: The diff contains actual changes to review. If empty, report "nothing to review" and stop.
2. **Tests pass**: If the project has a test command, confirm tests pass. Flag test failures in the review report header.

## Model assignment (alloy multi-model reviews)

Before spawning reviewers, read the `models` section from `.dev-team/config.json`:

```json
{
  "models": {
    "default": "opus",
    "agents": {
      "szabo": ["opus", "sonnet"],
      "knuth": ["opus", "sonnet"],
      "brooks": ["opus"],
      "voss": "sonnet"
    }
  }
}
```

**Rules:**
- `default` — model tier used for agents not listed in `agents`
- String value — single model, no shadow review
- Array value — ordered preference: first is primary, subsequent are shadow models for alloy reviews

**Alloy behavior by review tier:**

| Review tier | Model strategy |
|------------|---------------|
| LIGHT | Primary only (first model in array, or the string value) |
| FULL | Primary + first shadow (first two models in array) |
| DEEP | All models in array |

When alloy is enabled (agent has an array with 2+ models and the review tier calls for shadows):
1. Spawn the primary reviewer as normal (using the first model in the array via the agent's `model:` frontmatter field)
2. Spawn a shadow reviewer for each additional model the tier requires. Shadow reviewers use the same agent prompt but with a different `model:` field. Name them `{agent}-review-shadow-{model}` (e.g., `szabo-review-shadow-sonnet`)
3. Shadow reviews run in parallel with the primary review
4. If a shadow model fails (rate limit, unavailable), the review proceeds with the primary model alone — alloy is additive, not required

**Finding deduplication for alloy reviews:**
When multiple models review the same diff, deduplicate findings using structured matching:
1. Group findings by (file, line range, classification)
2. If all models flagged the same location + classification: mark as `unanimous` (high confidence)
3. If 2+ models flagged it: mark as `majority`
4. If only one model flagged it: mark as `unique:{model}` — these are the primary value of alloy reviews, do NOT discard them
5. Use the primary model's wording for the merged finding description

## Execution

1. Spawn each selected agent as a **parallel background subagent** using the Agent tool with `subagent_type: "general-purpose"`. Use the agent teammate naming convention: `{agent}-review` (e.g., `szabo-review`, `knuth-review`, `brooks-review`). Set the agent's `model:` based on the models config (see Model assignment above). **Timeout**: If a reviewer has not reported progress (status file or message) within 2 minutes, send a status ping. If no response within 1 additional minute, terminate the reviewer and proceed with findings from the other reviewers.

2. Each agent's prompt must include:
   - The agent's full definition (read from `.claude/agents/<agent>.agent.md`)
   - The list of changed files relevant to their domain
   - Instruction to produce classified findings: `[DEFECT]`, `[RISK]`, `[QUESTION]`, `[SUGGESTION]`
   - Instruction to read the actual code — not just the diff — for full context
   - In LIGHT mode: inform the reviewer that this is a LIGHT advisory review — findings will not block progress

3. Wait for all agents to complete (including shadow reviewers if alloy is active).

## Filter findings (judge pass)

Before producing the report, filter raw findings to maximize signal quality:
1. **Remove contradictions**: Drop findings that contradict existing ADRs (`docs/adr/`), learnings (`.claude/rules/dev-team-learnings.md`), or agent memory (`.claude/agent-memory/*/MEMORY.md`)
2. **Deduplicate**: When multiple agents flag the same issue, keep the most specific finding
3. **Consolidate suggestions**: Group `[SUGGESTION]`-level items into a single summary block
4. **Suppress generated file findings**: Skip findings on generated, vendored, or build artifacts
5. **Validate DEFECTs**: Each `[DEFECT]` must include a concrete scenario — downgrade to `[RISK]` if not
6. **Accept silence**: "No substantive findings" from a reviewer is a valid positive signal — do not request re-review
7. **LIGHT mode downgrade**: In LIGHT review mode, downgrade all `[DEFECT]` findings to `[RISK]` after validation

Log filtered findings in a "Filtered" section for calibration tracking.

## Report

Produce a unified review summary:

### Blocking findings ([DEFECT])

List all `[DEFECT]` findings from all agents. These must be resolved before merge.

In **LIGHT review mode**, this section is omitted — all findings appear under Advisory findings.

Format each as:
```
**[DEFECT]** @agent-name — file:line
Description of the defect and why it blocks.
```

### Advisory findings

Group by severity:
- **[RISK]** — likely failure modes
- **[QUESTION]** — decisions needing justification
- **[SUGGESTION]** — specific improvements

### Filtered

List findings removed during the judge pass, with the reason for filtering:
```
**Filtered** @agent-name — reason (contradicts ADR-NNN / duplicate of above / no concrete scenario / generated file)
Original finding summary.
```

### Verdict

- **Approve** — No `[DEFECT]` findings. Advisory items noted.
- **Approve (advisory)** — LIGHT review mode. All findings are advisory. Does not block progress.
- **Request changes** — `[DEFECT]` findings must be resolved.

State the verdict clearly. List what must be fixed for approval if requesting changes.

### Review sidecar (ADR-044)

After completing the review, write a sidecar file so the review-gate hook can verify the branch has been reviewed:

**Location:** `.dev-team/.reviews/<agent>--<sanitized-branch>.json`

**Branch sanitization:** Replace any character that is not alphanumeric or a hyphen with a hyphen.
Example: `feat/787-sidecar` → `feat-787-sidecar`

**Schema:**
```json
{
  "agent": "dev-team-knuth",
  "branch": "feat/787-sidecar",
  "reviewDepth": "FULL",
  "findings": [
    {
      "classification": "[DEFECT]",
      "description": "...",
      "line": 42,
      "resolved": false
    }
  ]
}
```

- `branch` — the full unsanitized branch name
- `reviewDepth` — `"LIGHT"` (advisory only, gate will not enforce) or `"FULL"` (blocking)
- `findings` — array of all findings; empty array if none
- `resolved` — set to `true` only when the finding has been explicitly addressed

In LIGHT review mode, set `reviewDepth: "LIGHT"` — the review-gate will treat all findings as advisory and will not block commits.

One sidecar per reviewing agent. Each agent writes its own sidecar. The filename prefix is the agent name (e.g., `dev-team-knuth`, `dev-team-szabo`).

### Platform detection

Before issuing any `gh issue`, `gh pr`, or other platform-specific CLI commands, check `.dev-team/config.json` for the `platform` and `issueTracker` fields. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`, `"other"`), adapt issue tracker and PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI for the configured platform. If `platform` is absent from config.json, default to `"github"`. The steps in this skill assume GitHub by default.

### Completion

After the review report is delivered:
1. Format the **finding outcome log** with every finding's classification, source agent, and outcome (accepted/overruled/ignored), including reasoning for overrules. Then call `/dev-team:extract` with the formatted log.
2. If `/dev-team:extract` was not called, the review is INCOMPLETE.
3. `/dev-team:extract` handles Borges spawning, metrics verification, and memory formation gates. Do not report the review as complete until `/dev-team:extract` reports success.
4. Include Borges's recommendations in the final report.
