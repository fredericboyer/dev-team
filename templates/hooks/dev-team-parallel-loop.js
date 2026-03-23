#!/usr/bin/env node

/**
 * dev-team-parallel-loop.js
 * Stop hook — enforces the parallel review wave protocol (ADR-019).
 *
 * When a parallel state file (.claude/dev-team-parallel.json) exists:
 * - Reads current phase and issue statuses
 * - Enforces sync barrier: blocks review until all implementations complete
 * - Enforces phase transitions: prevents skipping phases
 * - Tracks phase transitions with timestamps
 *
 * State file: .claude/dev-team-parallel.json (created by Drucker orchestrator)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(process.cwd(), ".claude", "dev-team-parallel.json");

// No state file means no active parallel loop — allow normal exit
if (!fs.existsSync(STATE_FILE)) {
  process.exit(0);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
} catch {
  // Corrupted state file — warn and allow exit
  console.error("[dev-team parallel-loop] Warning: corrupted dev-team-parallel.json. Removing.");
  try {
    fs.unlinkSync(STATE_FILE);
  } catch {
    /* ignore */
  }
  process.exit(0);
}

// Validate required fields
if (!state.mode || state.mode !== "parallel" || !Array.isArray(state.issues) || !state.phase) {
  console.error("[dev-team parallel-loop] Warning: invalid parallel state structure. Removing.");
  try {
    fs.unlinkSync(STATE_FILE);
  } catch {
    /* ignore */
  }
  process.exit(0);
}

const phase = state.phase;
const issues = state.issues;

// Phase: done — clean up and exit
if (phase === "done") {
  try {
    fs.unlinkSync(STATE_FILE);
  } catch {
    /* ignore */
  }
  console.log("[dev-team parallel-loop] Parallel execution complete. State file cleaned up.");
  process.exit(0);
}

// Phase: implementation — check sync barrier
if (phase === "implementation") {
  const implementing = issues.filter((i) => i.status === "implementing" || i.status === "pending");
  const implemented = issues.filter(
    (i) => i.status === "implemented" || i.status === "reviewing" || i.status === "approved",
  );

  if (implementing.length > 0) {
    const output = JSON.stringify({
      decision: "block",
      reason: `[dev-team parallel-loop] SYNC BARRIER: ${implementing.length} issue(s) still implementing (${implementing.map((i) => "#" + i.issue).join(", ")}). ${implemented.length}/${issues.length} complete. Wait for all implementations to finish before starting reviews.`,
    });
    console.log(output);
    process.exit(0);
  }

  // All implementations done — allow transition to sync-barrier
  console.log(
    `[dev-team parallel-loop] All ${issues.length} implementations complete. Ready for review wave.`,
  );
  process.exit(0);
}

// Phase: sync-barrier — remind to start review wave
if (phase === "sync-barrier") {
  const output = JSON.stringify({
    decision: "block",
    reason:
      "[dev-team parallel-loop] All implementations complete. Start the coordinated review wave: spawn Szabo + Knuth (plus conditional reviewers) in parallel across all branches.",
  });
  console.log(output);
  process.exit(0);
}

// Phase: review-wave — check if all reviews reported
if (phase === "review-wave") {
  const wave = state.reviewWave;
  if (wave) {
    const reported = Object.keys(wave.findings || {});
    const branches = wave.branches || [];
    const pending = branches.filter((b) => !reported.includes(b));

    if (pending.length > 0) {
      const output = JSON.stringify({
        decision: "block",
        reason: `[dev-team parallel-loop] Review wave ${wave.wave}: ${pending.length} branch(es) awaiting review results (${pending.join(", ")}). Collect all findings before routing defects.`,
      });
      console.log(output);
      process.exit(0);
    }
  }

  // All reviews complete
  console.log("[dev-team parallel-loop] Review wave complete. Route defects or proceed to Borges.");
  process.exit(0);
}

// Phase: defect-routing — check if fixes are done
if (phase === "defect-routing") {
  const fixing = issues.filter((i) => i.status === "fixing");
  if (fixing.length > 0) {
    const output = JSON.stringify({
      decision: "block",
      reason: `[dev-team parallel-loop] ${fixing.length} issue(s) being fixed (${fixing.map((i) => "#" + i.issue).join(", ")}). Wait for fixes, then start another review wave.`,
    });
    console.log(output);
    process.exit(0);
  }
  process.exit(0);
}

// Phase: borges-completion — remind to run Borges
if (phase === "borges-completion") {
  const output = JSON.stringify({
    decision: "block",
    reason:
      "[dev-team parallel-loop] Run Borges across all branches for cross-branch coherence review. After Borges completes, transition to 'done'.",
  });
  console.log(output);
  process.exit(0);
}

// Unknown phase — allow exit with warning
console.error(`[dev-team parallel-loop] Warning: unknown phase "${phase}". Allowing exit.`);
process.exit(0);
