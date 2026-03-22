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

## Execution loop

Each iteration:
1. The implementing agent works on the task.
2. After implementation, spawn review agents in parallel as background tasks.
3. Collect classified challenges from reviewers.
4. If any `[DEFECT]` challenges exist, address them in the next iteration.
5. If no `[DEFECT]` remains, output `<promise>DONE</promise>` to exit the loop.

The Stop hook (`dev-team-task-loop.js`) manages iteration counting and re-injection.

## Completion

When the loop exits:
1. Delete `.claude/dev-team-task.json`.
2. Summarize what was accomplished across all iterations.
3. Report any remaining `[RISK]` or `[SUGGESTION]` items for the human to review.
4. Write key learnings to agent MEMORY.md files.
