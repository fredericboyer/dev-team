#!/usr/bin/env node

/**
 * dev-team-pr-template.js
 * PreToolUse hook on Bash — validates PR body contains required sections from pr.template.
 *
 * Reads pr.template (array of section headings, e.g., ["## Summary", "## Test plan"])
 * and blocks the PR if any required section is missing from the body.
 *
 * When pr.template is empty or not set, skips validation.
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
    "[dev-team pr-template] WARNING: --skip-format used — PR format hooks bypassed. " +
      "This is logged as a process deviation for Borges calibration.",
  );
  process.exit(0);
}

const config = readConfig();
const pr = config.pr || {};
const template = pr.template;

// When template is not set or empty, skip validation
if (!Array.isArray(template) || template.length === 0) {
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
  console.error(
    "[dev-team pr-template] BLOCKED — PR body is empty but required sections are configured.\n",
  );
  console.error("  Required sections: " + template.join(", "));
  console.error("\nUse --skip-format to bypass.");
  process.exit(2);
}

// Check for each required section (case-insensitive)
const missingSections = [];
for (const section of template) {
  if (typeof section !== "string") continue;
  // Match the section heading at the start of a line
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("(?:^|\\n)" + escaped, "i");
  if (!pattern.test(body)) {
    missingSections.push(section);
  }
}

if (missingSections.length > 0) {
  console.error("[dev-team pr-template] BLOCKED — PR body is missing required sections.\n");
  console.error("  Missing: " + missingSections.join(", "));
  console.error("  Required: " + template.join(", "));
  console.error("\nAdd the missing sections to the PR body, or use --skip-format to bypass.");
  process.exit(2);
}

process.exit(0);
