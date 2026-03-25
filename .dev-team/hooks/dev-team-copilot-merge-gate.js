#!/usr/bin/env node

/**
 * dev-team-copilot-merge-gate.js
 * PreToolUse hook on Bash.
 *
 * Blocks direct PR merge commands that bypass Copilot review verification.
 * Forces all merges through the /dev-team:merge skill which enforces
 * the Copilot review wait-and-address protocol.
 *
 * Exit 2 = block, exit 0 = allow.
 */

"use strict";

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch (err) {
  process.exit(0); // don't block on parse failure — other hooks handle that
}

const command = (input.tool_input && input.tool_input.command) || "";

// Detect direct merge attempts that bypass Copilot review protocol
const MERGE_PATTERNS = [
  {
    pattern: /\bgh\s+pr\s+merge\b/,
    reason:
      "Direct `gh pr merge` bypasses Copilot review verification. Use the /dev-team:merge skill instead, which enforces the Copilot wait-and-address protocol.",
  },
  {
    pattern: /pulls\/\d+\/merge/,
    reason:
      "Direct API merge bypasses Copilot review verification. Use the /dev-team:merge skill instead, which enforces the Copilot wait-and-address protocol.",
  },
];

// Allow if the command is just checking merge status (GET, not PUT)
const isReadOnly =
  /\bcurl\b/.test(command) &&
  !/-X\s*(PUT|POST|PATCH)\b/.test(command) &&
  !/--request\s*(PUT|POST|PATCH)\b/.test(command);

if (isReadOnly) {
  process.exit(0);
}

// Allow auto-merge enablement (enablePullRequestAutoMerge) — the merge skill uses this
if (/enablePullRequestAutoMerge/.test(command) || /disablePullRequestAutoMerge/.test(command)) {
  process.exit(0);
}

for (const { pattern, reason } of MERGE_PATTERNS) {
  if (pattern.test(command)) {
    console.error(`[dev-team copilot-merge-gate] BLOCKED: ${reason}`);
    process.exit(2);
  }
}

process.exit(0);
