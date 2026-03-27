#!/usr/bin/env node

/**
 * dev-team-post-change-review.js
 * PostToolUse hook on Edit/Write.
 *
 * After a file is modified, flags which agents should review based on
 * the file's domain. Advisory only — always exits 0.
 *
 * Patterns are loaded from agent-patterns.json (shared with dev-team-review-gate.js).
 * Falls back to hardcoded patterns if the JSON file is missing or malformed.
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

// ─── Load agent patterns from shared JSON ────────────────────────────────────

/**
 * Compile a pattern entry from the JSON into a RegExp.
 * Entries are either a string (no flags) or [source, flags].
 */
function compilePattern(entry) {
  if (Array.isArray(entry)) {
    return new RegExp(entry[0], entry[1] || "");
  }
  return new RegExp(entry);
}

/**
 * Load pattern categories from agent-patterns.json.
 * Returns null on failure (caller falls back to hardcoded).
 */
function loadPatternsFromJSON() {
  try {
    const jsonPath = path.join(__dirname, "agent-patterns.json");
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (value.patterns) {
        result[key] = {
          agent: value.agent,
          label: value.label,
          matchOn: value.matchOn || ["fullPath"],
          compiled: value.patterns.map(compilePattern),
        };
      } else if (value.pattern) {
        result[key] = { compiled: compilePattern(value.pattern) };
      }
    }
    return result;
  } catch {
    return null;
  }
}

// Hardcoded fallback patterns (kept in sync with agent-patterns.json)
const FALLBACK_SECURITY_PATTERNS = [
  /auth/,
  /login/,
  /password/,
  /token/,
  /session/,
  /crypto/,
  /encrypt/,
  /decrypt/,
  /secret/,
  /permission/,
  /rbac/,
  /acl/,
  /oauth/,
  /jwt/,
  /cors/,
  /csrf/,
  /sanitiz/,
  /escap/,
];
const FALLBACK_API_PATTERNS = [
  /\/api\//,
  /\/routes?\//,
  /\/endpoints?\//,
  /schema/,
  /\.graphql$/,
  /\.proto$/,
  /openapi/,
  /swagger/,
];
const FALLBACK_FRONTEND_PATTERNS = [
  /\/components?\//,
  /\/pages?\//,
  /\/views?\//,
  /\/layouts?\//,
  /\/ui\//,
  /\.(css|scss|sass|less|styl)$/,
  /\.(jsx|tsx)$/,
  /tailwind/,
  /styled/,
];
const FALLBACK_APP_CONFIG_PATTERNS = [/\.env/, /config/, /migration/, /database/, /\.sql$/];
const FALLBACK_TOOLING_PATTERNS = [
  /eslint/,
  /prettier/,
  /\.github\/workflows/,
  /\.claude\//,
  /tsconfig/,
  /jest\.config/,
  /vitest/,
  /package\.json$/,
  /\.husky/,
];
const FALLBACK_DOC_PATTERNS = [
  /readme/,
  /changelog/,
  /\.md$/,
  /\.mdx$/,
  /\/docs?\//,
  /api-doc/,
  /jsdoc/,
  /typedoc/,
];
const FALLBACK_DOC_DRIFT_PATTERNS = [
  /(?:^|\/)src\/.*\.(ts|js)$/,
  /(?:^|\/)templates\/agents\//,
  /(?:^|\/)templates\/skills\//,
  /(?:^|\/)templates\/hooks\//,
  /(?:^|\/)src\/init\.(ts|js)$/,
  /(?:^|\/)src\/cli\.(ts|js)$/,
  /(?:^|\/)bin\//,
  /(?:^|\/)package\.json$/,
];
const FALLBACK_ARCH_PATTERNS = [
  /\/adr\//,
  /architecture/,
  /\/modules?\//,
  /\/layers?\//,
  /\/core\//,
  /\/domain\//,
  /\/shared\//,
  /\/lib\//,
  /\/plugins?\//,
  /\/middleware\//,
  /tsconfig/,
  /webpack|vite|rollup|esbuild/,
];
const FALLBACK_RELEASE_PATTERNS = [
  /package\.json$/,
  /pyproject\.toml$/,
  /cargo\.toml$/i,
  /changelog/i,
  /version/,
  /\.github\/workflows\/.*release/,
  /\.github\/workflows\/.*publish/,
  /\.github\/workflows\/.*deploy/,
  /\.npmrc$/,
  /\.npmignore$/,
  /release\.config/,
  /lerna\.json$/,
];
const FALLBACK_OPS_PATTERNS = [
  /dockerfile/,
  /docker-compose/,
  /\.dockerignore$/,
  /\.github\/workflows\//,
  /\.gitlab-ci/,
  /jenkinsfile/i,
  /terraform\//,
  /pulumi\//,
  /cloudformation\//,
  /helm\//,
  /k8s\//,
  /\.tf$/,
  /\.tfvars$/,
  /health[-_]?check/,
  /(?:^|\/)(?:monitoring|prometheus|grafana|datadog)\.(?:ya?ml|json|conf|config|toml)$/,
  /(?:^|\/)(?:logging|logs)\.(?:ya?ml|json|conf|config|toml)$/,
  /(?:^|\/)(?:alerting|alerts?)\.(?:ya?ml|json|conf|config|toml)$/,
  /(?:^|\/)(?:observability|otel|opentelemetry)\.(?:ya?ml|json|conf|config|toml)$/,
  /(?<!\/src)\/(?:monitoring|logging|alerting|observability)\//,
  /\.env\.example$/,
  /\.env\.template$/,
  /env\.template$/,
];
const FALLBACK_CODE_FILE = /\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs)$/;
const FALLBACK_TEST_FILE = /\.(test|spec)\.|_test\.|__tests__|\/tests?\//;

