#!/usr/bin/env node

/**
 * dev-team-pre-commit-gate.js
 * Pre-commit hook — memory freshness gate + Borges completion warning.
 *
 * Runs before each commit. Checks whether memory files need updating.
 * Blocks (exit 1) when implementation files are staged without memory updates.
 * Override: create an empty `.dev-team/.memory-reviewed` file to acknowledge
 * that memory was reviewed and nothing needs updating.
 *
 * On task branches (feat/*, fix/*), warns (non-blocking) if metrics.md is not
 * in staged changes — a reminder to run Borges before considering a task complete.
 */

"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const { cachedGitDiff } = require("./lib/git-cache");
let stagedFiles = "";
try {
  stagedFiles = cachedGitDiff(["diff", "--cached", "--name-only"], 2000);
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

// Memory freshness check (blocking unless overridden)

const hasImplFiles = files.some(
  (f) => /\.(js|ts|jsx|tsx|py|rb|go|java|rs)$/.test(f) && !/\.(test|spec)\./.test(f),
);

const memoryFiles = files.filter(
  (f) => f.endsWith("learnings.md") || /agent-memory\/.*MEMORY\.md$/.test(f),
);

const hasMemoryUpdates = memoryFiles.length > 0;

/**
 * Check whether a memory file has substantive content beyond boilerplate.
 * Returns true if the file contains at least one non-empty, non-header,
 * non-boilerplate line.
 */
function hasSubstantiveContent(filePath) {
  try {
    const absPath = path.join(process.cwd(), filePath);
    // Reject symlinks to avoid reading unintended files
    const stat = fs.lstatSync(absPath);
    if (stat.isSymbolicLink()) return false;

    const content = fs.readFileSync(absPath, "utf-8");
    const lines = content.split("\n");
    const substantiveLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false; // empty line
      if (/^#+\s/.test(trimmed)) return false; // markdown header
      if (trimmed === "---") return false; // horizontal rule / frontmatter delimiter
      return true;
    });
    return substantiveLines.length > 0;
  } catch {
    return false; // file doesn't exist or can't be read — not substantive
  }
}

// If memory files are staged, verify they have substantive content
if (hasMemoryUpdates) {
  const allSubstantive = memoryFiles.every((f) => hasSubstantiveContent(f));
  if (!allSubstantive) {
    console.error(
      "[dev-team pre-commit] BLOCKED: Memory files were staged but contain only boilerplate (headers, empty lines). " +
        "Add substantive content — patterns, conventions, calibration notes, or decisions learned from this work.",
    );
    process.exit(1);
  }
}

let memoryGatePassed = false;
if (hasImplFiles && !hasMemoryUpdates) {
  // Check for .memory-reviewed override marker
  const markerPath = path.join(process.cwd(), ".dev-team", ".memory-reviewed");
  let hasOverride = false;
  try {
    const stat = fs.lstatSync(markerPath);
    // Require regular file — reject symlinks, directories, FIFOs, etc.
    hasOverride = stat.isFile() && !stat.isSymbolicLink();
  } catch {
    // No marker file
  }

  if (hasOverride) {
    // Override acknowledged — clean up the marker file after this commit
    try {
      fs.unlinkSync(markerPath);
    } catch {
      // Best effort — don't fail the hook over cleanup
    }
    // Don't exit yet — still run the Borges completion warning below
    memoryGatePassed = true;
  }

  if (!memoryGatePassed) {
    let unstagedMemory = false;
    try {
      const unstaged = cachedGitDiff(["diff", "--name-only"], 2000);
      unstagedMemory = unstaged
        .split("\n")
        .map((f) => f.split("\\").join("/"))
        .some((f) => f.endsWith("learnings.md") || /agent-memory\/.*MEMORY\.md$/.test(f));
    } catch {
      // Ignore — best effort
    }

    if (unstagedMemory) {
      console.error(
        "[dev-team pre-commit] BLOCKED: Memory files were updated but not staged. " +
          "Run `git add .claude/rules/dev-team-learnings.md .dev-team/agent-memory/` to include learnings, " +
          "or create an empty `.dev-team/.memory-reviewed` file to acknowledge that memory was reviewed.",
      );
    } else {
      console.error(
        "[dev-team pre-commit] BLOCKED: Implementation files staged without memory updates. " +
          "Update .claude/rules/dev-team-learnings.md or agent memory with any patterns, conventions, or decisions from this work. " +
          "If no learnings apply, create an empty `.dev-team/.memory-reviewed` file to acknowledge.",
      );
    }
    process.exit(1);
  }
}

// Borges completion warning (soft gate — warns but does not block)
// On task branches (feat/*, fix/*), remind the user to run Borges if metrics.md
// is not in the staged changes. Not every commit is the final one, so this is
// advisory only — it nudges teams to run Borges before closing out a task.
let currentBranch = "";
try {
  currentBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
    timeout: 2000,
  }).trim();
} catch {
  // Ignore — best effort
}

// Read taskBranchPattern from config, default to (feat|fix)\/
let taskBranchPattern = "(feat|fix)\\/";
try {
  const configPath = path.join(process.cwd(), ".dev-team", "config.json");
  const configStat = fs.lstatSync(configPath);
  if (configStat.isFile() && !configStat.isSymbolicLink()) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (typeof config.taskBranchPattern === "string" && config.taskBranchPattern) {
      taskBranchPattern = config.taskBranchPattern;
    }
  }
} catch {
  // Config missing or invalid — use default
}

if (new RegExp("^" + taskBranchPattern).test(currentBranch)) {
  const hasMetricsUpdate = files.some((f) => f.endsWith(".dev-team/metrics.md"));
  if (!hasMetricsUpdate) {
    console.warn(
      "[dev-team pre-commit] WARNING: Committing on a task branch without metrics.md updates. " +
        "Remember to run Borges before considering this task complete — " +
        "Borges extracts learnings, updates metrics, and ensures cross-agent coherence.",
    );
  }
}

process.exit(0);
