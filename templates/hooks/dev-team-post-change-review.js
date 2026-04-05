#!/usr/bin/env node

/**
 * dev-team-post-change-review.js
 * PostToolUse hook on Edit/Write.
 *
 * After an implementation file is modified, emits a notification that review
 * may be needed. Advisory only — always exits 0.
 *
 * Agent selection is NOT done here. The review skill (/dev-team:review) is the
 * sole authority for deciding which agents to spawn based on the full diff context.
 * This hook's role: detect that an implementation file changed, emit a notification.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const { isEnabled } = require("./lib/workflow-config");

// Skip entirely when review workflow is disabled
if (!isEnabled("review")) {
  process.exit(0);
}

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch (err) {
  console.warn(
    `[dev-team post-change-review] Warning: Failed to parse hook input, allowing operation. ${err.message}`,
  );
  process.exit(0);
}
const filePath = (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || "";

if (!filePath) {
  process.exit(0);
}

// ─── File classification ──────────────────────────────────────────────────────

const CODE_FILE_PATTERN =
  /\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs|swift|kt|scala|php|r|sh|bash|zsh|fish)$/i;
const TEST_FILE_PATTERN = /(\.test\.|\.spec\.)|_test\.|_spec\.|\/tests?\/|__tests__/;

const fullPath = filePath.split("\\").join("/").toLowerCase();

// Only emit for implementation files (code, not test, not non-code)
if (!CODE_FILE_PATTERN.test(fullPath)) {
  process.exit(0);
}

if (TEST_FILE_PATTERN.test(fullPath)) {
  process.exit(0);
}

// ─── Complexity-based triage ─────────────────────────────────────────────────
// Score the change to determine review depth: LIGHT, STANDARD, or DEEP.

const SECURITY_PATTERNS = [
  /auth/i,
  /login/i,
  /password/i,
  /secret/i,
  /token/i,
  /crypt/i,
  /oauth/i,
  /jwt/i,
  /permission/i,
  /privilege/i,
];

function scoreComplexity(toolInput, scorePath) {
  let score = 0;

  const oldStr = toolInput.old_string ?? "";
  const newStr = toolInput.new_string ?? toolInput.content ?? "";
  const oldLines = oldStr ? oldStr.split("\n").length : 0;
  const newLines = newStr ? newStr.split("\n").length : 0;
  const linesChanged = oldLines + newLines;
  score += Math.min(linesChanged, 50);

  const lines = newStr.split("\n");
  let maxNesting = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const leading = line.match(/^(\s*)/)[1];
    const depth = leading.includes("\t")
      ? leading.split("\t").length - 1
      : Math.floor(leading.length / 2);
    if (depth > maxNesting) maxNesting = depth;
  }
  score += Math.min(maxNesting * 3, 30);

  const controlFlowPatterns = [
    /[{}]/g,
    /\b(if|else|elif|elsif|case|when|switch|match|for|while|do|try|catch|except|finally|rescue)\b/g,
  ];
  for (const pattern of controlFlowPatterns) {
    const matches = newStr.match(pattern);
    if (matches) score += matches.length;
  }

  if (SECURITY_PATTERNS.some((p) => p.test(scorePath))) {
    score += 20;
  }

  return score;
}

let lightThreshold = 10;
let deepThreshold = 40;
try {
  const configPath = path.join(process.cwd(), ".dev-team", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (config.reviewThresholds) {
    lightThreshold = config.reviewThresholds.light || lightThreshold;
    deepThreshold = config.reviewThresholds.deep || deepThreshold;
  }
} catch {
  // Use defaults
}

// Detect branch name for context
let branch = "";
try {
  const { execFileSync } = require("child_process");
  branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
} catch {
  branch = "unknown";
}

const complexityScore = scoreComplexity(input.tool_input || {}, fullPath);
let reviewDepth = "STANDARD";
if (complexityScore < lightThreshold) {
  reviewDepth = "LIGHT";
} else if (complexityScore >= deepThreshold) {
  reviewDepth = "DEEP";
}

console.log(
  `[dev-team] ACTION REQUIRED — implementation file changed on branch ${branch}, review may be needed:`,
);
console.log(`[dev-team] File: ${filePath}`);
console.log(`[dev-team] Review depth: ${reviewDepth} (complexity score: ${complexityScore})`);
if (reviewDepth === "LIGHT") {
  console.log(`[dev-team] LIGHT review: advisory only — use /dev-team:review to run review skill.`);
} else if (reviewDepth === "DEEP") {
  console.log(
    `[dev-team] DEEP review: high complexity — request thorough analysis from all reviewers.`,
  );
}
console.log(
  `[dev-team] Agent selection is determined by the review skill based on the full diff — not individual file patterns.`,
);

process.exit(0);
