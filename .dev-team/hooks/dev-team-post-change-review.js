#!/usr/bin/env node

/**
 * dev-team-post-change-review.js
 * PostToolUse hook on Edit/Write.
 *
 * After a file is modified, flags which agents should review based on
 * the file's domain. Advisory only — always exits 0.
 *
 * Patterns are loaded from agent-patterns.json via the shared lib/agent-patterns module.
 */

"use strict";

const fs = require("fs");
const path = require("path");

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

// ─── Load agent patterns from shared module ─────────────────────────────────

const {
  loadPatterns,
  getPatterns: gp,
  getSinglePattern: gsp,
  getLabel: label,
} = require("./lib/agent-patterns");

const loaded = loadPatterns();

const SECURITY_PATTERNS = gp(loaded, "security");
const API_PATTERNS = gp(loaded, "api");
const FRONTEND_PATTERNS = gp(loaded, "frontend");
const APP_CONFIG_PATTERNS = gp(loaded, "appConfig");
const TOOLING_PATTERNS = gp(loaded, "tooling");
const DOC_PATTERNS = gp(loaded, "docs");
const DOC_DRIFT_PATTERNS = gp(loaded, "docDrift");
const ARCH_PATTERNS = gp(loaded, "architecture");
const RELEASE_PATTERNS = gp(loaded, "release");
const OPS_PATTERNS = gp(loaded, "operations");
const codeFilePattern = gsp(loaded, "codeFile");
const testFilePattern = gsp(loaded, "testFile");

// ─── Pattern matching ────────────────────────────────────────────────────────

const basename = path.basename(filePath).toLowerCase();
const fullPath = filePath.split("\\").join("/").toLowerCase();

const flags = [];

// Security-sensitive patterns → flag for Szabo
if (SECURITY_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
  flags.push(`@dev-team-szabo (${label(loaded, "security", "security surface changed")})`);
}

// API/contract patterns → flag for Mori
if (API_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-mori (${label(loaded, "api", "API contract may affect UI")})`);
}

// Frontend/UI component patterns → flag for Rams (design system review)
if (FRONTEND_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-rams (${label(loaded, "frontend", "design system compliance review")})`);
}

// App config patterns → flag for Voss
if (APP_CONFIG_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-voss (${label(loaded, "appConfig", "app config/data change")})`);
}

// Tooling patterns → flag for Deming
if (TOOLING_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-deming (${label(loaded, "tooling", "tooling change")})`);
}

// Documentation patterns → flag for Tufte
if (DOC_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-tufte (${label(loaded, "docs", "documentation changed")})`);
}

// Doc-drift patterns → flag Tufte for implementation changes that may need doc updates
// Only flag for doc-drift if Tufte was not already flagged for a direct doc change
const alreadyFlaggedTufte = flags.some((f) => f.startsWith("@dev-team-tufte"));
if (!alreadyFlaggedTufte && DOC_DRIFT_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(
    `@dev-team-tufte (${label(loaded, "docDrift", "implementation changed — check for doc drift")})`,
  );
}

// Architecture patterns → flag for Brooks
if (ARCH_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(
    `@dev-team-brooks (${label(loaded, "architecture", "architectural boundary touched")})`,
  );
}

// Release patterns → flag for Conway
if (RELEASE_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-conway (${label(loaded, "release", "version/release artifact changed")})`);
}

// Operations/infra patterns → flag for Hamilton
if (OPS_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
  flags.push(
    `@dev-team-hamilton (${label(loaded, "operations", "infrastructure/operations change")})`,
  );
}

// Always flag Knuth and Brooks for non-test implementation files
const isTestFile = testFilePattern.test(fullPath);
const isCodeFile = codeFilePattern.test(fullPath);

if (isCodeFile && !isTestFile) {
  flags.push("@dev-team-knuth (new or changed code path to audit)");
  if (!flags.some((f) => f.startsWith("@dev-team-brooks"))) {
    flags.push("@dev-team-brooks (quality attribute review)");
  }
}

// Flag Beck for test file changes (test quality review)
if (isTestFile && isCodeFile) {
  flags.push("@dev-team-beck (test file changed — review test quality)");
}

if (flags.length === 0) {
  process.exit(0);
}

// ─── Complexity-based triage ─────────────────────────────────────────────────
// Score the change to determine review depth: LIGHT, STANDARD, or DEEP.
// Uses available tool_input data (old_string/new_string for Edit, content for Write).

function scoreComplexity(toolInput, scorePath) {
  let score = 0;

  // Lines changed
  const oldStr = toolInput.old_string ?? "";
  const newStr = toolInput.new_string ?? toolInput.content ?? "";
  const oldLines = oldStr ? oldStr.split("\n").length : 0;
  const newLines = newStr ? newStr.split("\n").length : 0;
  const linesChanged = oldLines + newLines;
  score += Math.min(linesChanged, 50); // Cap at 50 to avoid single large file dominating

  // Language-agnostic complexity indicators.
  // Instead of hardcoding language-specific keywords, use structural proxies:
  // nesting depth and control flow density work across all languages.
  const lines = newStr.split("\n");

  // Nesting depth: count max indent level as a proxy for cyclomatic complexity
  let maxNesting = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const leading = line.match(/^(\s*)/)[1];
    // Normalize: treat 1 tab or 2+ spaces as one indent level
    const depth = leading.includes("\t")
      ? leading.split("\t").length - 1
      : Math.floor(leading.length / 2);
    if (depth > maxNesting) maxNesting = depth;
  }
  score += Math.min(maxNesting * 3, 30); // Cap nesting contribution

  // Control flow density: count lines with braces/brackets that indicate branching or blocks
  // This is language-agnostic -- works for C-family, Python (colons), Ruby (do/end), etc.
  const controlFlowPatterns = [
    /[{}]/g, // braces (C-family block delimiters)
    /\b(if|else|elif|elsif|case|when|switch|match|for|while|do|try|catch|except|finally|rescue)\b/g,
  ];
  for (const pattern of controlFlowPatterns) {
    const matches = newStr.match(pattern);
    if (matches) score += matches.length;
  }

  // Security-sensitive files get a boost
  if (SECURITY_PATTERNS.some((p) => p.test(scorePath))) {
    score += 20;
  }

  return score;
}

// Read configurable thresholds from config.json, or use defaults
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

const complexityScore = scoreComplexity(input.tool_input || {}, fullPath);
let reviewDepth = "STANDARD";
if (complexityScore < lightThreshold) {
  reviewDepth = "LIGHT";
} else if (complexityScore >= deepThreshold) {
  reviewDepth = "DEEP";
}

// Output as a DIRECTIVE, not a suggestion. CLAUDE.md instructs the LLM to act on this.
console.log(`[dev-team] ACTION REQUIRED — spawn these agents as background reviewers:`);
console.log(`[dev-team] Review depth: ${reviewDepth} (complexity score: ${complexityScore})`);
if (reviewDepth === "LIGHT") {
  console.log(`[dev-team] LIGHT review: findings are advisory only — do not classify as [DEFECT].`);
} else if (reviewDepth === "DEEP") {
  console.log(
    `[dev-team] DEEP review: high complexity — request thorough analysis from all reviewers.`,
  );
}
for (const flag of flags) {
  console.log(`  → ${flag}`);
}
console.log(
  `Use the Agent tool to spawn each as a general-purpose subagent with their agent definition from .dev-team/agents/.`,
);

process.exit(0);
