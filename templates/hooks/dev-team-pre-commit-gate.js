#!/usr/bin/env node

/**
 * dev-team-pre-commit-gate.js
 * TaskCompleted hook.
 *
 * When a task completes, checks staged changes and reminds about
 * review agents if they were not consulted. Advisory — always exits 0.
 */

"use strict";

const { execFileSync } = require("child_process");

let stagedFiles = "";
try {
  stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], {
    encoding: "utf-8",
    timeout: 5000,
  });
} catch {
  // Not in a git repo or git not available
  process.exit(0);
}

const files = stagedFiles.split("\n").filter(Boolean);

if (files.length === 0) {
  process.exit(0);
}

const reminders = [];

const hasSecurityFiles = files.some((f) =>
  /auth|login|password|token|session|crypto|secret|permission/.test(f),
);
if (hasSecurityFiles) {
  reminders.push("@dev-team-szabo for security review");
}

const hasImplFiles = files.some(
  (f) => /\.(js|ts|jsx|tsx|py|rb|go|java|rs)$/.test(f) && !/\.(test|spec)\./.test(f),
);
if (hasImplFiles) {
  reminders.push("@dev-team-knuth for quality audit");
}

const hasApiFiles = files.some((f) => /\/api\/|\/routes?\/|schema|\.graphql$/.test(f));
if (hasApiFiles) {
  reminders.push("@dev-team-mori for UI impact review");
}

if (reminders.length > 0) {
  console.log(`[dev-team pre-commit] Before committing, consider running: ${reminders.join(", ")}`);
}

process.exit(0);
