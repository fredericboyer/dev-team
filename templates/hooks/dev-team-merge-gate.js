#!/usr/bin/env node

/**
 * dev-team-merge-gate.js
 * PreToolUse hook on Bash — blocks `gh pr merge` when no review evidence exists.
 *
 * Intercepts `gh pr merge` commands (including --auto) and enforces that at
 * least one review sidecar file exists in `.dev-team/.reviews/` for the current
 * branch before allowing the merge to proceed.
 *
 * Sidecar files are written by review agents to `.dev-team/.reviews/`.
 * The hook checks for ANY sidecar file (not per-file like the review-gate),
 * because at merge time we need evidence that the PR was reviewed as a whole.
 *
 * Escape hatch:
 *   - --skip-review in the gh pr merge command bypasses the gate (logged)
 *
 * See ADR-029 for the sidecar evidence model.
 */

"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  // Fail open on parse error — not a safety hook
  process.exit(0);
}

const command = (input.tool_input && input.tool_input.command) || "";

// Only intercept gh pr merge commands
if (!/\bgh\s+pr\s+merge\b/.test(command)) {
  process.exit(0);
}

// Escape hatch: --skip-review bypasses the gate
if (/--skip-review\b/.test(command)) {
  console.warn(
    "[dev-team merge-gate] WARNING: --skip-review used — merge gate bypassed. " +
      "This is logged as a process deviation for Borges calibration.",
  );
  process.exit(0);
}

// Determine current branch
let currentBranch = "";
try {
  currentBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
    timeout: 5000,
  }).trim();
} catch {
  // Not in a git repo or git not available — allow
  process.exit(0);
}

// Skip gating when the current branch cannot be determined meaningfully
// (for example, detached HEAD or an empty branch name)
if (currentBranch === "HEAD" || currentBranch === "") {
  process.exit(0);
}

const reviewsDir = path.join(process.cwd(), ".dev-team", ".reviews");

// Check if reviews directory exists
if (!fs.existsSync(reviewsDir)) {
  console.error(
    "[dev-team merge-gate] BLOCKED — no review evidence found for branch: " + currentBranch,
  );
  console.error("\nNo .dev-team/.reviews/ directory exists.");
  console.error(
    "Run review agents before merging, or use --skip-review to bypass (logged as deviation).",
  );
  process.exit(2);
}

// Look for any sidecar file — at least one review must exist
let sidecars = [];
try {
  sidecars = fs
    .readdirSync(reviewsDir)
    .filter((f) => f.endsWith(".json") && f !== ".cleanup-manifest.json");
} catch {
  // Can't read directory — fail open
  process.exit(0);
}

// Filter out symlinks and validate at least one real sidecar exists
const validSidecars = sidecars.filter((f) => {
  const sidecarPath = path.join(reviewsDir, f);
  try {
    const stat = fs.lstatSync(sidecarPath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
});

if (validSidecars.length === 0) {
  console.error(
    "[dev-team merge-gate] BLOCKED — no review evidence found for branch: " + currentBranch,
  );
  console.error("\n.dev-team/.reviews/ is empty. No review has been recorded for this branch.");
  console.error(
    "Run review agents before merging, or use --skip-review to bypass (logged as deviation).",
  );
  process.exit(2);
}

// Review evidence found — allow the merge
process.exit(0);
