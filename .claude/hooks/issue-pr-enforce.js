#!/usr/bin/env node

/**
 * issue-pr-enforce.js
 *
 * PreToolUse hook on Bash — enforces GitHub Issue + PR workflow.
 * DEV-TEAM PROJECT ONLY. Not shipped to target projects.
 *
 * - Blocks git commit without issue reference (#123, fixes #123, refs #123)
 * - Blocks git push to main/master
 * - Warns if branch name lacks issue number
 */

"use strict";

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch (err) {
  console.warn(
    `[dev-team issue-pr-enforce] Warning: Failed to parse hook input, allowing operation. ${err.message}`,
  );
  process.exit(0);
}
const command = (input.tool_input && input.tool_input.command) || "";

function isGitCommit(cmd) {
  return /\bgit\s+commit\b/.test(cmd);
}

function isPushToMain(cmd) {
  return /\bgit\s+push\b.*\b(main|master)\b/.test(cmd);
}

function isNewBranch(cmd) {
  return /\bgit\s+(checkout\s+-b|branch)\b/.test(cmd);
}

function hasIssueRef(cmd) {
  return /(#\d+|GH-\d+|fixes\s+#\d+|refs\s+#\d+|closes\s+#\d+)/i.test(cmd);
}

function branchHasIssueNumber(cmd) {
  // Match patterns like feat/123-desc or fix/456-desc
  return /\b(feat|fix|chore|docs|refactor|test)\/\d+/.test(cmd);
}

// Check git commit for issue reference
if (isGitCommit(command)) {
  if (!hasIssueRef(command)) {
    console.error(
      'Commit must reference a GitHub Issue. Use "fixes #123" or "refs #123" in your commit message.',
    );
    process.exit(2);
  }
}

// Block direct push to main/master
if (isPushToMain(command)) {
  console.error("Direct push to main/master is blocked. Create a PR instead.");
  process.exit(2);
}

// Warn if new branch lacks issue number
if (isNewBranch(command) && !branchHasIssueNumber(command)) {
  console.log("Advisory: Branch name should include issue number (e.g., feat/123-description).");
}

process.exit(0);
