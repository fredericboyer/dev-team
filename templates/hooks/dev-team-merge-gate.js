#!/usr/bin/env node

/**
 * dev-team-merge-gate.js
 * PreToolUse hook on Bash — blocks `gh pr merge` when no review evidence exists.
 *
 * Intercepts `gh pr merge` commands (including --auto) and enforces that at
 * least one review sidecar file exists in `.dev-team/.reviews/` for the branch
 * being merged before allowing the merge to proceed.
 *
 * Branch detection (in priority order):
 *   1. Explicit branch in the `gh pr merge` command (e.g., `gh pr merge feat/123`)
 *   2. PR number -> branch lookup via `gh pr view`
 *   3. Current branch via `git rev-parse --abbrev-ref HEAD`
 *
 * Sidecar validation:
 *   The hook validates that at least one sidecar matches the branch being
 *   merged, preventing stale sidecars from a previous branch from satisfying
 *   the gate. Matching uses the sidecar `branch` JSON field, or falls back to
 *   checking if the sanitized branch name appears in the filename.
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

const { isEnabled } = require("./lib/workflow-config");

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

// Skip review-evidence check when review workflow is disabled
if (!isEnabled("review")) {
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

/**
 * Sanitize a branch name for sidecar filename matching.
 * Replaces non-alphanumeric characters (except hyphens) with hyphens.
 */
function sanitizeBranch(branch) {
  return branch.replace(/[^a-zA-Z0-9-]/g, "-");
}

/**
 * Extract the branch name for the PR being merged.
 *
 * Priority:
 *   1. Explicit branch/PR-number argument after `gh pr merge`
 *   2. Current git branch (fallback)
 */
function detectBranch(cmd) {
  const match = cmd.match(/\bgh\s+pr\s+merge\s+([^\s-][^\s]*)/);
  if (match) {
    const arg = match[1];
    if (/^\d+$/.test(arg)) {
      try {
        const branch = execFileSync(
          "gh",
          ["pr", "view", arg, "--json", "headRefName", "-q", ".headRefName"],
          { encoding: "utf-8", timeout: 10000 },
        ).trim();
        if (branch) return branch;
      } catch {
        // gh not available or PR not found — fall through
      }
    } else {
      return arg;
    }
  }

  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (branch && branch !== "HEAD") return branch;
  } catch {
    // Not in a git repo — fall through
  }

  return "";
}

const mergeBranch = detectBranch(command);

if (mergeBranch === "") {
  process.exit(0);
}

const reviewsDir = path.join(process.cwd(), ".dev-team", ".reviews");

if (!fs.existsSync(reviewsDir)) {
  console.error(
    "[dev-team merge-gate] BLOCKED — no review evidence found for branch: " + mergeBranch,
  );
  console.error("\nNo .dev-team/.reviews/ directory exists.");
  console.error(
    "Run review agents before merging, or use --skip-review to bypass (logged as deviation).",
  );
  process.exit(2);
}

const sanitizedBranch = sanitizeBranch(mergeBranch);
let sidecars = [];
try {
  sidecars = fs
    .readdirSync(reviewsDir)
    .filter((f) => f.endsWith(".json") && f !== ".cleanup-manifest.json");
} catch (err) {
  console.warn(
    "[dev-team merge-gate] WARNING: could not read .dev-team/.reviews/ — failing open. Error: " +
      (err && err.message),
  );
  process.exit(0);
}

const validSidecars = sidecars.filter((f) => {
  const sidecarPath = path.join(reviewsDir, f);
  try {
    const stat = fs.lstatSync(sidecarPath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
});

const branchMatchingSidecars = validSidecars.filter((f) => {
  const sidecarPath = path.join(reviewsDir, f);
  try {
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf-8"));
    if (data.branch) {
      return data.branch === mergeBranch;
    }
    return f.includes(sanitizedBranch);
  } catch {
    return false;
  }
});

if (branchMatchingSidecars.length === 0) {
  console.error(
    "[dev-team merge-gate] BLOCKED — no review evidence found for branch: " + mergeBranch,
  );
  if (validSidecars.length > 0) {
    console.error("\n.dev-team/.reviews/ contains sidecars, but none match branch: " + mergeBranch);
    console.error("Existing sidecars may be from a previous branch.");
  } else {
    console.error("\n.dev-team/.reviews/ is empty. No review has been recorded for this branch.");
  }
  console.error(
    "Run review agents before merging, or use --skip-review to bypass (logged as deviation).",
  );
  process.exit(2);
}

// ─── Complexity-aware enforcement ──────────────────────────────────────────
// If a Brooks assessment exists for this branch and classifies it as COMPLEX,
// require sidecar evidence from each agent in requiredReviewers.
// If no assessment exists or it's SIMPLE, the any-sidecar check above suffices.

const assessmentsDir = path.join(process.cwd(), ".dev-team", ".assessments");
const assessmentPath = path.join(assessmentsDir, sanitizedBranch + ".json");

let assessment = null;
try {
  if (fs.existsSync(assessmentPath)) {
    const stat = fs.lstatSync(assessmentPath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      console.warn(
        "[dev-team merge-gate] WARNING: assessment file is a symlink or non-regular file — skipping. Path: " +
          assessmentPath,
      );
    } else {
      const parsed = JSON.parse(fs.readFileSync(assessmentPath, "utf-8"));
      // Validate branch field matches if present
      if (parsed.branch !== undefined && parsed.branch !== mergeBranch) {
        console.warn(
          "[dev-team merge-gate] WARNING: assessment branch field mismatch — expected '" +
            mergeBranch +
            "', got '" +
            parsed.branch +
            "'. Skipping assessment.",
        );
      } else {
        assessment = parsed;
      }
    }
  }
} catch {
  // Malformed assessment JSON — fall back to any-sidecar behavior
  assessment = null;
}

if (
  assessment &&
  typeof assessment.complexity === "string" &&
  assessment.complexity.toUpperCase() === "COMPLEX" &&
  Array.isArray(assessment.requiredReviewers) &&
  assessment.requiredReviewers.length > 0
) {
  // Extract the agent name from each matching sidecar
  const reviewedAgents = new Set();
  for (const f of branchMatchingSidecars) {
    const sidecarPath = path.join(reviewsDir, f);
    try {
      const data = JSON.parse(fs.readFileSync(sidecarPath, "utf-8"));
      if (data.agent) {
        reviewedAgents.add(data.agent.toLowerCase());
      }
    } catch {
      // skip unparseable sidecars
    }
  }

  const missing = assessment.requiredReviewers.filter((r) => !reviewedAgents.has(r.toLowerCase()));

  if (missing.length > 0) {
    console.error(
      "[dev-team merge-gate] BLOCKED — COMPLEX task missing required reviewers: " +
        missing.join(", "),
    );
    console.error("\nBranch: " + mergeBranch);
    console.error("Assessment requires reviews from: " + assessment.requiredReviewers.join(", "));
    console.error(
      "Reviews found from: " +
        (reviewedAgents.size > 0 ? [...reviewedAgents].join(", ") : "(none)"),
    );
    console.error(
      "\nRun the missing review agents, or use --skip-review to bypass (logged as deviation).",
    );
    process.exit(2);
  }
}

// Review evidence found (and complexity requirements satisfied) — allow the merge
process.exit(0);
