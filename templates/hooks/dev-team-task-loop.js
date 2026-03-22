#!/usr/bin/env node

/**
 * dev-team-task-loop.js
 * Stop hook — implements iterative task loop with adversarial review gates.
 *
 * When a task loop is active (.claude/dev-team-task.json exists):
 * - Intercepts session exit
 * - Checks if completion criteria are met (no [DEFECT] challenges)
 * - If not met, feeds the task back for another iteration
 * - Respects max iteration limit
 *
 * State file: .claude/dev-team-task.json (created by /dev-team:task skill)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(process.cwd(), ".claude", "dev-team-task.json");

// No state file means no active task loop — allow normal exit
if (!fs.existsSync(STATE_FILE)) {
  process.exit(0);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
} catch {
  // Corrupted state file — clean up and allow exit
  try {
    fs.unlinkSync(STATE_FILE);
  } catch {
    /* ignore */
  }
  process.exit(0);
}

const { prompt, iteration = 1, maxIterations = 10, sessionId: _sessionId } = state;

// Check iteration limit
if (iteration >= maxIterations) {
  console.log(
    `[dev-team task-loop] Max iterations (${maxIterations}) reached. Exiting loop. Review remaining issues manually.`,
  );
  try {
    fs.unlinkSync(STATE_FILE);
  } catch {
    /* ignore */
  }
  process.exit(0);
}

// Increment iteration and update state
state.iteration = iteration + 1;
try {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
} catch {
  // Can't write state — allow exit
  process.exit(0);
}

// Block exit and re-inject the task prompt
const output = JSON.stringify({
  decision: "block",
  reason: prompt,
  systemMessage: `[dev-team task-loop] Iteration ${iteration + 1}/${maxIterations}. Review findings and address any [DEFECT] challenges. When no [DEFECT] remains, output <promise>DONE</promise> to exit the loop. To cancel: delete .claude/dev-team-task.json`,
});

console.log(output);
process.exit(0);
