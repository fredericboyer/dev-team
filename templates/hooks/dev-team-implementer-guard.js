#!/usr/bin/env node

/**
 * dev-team-implementer-guard.js
 * PreToolUse hook on SendMessage — blocks premature shutdown of implementing
 * agents that have open, unreviewed PRs.
 *
 * The task skill requires implementing agents to remain alive until all review
 * findings have been routed and acknowledged. This hook enforces that by
 * checking for review evidence before allowing shutdown.
 *
 * Config-aware: reads `workflow.review` from `.dev-team/config.json`.
 * If `workflow.review === false`, the guard is disabled (no review expected).
 *
 * Exit 2 = block, exit 0 = allow.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  // Fail open on parse error — not a safety hook
  process.exit(0);
}

// Only intercept SendMessage tool calls
const toolName = input.tool_name || "";
if (toolName !== "SendMessage") {
  process.exit(0);
}

const message = input.tool_input && input.tool_input.message;
if (!message) {
  process.exit(0);
}

// Only intercept shutdown_request messages
const isShutdown =
  (typeof message === "object" && message.type === "shutdown_request") ||
  (typeof message === "string" && message.includes("shutdown_request"));
if (!isShutdown) {
  process.exit(0);
}

// Check escape hatch
const messageStr = typeof message === "string" ? message : JSON.stringify(message);
if (/--force-shutdown/i.test(messageStr)) {
  console.warn("[dev-team implementer-guard] WARNING: --force-shutdown used — guard bypassed.");
  process.exit(0);
}

// Only guard agents with "implement" in the name
const target = input.tool_input && input.tool_input.to;
if (!target || !/implement/i.test(target)) {
  process.exit(0);
}

// ─── Config-awareness: check workflow.review ────────────────────────────────

try {
  const configPath = path.join(process.cwd(), ".dev-team", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (config.workflow && config.workflow.review === false) {
    // Review is disabled — no review expected, allow shutdown
    process.exit(0);
  }
} catch {
  // No config or unreadable — default to review enabled
}

// ─── Check for review evidence ──────────────────────────────────────────────

// Determine the current branch
let branch = "";
try {
  branch = execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
    encoding: "utf-8",
    timeout: 3000,
  }).trim();
} catch {
  // Not in a git repo — allow
  process.exit(0);
}

if (!branch || branch === "HEAD" || branch === "main" || branch === "master") {
  // Not on a feature branch — allow
  process.exit(0);
}

// Check for review sidecars matching this branch
const reviewsDir = path.join(process.cwd(), ".dev-team", ".reviews");
const sanitizedBranch = branch.replace(/[^a-zA-Z0-9-]/g, "-");

let hasReviewEvidence = false;
try {
  const files = fs.readdirSync(reviewsDir);
  hasReviewEvidence = files.some((f) => f.includes(sanitizedBranch) && f.endsWith(".json"));
} catch {
  // No reviews dir — no evidence
}

if (hasReviewEvidence) {
  // Review sidecars exist for this branch — allow shutdown
  process.exit(0);
}

// No review evidence — block shutdown
console.error(
  `[dev-team implementer-guard] BLOCKED: Cannot shut down "${target}" — ` +
    `branch "${branch}" has no review sidecars in .dev-team/.reviews/. ` +
    `Keep the implementer alive until review findings are routed. ` +
    `Use --force-shutdown to bypass.`,
);
process.exit(2);
