#!/usr/bin/env node

/**
 * dev-team-pre-commit-gate.js
 * TaskCompleted hook.
 *
 * When a task completes, checks:
 * 1. Whether flagged review agents were actually spawned
 * 2. Whether memory files need updating
 *
 * BLOCKS (exit 2) if review agents were flagged but not consulted.
 * Advisory (exit 0) for memory reminders.
 */

"use strict";

const fs = require("fs");
const path = require("path");
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

const files = stagedFiles
  .split("\n")
  .filter(Boolean)
  .map((f) => f.split("\\").join("/"));

if (files.length === 0) {
  process.exit(0);
}

// Check for pending reviews that were never completed
const trackingPath = path.join(process.cwd(), ".claude", "dev-team-review-pending.json");
let pendingReviews = [];
try {
  pendingReviews = JSON.parse(fs.readFileSync(trackingPath, "utf-8"));
} catch {
  // No tracking file — no pending reviews
}

if (pendingReviews.length > 0) {
  console.error(
    `[dev-team pre-commit] BLOCKED — these agents were flagged for review but not yet spawned:`,
  );
  for (const agent of pendingReviews) {
    console.error(`  → ${agent}`);
  }
  console.error("");
  console.error(
    "Spawn each agent as a background subagent using the Agent tool with their definition",
  );
  console.error("from .claude/agents/. After review completes, clear the tracking file:");
  console.error("  rm .claude/dev-team-review-pending.json");
  console.error("");
  console.error("To skip this check (e.g. for trivial changes), delete the tracking file first.");
  process.exit(2);
}

// Memory freshness check (advisory only)
const reminders = [];

const hasImplFiles = files.some(
  (f) => /\.(js|ts|jsx|tsx|py|rb|go|java|rs)$/.test(f) && !/\.(test|spec)\./.test(f),
);

const hasMemoryUpdates = files.some(
  (f) => f.endsWith("dev-team-learnings.md") || /agent-memory\/.*MEMORY\.md$/.test(f),
);

if (hasImplFiles && !hasMemoryUpdates) {
  let unstagedMemory = false;
  try {
    const unstaged = execFileSync("git", ["diff", "--name-only"], {
      encoding: "utf-8",
      timeout: 5000,
    });
    unstagedMemory = unstaged
      .split("\n")
      .map((f) => f.split("\\").join("/"))
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
