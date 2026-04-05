#!/usr/bin/env node

/**
 * dev-team-pr-link-keyword.js
 * PreToolUse hook on Bash — validates PR body contains a link keyword referencing an issue.
 *
 * Checks that the PR body contains `<linkKeyword> #NNN` (e.g., "Closes #123").
 * When pr.linkKeyword is empty or not set, skips validation.
 * When workflow.pr is false, exits 0 immediately.
 * --skip-format in the command bypasses all PR format hooks (logged as deviation).
 */

"use strict";

const { readConfig, isEnabled } = require("./lib/workflow-config");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  process.exit(0);
}

const command = (input.tool_input && input.tool_input.command) || "";

// Only intercept gh pr create commands
if (!/\bgh\s+pr\s+create\b/.test(command)) {
  process.exit(0);
}

// Skip when PR workflow is disabled
if (!isEnabled("pr")) {
  process.exit(0);
}

// Escape hatch
if (/--skip-format\b/.test(command)) {
  console.warn(
    "[dev-team pr-link-keyword] WARNING: --skip-format used — PR format hooks bypassed. " +
      "This is logged as a process deviation for Borges calibration.",
  );
  process.exit(0);
}

const config = readConfig();
const pr = config.pr || {};
const linkKeyword = pr.linkKeyword || "";

// When linkKeyword is empty, skip validation
if (!linkKeyword) {
  process.exit(0);
}

// Extract --body value from command
const bodyMatch = command.match(/--body\s+(?:"([\s\S]*?)(?<!\\)"|'([\s\S]*?)'|(\S+))/);
if (!bodyMatch) {
  // No --body flag — gh pr create will prompt interactively, we cannot validate
  process.exit(0);
}
const body = (bodyMatch[1] || bodyMatch[2] || bodyMatch[3] || "").replace(/\\"/g, '"');

if (!body) {
  process.exit(0);
}

// Check for linkKeyword followed by #NNN (case-insensitive)
const escaped = linkKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(escaped + "\\s+#\\d+", "i");
if (!pattern.test(body)) {
  console.error("[dev-team pr-link-keyword] BLOCKED — PR body must contain an issue link.\n");
  console.error("  Expected: " + linkKeyword + " #NNN");
  console.error('  Example: "' + linkKeyword + ' #123"');
  console.error("\nUse --skip-format to bypass.");
  process.exit(2);
}

process.exit(0);
