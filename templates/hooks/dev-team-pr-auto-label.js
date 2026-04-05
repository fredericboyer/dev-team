#!/usr/bin/env node

/**
 * dev-team-pr-auto-label.js
 * PreToolUse hook on Bash — appends --label flags based on branch prefix.
 *
 * When pr.autoLabel is true, maps branch prefixes to GitHub labels:
 *   feat/  -> enhancement
 *   fix/   -> bug
 *   docs/  -> documentation
 *   chore/ -> chore
 *   test/  -> test
 *
 * The hook outputs advisory label suggestions. It never blocks.
 *
 * When pr.autoLabel is not true, exits 0 immediately.
 * When workflow.pr is false, exits 0 immediately.
 * --skip-format in the command bypasses all PR format hooks (logged as deviation).
 */

"use strict";

const { execFileSync } = require("child_process");
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
    "[dev-team pr-auto-label] WARNING: --skip-format used — PR format hooks bypassed. " +
      "This is logged as a process deviation for Borges calibration.",
  );
  process.exit(0);
}

const config = readConfig();
const pr = config.pr || {};

if (pr.autoLabel !== true) {
  process.exit(0);
}

// Determine current branch
let branch = "";
try {
  branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 3000,
  }).trim();
} catch {
  process.exit(0);
}

if (!branch || branch === "HEAD") {
  process.exit(0);
}

// Map branch prefixes to labels
const PREFIX_LABEL_MAP = {
  "feat/": "enhancement",
  "fix/": "bug",
  "docs/": "documentation",
  "chore/": "chore",
  "test/": "test",
};

const labelsToAdd = [];
for (const [prefix, label] of Object.entries(PREFIX_LABEL_MAP)) {
  if (branch.startsWith(prefix)) {
    // Check if this label is already in the command
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const labelPattern = new RegExp("--label\\s+['\"]?" + escapedLabel + "['\"]?", "i");
    if (!labelPattern.test(command)) {
      labelsToAdd.push(label);
    }
  }
}

if (labelsToAdd.length === 0) {
  process.exit(0);
}

// Output the labels to append
const labelFlags = labelsToAdd.map((l) => "--label " + l).join(" ");
console.log(
  "[dev-team pr-auto-label] Auto-labeling from branch prefix '" + branch.split("/")[0] + "/':",
);
console.log("  Appending: " + labelFlags);
console.log("  Tip: the agent should add " + labelFlags + " to the gh pr create command.");

process.exit(0);