const loaded = loadPatternsFromJSON();

function getPatterns(key) {
  return loaded && loaded[key] ? loaded[key].compiled : null;
}
function getCategory(key) {
  return loaded && loaded[key] ? loaded[key] : null;
}
function getSinglePattern(key) {
  return loaded && loaded[key] ? loaded[key].compiled : null;
}

const SECURITY_PATTERNS = getPatterns("security") || FALLBACK_SECURITY_PATTERNS;
const API_PATTERNS = getPatterns("api") || FALLBACK_API_PATTERNS;
const FRONTEND_PATTERNS = getPatterns("frontend") || FALLBACK_FRONTEND_PATTERNS;
const APP_CONFIG_PATTERNS = getPatterns("appConfig") || FALLBACK_APP_CONFIG_PATTERNS;
const TOOLING_PATTERNS = getPatterns("tooling") || FALLBACK_TOOLING_PATTERNS;
const DOC_PATTERNS = getPatterns("docs") || FALLBACK_DOC_PATTERNS;
const DOC_DRIFT_PATTERNS = getPatterns("docDrift") || FALLBACK_DOC_DRIFT_PATTERNS;
const ARCH_PATTERNS = getPatterns("architecture") || FALLBACK_ARCH_PATTERNS;
const RELEASE_PATTERNS = getPatterns("release") || FALLBACK_RELEASE_PATTERNS;
const OPS_PATTERNS = getPatterns("operations") || FALLBACK_OPS_PATTERNS;
const codeFilePattern = getSinglePattern("codeFile") || FALLBACK_CODE_FILE;
const testFilePattern = getSinglePattern("testFile") || FALLBACK_TEST_FILE;

// Resolve labels from JSON or use defaults
function label(key, fallback) {
  const cat = getCategory(key);
  return cat && cat.label ? cat.label : fallback;
}

// ─── Pattern matching ────────────────────────────────────────────────────────

const basename = path.basename(filePath).toLowerCase();
const fullPath = filePath.split("\\").join("/").toLowerCase();

const flags = [];

// Security-sensitive patterns → flag for Szabo
if (SECURITY_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
  flags.push(`@dev-team-szabo (${label("security", "security surface changed")})`);
}

// API/contract patterns → flag for Mori
if (API_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-mori (${label("api", "API contract may affect UI")})`);
}

// Frontend/UI component patterns → flag for Rams (design system review)
if (FRONTEND_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-rams (${label("frontend", "design system compliance review")})`);
}

// App config patterns → flag for Voss
if (APP_CONFIG_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-voss (${label("appConfig", "app config/data change")})`);
}

// Tooling patterns → flag for Deming
if (TOOLING_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-deming (${label("tooling", "tooling change")})`);
}

// Documentation patterns → flag for Tufte
if (DOC_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-tufte (${label("docs", "documentation changed")})`);
}

// Doc-drift patterns → flag Tufte for implementation changes that may need doc updates
// Only flag for doc-drift if Tufte was not already flagged for a direct doc change
const alreadyFlaggedTufte = flags.some((f) => f.startsWith("@dev-team-tufte"));
if (!alreadyFlaggedTufte && DOC_DRIFT_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(
    `@dev-team-tufte (${label("docDrift", "implementation changed — check for doc drift")})`,
  );
}

// Architecture patterns → flag for Brooks
if (ARCH_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-brooks (${label("architecture", "architectural boundary touched")})`);
}

// Release patterns → flag for Conway
if (RELEASE_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push(`@dev-team-conway (${label("release", "version/release artifact changed")})`);
}

// Operations/infra patterns → flag for Hamilton
if (OPS_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
  flags.push(`@dev-team-hamilton (${label("operations", "infrastructure/operations change")})`);
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
