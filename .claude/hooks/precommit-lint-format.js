#!/usr/bin/env node

/**
 * dev-team-precommit-lint-format.js
 * PreToolUse hook on Bash.
 *
 * Before a git commit, runs full oxlint + oxfmt --check on src/, scripts/, templates/hooks/.
 * Exit 2 = block, exit 0 = allow.
 */

"use strict";

const { execFileSync } = require("child_process");

let input = {};
try {
  input = JSON.parse(require("fs").readFileSync(0, "utf-8"));
} catch {
  process.exit(0);
}

const command = (input.tool_input && input.tool_input.command) || "";

if (!/\bgit\s+commit\b/.test(command)) {
  process.exit(0);
}

const dirs = ["src/", "scripts/", "templates/hooks/"];

// Run oxlint
try {
  execFileSync("npx", ["oxlint", ...dirs], { encoding: "utf-8", timeout: 30000, stdio: "pipe" });
} catch (err) {
  if (err.stdout) process.stdout.write(err.stdout);
  if (err.stderr) process.stderr.write(err.stderr);
  console.error("[dev-team precommit] Lint errors found. Fix them before committing.");
  process.exit(2);
}

// Run oxfmt --check
try {
  execFileSync("npx", ["oxfmt", "--check", ...dirs], { encoding: "utf-8", timeout: 30000, stdio: "pipe" });
} catch (err) {
  if (err.stdout) process.stdout.write(err.stdout);
  if (err.stderr) process.stderr.write(err.stderr);
  console.error("[dev-team precommit] Formatting issues found. Run `npm run format` before committing.");
  process.exit(2);
}

process.exit(0);
