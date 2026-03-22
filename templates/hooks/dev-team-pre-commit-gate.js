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

// Memory freshness check: if significant work was done but no memory files were updated, remind.
const hasMemoryUpdates = files.some(
  (f) => f.endsWith("dev-team-learnings.md") || /agent-memory\/.*MEMORY\.md$/.test(f),
);

if (hasImplFiles && !hasMemoryUpdates) {
  // Check unstaged memory changes too — author may have updated but not staged yet
  let unstagedMemory = false;
  try {
    const unstaged = execFileSync("git", ["diff", "--name-only"], {
      encoding: "utf-8",
      timeout: 5000,
    });
    unstagedMemory = unstaged
      .split("\n")
      .some((f) => f.endsWith("dev-team-learnings.md") || /agent-memory\/.*MEMORY\.md$/.test(f));
  } catch {
    // Ignore — best effort
  }

  if (unstagedMemory) {
    reminders.push(
      "Memory files were updated but not staged — run `git add .claude/dev-team-learnings.md .claude/agent-memory/` if learnings should be included",
    );
  } else {
    reminders.push(
      "Update .claude/dev-team-learnings.md or agent memory with any patterns, conventions, or decisions from this work",
    );
  }
}

if (reminders.length > 0) {
  console.log(`[dev-team pre-commit] Before committing, consider: ${reminders.join("; ")}`);
}

process.exit(0);
