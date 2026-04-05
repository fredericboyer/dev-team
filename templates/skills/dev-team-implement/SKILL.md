---
name: dev-team-implement
description: Implement a task on a feature branch with architect pre-assessment, agent selection, and validation. Use standalone or as Step 1 of /dev-team:task.
disable-model-invocation: false
---

Implement: $ARGUMENTS

## Setup

1. Parse the task description and any flags:
   - `--skip-assessment` — skip Brooks pre-assessment (for bug fixes, typo fixes, config tweaks)

2. Determine the right implementing agent based on the task:
   - Backend/API/data work -> @dev-team-voss
   - Frontend/UI work -> @dev-team-mori
   - Tooling/config -> @dev-team-deming
   - Documentation -> @dev-team-tufte
   - Release/versioning -> @dev-team-conway
   - Infrastructure/CI/Docker/deployment -> @dev-team-hamilton

   For tasks that require **research/investigation** before implementation, optionally spawn @dev-team-turing as a pre-implementation research agent before selecting the implementing agent above. Turing is read-only — it produces research briefs, not code changes.

3. **Architect pre-assessment** (skip if `--skip-assessment` or trivial change):
   Spawn @dev-team-brooks to assess:
   - Does this task introduce a new pattern, tool, or convention?
   - Does it change module boundaries, dependency direction, or layer responsibilities?
   - Does it contradict or extend an existing ADR?

   Architect returns:
   - `ADR needed: yes/no`. If yes: `topic: <X>, proposed title: ADR-NNN: <title>`.
   - `Complexity: SIMPLE | COMPLEX`

   **Complexity classification:**
   - **SIMPLE** — single-file changes, documentation updates, config tweaks, straightforward bug fixes, test additions for existing code
   - **COMPLEX** — multi-file changes, new architectural patterns, ADR-needed work, new integrations, cross-module refactors

   If an ADR is needed, include "Write ADR-NNN: <title>" in the implementation task. The implementing agent writes the ADR file.

   **Write assessment sidecar** — after the pre-assessment completes, write the complexity classification to `.dev-team/.assessments/<sanitized-branch>.json` so the merge gate can enforce the correct review tier:

   ```json
   {
     "branch": "<branch-name>",
     "complexity": "SIMPLE | COMPLEX",
     "reviewTier": "LIGHT | FULL",
     "requiredReviewers": ["szabo", "knuth"],
     "assessedAt": "<ISO-8601 timestamp>"
   }
   ```

   For SIMPLE tasks, `requiredReviewers` should be an empty array (Copilot-only is sufficient). For COMPLEX tasks, include the agents that must review before merge. Sanitize the branch name for the filename by replacing non-alphanumeric characters (except hyphens) with hyphens.

   **Timeout**: If the pre-assessment agent has not reported progress within 2 minutes, send a status ping. If no response within 1 additional minute, terminate and either perform the pre-assessment yourself or skip it.

## Definition of Done (COMPLEX tasks only)

For tasks classified as **COMPLEX**, negotiate acceptance criteria before implementation begins. Skip this step entirely for **SIMPLE** tasks.

1. The implementing agent proposes **3-5 testable acceptance criteria** based on the task description and Brooks' pre-assessment. Criteria must specify **WHAT** (observable outcomes) not **HOW** (implementation details).

2. The orchestrator reviews and confirms the criteria before proceeding. If criteria are unclear or incomplete, request revision (one round).

3. Confirmed criteria become the **exit checklist** for validation — in addition to the standard validation checks.

## Pre-implementation: best-practices research

Before the first iteration, the implementing agent should research current best practices relevant to the task — checking official documentation for the tools, frameworks, and platforms involved. This ensures decisions are based on current ecosystem recommendations, not stale assumptions. When current best practices conflict with established codebase conventions, prefer consistency and flag the newer approach as a `[SUGGESTION]` with a migration path.

## Implementation

The implementing agent works on the task on a feature branch.

**Timeout**: If the implementing agent has not reported progress (status file, message, or commit) within 2 minutes, send a status ping. If no response within 1 additional minute, terminate the agent, assess what was completed, and either resume the work yourself or re-spawn a fresh agent with the remaining tasks.

**Validation** — before completion, verify:

- Non-empty diff: `git diff` shows actual changes
- Tests pass: test command executed with exit code 0
- Relevance: changed files relate to the stated issue
- Clean working tree: no uncommitted debris
- If validation fails, route back to implementer with specific failure reason. If it fails twice, escalate to human.

**Deliver the work**: Push the branch to remote. PR creation is handled by the orchestrator or a separate pipeline step (`/dev-team:pr`). Do NOT create a PR from this skill.

**Clean up worktree**: If the work was done in a worktree, clean it up after the branch is pushed.

## Output

Return a structured summary:

- Branch name
- Files changed
- Complexity classification
- Whether ADR was written

## Security preamble

Before starting work, check for open security alerts using the project's security monitoring process (e.g., a `/security-status` skill). Flag any critical findings before proceeding.
