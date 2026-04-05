#!/usr/bin/env node

/**
 * dev-team-pr-title-format.js
 * PreToolUse hook on Bash — validates PR title matches pr.titleFormat config.
 *
 * Formats:
 *   - "conventional": title matches conventional commits (feat: ..., fix: ..., etc.)
 *   - "plain": any title accepted
 *   - "issue-prefix": title starts with [#NNN]
 *
 * Escape hatch: --skip-format bypasses all PR format hooks.
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

if (!/\bgh\s+pr\s+create\b/.test(command)) {
  process.exit(0);
}

if (/--skip-format\b/.test(command)) {
  console.warn(
    "[dev-team pr-title-format] WARNING: --skip-format used — PR format hooks bypassed.",
  );
  process.exit(0);
}

if (!isEnabled("pr")) {
  process.exit(0);
}

const config = readConfig();

const titleFormat = (config.pr && config.pr.titleFormat) || "plain";

if (titleFormat === "plain") {
  process.exit(0);
}

const titleMatch = command.match(/--title\s+(?:"([^"]+)"|'([^']+)'|(\S+))/);
if (!titleMatch) {
  process.exit(0);
}
const title = titleMatch[1] || titleMatch[2] || titleMatch[3];

if (titleFormat === "conventional") {
  const conventionalPattern =
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s.+/;
  if (!conventionalPattern.test(title)) {
    console.error(
      `[dev-team pr-title-format] BLOCKED — title "${title}" does not match conventional commits format.`,
    );
    console.error("  Expected: <type>(<scope>): <description>");
    console.error(
      "  Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert",
    );
    process.exit(2);
  }
}

if (titleFormat === "issue-prefix") {
  if (!/^\[#\d+\]/.test(title)) {
    console.error(`[dev-team pr-title-format] BLOCKED — title "${title}" missing issue prefix.`);
    console.error("  Expected: [#NNN] <description>");
    process.exit(2);
  }
}

process.exit(0);
