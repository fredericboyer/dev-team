---
name: dev-team:task
description: Start an iterative task loop with adversarial review gates. Use when the user wants a task implemented with automatic quality convergence — the loop continues until no [DEFECT] challenges remain or max iterations are reached.
---

Start a task loop for: $ARGUMENTS

## Setup

1. Parse the task description and any flags:
   - `--max-iterations N` (default: 10)
   - `--reviewers` (default: @dev-team-szabo, @dev-team-knuth)

2. Create the state file `.claude/dev-team-task.json`:
```json
{
  "prompt": "<the original task description>",
  "iteration": 1,
  "maxIterations": <N>,
  "reviewers": ["dev-team-szabo", "dev-team-knuth"]
}
```

3. Determine the right implementing agent based on the task:
   - Backend/API/data work → @dev-team-voss
   - Frontend/UI work → @dev-team-mori
   - Test writing → @dev-team-beck
   - Tooling/config → @dev-team-deming
   - Documentation → @dev-team-tufte
   - Release/versioning → @dev-team-conway

4. **Architect pre-assessment** (skip for bug fixes, typo fixes, config tweaks):
   Spawn @dev-team-brooks to assess:
   - Does this task introduce a new pattern, tool, or convention?
   - Does it change module boundaries, dependency direction, or layer responsibilities?
   - Does it contradict or extend an existing ADR?

   Architect returns: `ADR needed: yes/no`. If yes: `topic: <X>, proposed title: ADR-NNN: <title>`.

   If an ADR is needed, include "Write ADR-NNN: <title>" in the implementation task. The implementing agent writes the ADR file. Architect reviews it post-implementation alongside code review.

## Execution loop

Each iteration:
1. The implementing agent works on the task.
2. After implementation, spawn review agents in parallel as background tasks.
3. Collect classified challenges from reviewers.
4. If any `[DEFECT]` challenges exist, address them in the next iteration.
5. If no `[DEFECT]` remains, output `<promise>DONE</promise>` to exit the loop.

The Stop hook (`dev-team-task-loop.js`) manages iteration counting and re-injection.

## Parallel mode

When multiple issues are being addressed in a single session, the task loop switches to parallel orchestration (see ADR-019). Drucker coordinates all phases.

### Phase 0: Brooks pre-assessment (batch)
Spawn @dev-team-brooks once with all issues. Brooks identifies:
- **File independence**: which issues touch overlapping files (conflict groups that must run sequentially)
- **ADR needs** across the batch
- **Architectural interactions** between issues

Issues in the same conflict group execute sequentially. Independent issues proceed in parallel.

### Phase 1: Parallel implementation
Drucker spawns one implementing agent per independent issue, each on its own branch (`feat/<issue>-<description>`). Agents work concurrently without awareness of each other. Track state in `.claude/dev-team-parallel.json`:
```json
{
  "mode": "parallel",
  "issues": [
    { "issue": 42, "branch": "feat/42-add-auth", "agent": "dev-team-voss", "status": "implementing" },
    { "issue": 43, "branch": "feat/43-fix-nav", "agent": "dev-team-mori", "status": "implementing" }
  ],
  "phase": "implementation",
  "conflictGroups": [[42, 55]],
  "reviewWave": null
}
```

### Phase 2: Review wave
Reviews do **not** start until **all** implementation agents have completed. Once all are done, spawn review agents (Szabo + Knuth, plus conditional reviewers) in parallel across all branches simultaneously. Each reviewer receives the diff for one specific branch and produces classified findings scoped to that branch.

### Phase 3: Defect routing
Collect all findings. Route `[DEFECT]` items back to the original implementing agent for each branch. Agents fix defects on their own branch. After fixes, another review wave runs. Continue until no `[DEFECT]` findings remain or the per-branch iteration limit is reached.

### Phase 4: Borges completion
Borges runs **once** across all branches after the final review wave clears. This ensures cross-branch coherence: memory files are consistent, learnings are not duplicated, and system improvement recommendations consider the full batch.

### Convergence criteria
Parallel mode is complete when:
1. All branches have zero `[DEFECT]` findings, OR the per-branch iteration limit (default: 10) is reached
2. Borges has run across all branches
3. `.claude/dev-team-parallel.json` is deleted

## Completion

When the loop exits:
1. Delete `.claude/dev-team-task.json`.
2. Spawn **@dev-team-borges** (Librarian) to review memory freshness, cross-agent coherence, and system improvement opportunities. This is mandatory.
3. Summarize what was accomplished across all iterations.
4. Report any remaining `[RISK]` or `[SUGGESTION]` items, including Borges's recommendations.
5. Write key learnings to agent MEMORY.md files.
