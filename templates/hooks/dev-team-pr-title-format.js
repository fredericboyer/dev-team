#!/usr/bin/env node
"use strict";
const { isEnabled, readConfig } = require("./lib/workflow-config");
let input = {};
try { input = JSON.parse(process.argv[2] || "{}"); } catch { process.exit(0); }
const command = (input.tool_input && input.tool_input.command) || "";
if (!/\bgh\s+pr\s+create\b/.test(command)) process.exit(0);
if (!isEnabled("pr")) process.exit(0);
if (/--skip-format\b/.test(command)) {
  console.warn("[dev-team pr-title-format] WARNING: --skip-format used — PR format hooks bypassed.");
  process.exit(0);
}
const config = readConfig();
const pr = config.pr || {};
const titleFormat = pr.titleFormat || "conventional";
const titleMatch = command.match(/--title\s+(?:"([^"]*)"|'([^']*)'|(\S+))/);
if (!titleMatch) process.exit(0);
const title = titleMatch[1] || titleMatch[2] || titleMatch[3] || "";
if (!title) process.exit(0);
const CONVENTIONAL = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?:\s+.+/;
const ISSUE_PREFIX = /^\[#\d+\]\s+.+/;
if (titleFormat === "conventional" && !CONVENTIONAL.test(title)) {
  console.error("[dev-team pr-title-format] BLOCKED — title does not match conventional commits format.");
  console.error("\n  Expected: type(scope)?: description");
  console.error("  Got:      " + title);
  console.error("\nUse --skip-format to bypass.");
  process.exit(2);
}
if (titleFormat === "issue-prefix" && !ISSUE_PREFIX.test(title)) {
  console.error("[dev-team pr-title-format] BLOCKED — title must start with [#NNN].");
  console.error("\n  Expected: [#123] description");
  console.error("  Got:      " + title);
  console.error("\nUse --skip-format to bypass.");
  process.exit(2);
}
process.exit(0);
