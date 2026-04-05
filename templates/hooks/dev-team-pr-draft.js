#!/usr/bin/env node

/**
 * dev-team-pr-draft.js
 * PreToolUse hook on Bash — warns when pr.draft is true but --draft flag is missing.
 *
 * This is advisory only (never blocks). When pr.draft is true, the team prefers
 * draft PRs for initial creation. The hook warns but allows the command to proceed.
 *
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
    "[dev-team pr-draft] WARNING: --skip-format used — PR format hooks bypassed. " +
      "This is logged as a process deviation for Borges calibration.",
  );
  process.exit(0);
}

const config = readConfig();
const pr = config.pr || {};

// Only check when pr.draft is explicitly true
if (pr.draft !== true) {
  process.exit(0);
}

// Check if --draft flag is present
if (/--draft\b/.test(command)) {
  process.exit(0);
}

// Advisory warning — do NOT block (exit 0, not exit 2)
console.warn(
  "[dev-team pr-draft] WARNING: pr.draft is enabled but --draft flag is missing.\n" +
    "  Consider adding --draft to create the PR as a draft.\n" +
    "  This is advisory only — the PR will be created as non-draft.",
);

process.exit(0);
