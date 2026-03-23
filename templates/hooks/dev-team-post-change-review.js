#!/usr/bin/env node

/**
 * dev-team-post-change-review.js
 * PostToolUse hook on Edit/Write.
 *
 * After a file is modified, flags which agents should review based on
 * the file's domain. Advisory only — always exits 0.
 */

"use strict";

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

const basename = path.basename(filePath).toLowerCase();
const fullPath = filePath.split("\\").join("/").toLowerCase();

const flags = [];

// Security-sensitive patterns → flag for Szabo
const SECURITY_PATTERNS = [
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

if (SECURITY_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
  flags.push("@dev-team-szabo (security surface changed)");
}

// API/contract patterns → flag for Mori
const API_PATTERNS = [
  /\/api\//,
  /\/routes?\//,
  /\/endpoints?\//,
  /schema/,
  /\.graphql$/,
  /\.proto$/,
  /openapi/,
  /swagger/,
];

if (API_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-mori (API contract may affect UI)");
}

// Config/infra patterns → flag for Voss
const INFRA_PATTERNS = [
  /docker/,
  /\.env/,
  /config/,
  /migration/,
  /database/,
  /\.sql$/,
  /infrastructure/,
  /deploy/,
];

if (INFRA_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-voss (architectural/config change)");
}

// Tooling patterns → flag for Deming
const TOOLING_PATTERNS = [
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

if (TOOLING_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-deming (tooling change)");
}

// Documentation patterns → flag for Docs
const DOC_PATTERNS = [
  /readme/,
  /changelog/,
  /\.md$/,
  /\.mdx$/,
  /\/docs?\//,
  /api-doc/,
  /jsdoc/,
  /typedoc/,
];

if (DOC_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-docs (documentation changed)");
}

// Architecture patterns → flag for Architect
const ARCH_PATTERNS = [
  /\/adr\//,
  /architecture/,
  /\/modules?\//,
  /\/layers?\//,
  /\/core\//,
  /\/domain\//,
  /\/shared\//,
];

if (ARCH_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-architect (architectural boundary touched)");
}

// Release patterns → flag for Release
const RELEASE_PATTERNS = [
  /package\.json$/,
  /pyproject\.toml$/,
  /cargo\.toml$/i,
  /changelog/i,
  /version/,
  /\.github\/workflows\/.*release/,
];

if (RELEASE_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-release (version/release artifact changed)");
}

// Always flag Knuth for non-test implementation files
const isTestFile = /\.(test|spec)\.|__tests__|\/tests?\//.test(fullPath);
const isCodeFile = /\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs)$/.test(fullPath);

if (isCodeFile && !isTestFile) {
  flags.push("@dev-team-knuth (new or changed code path to audit)");
}

if (flags.length === 0) {
  process.exit(0);
}

// Track which agents have been flagged this session (for pre-commit gate to verify)
const fs = require("fs");
const trackingPath = path.join(process.cwd(), ".claude", "dev-team-review-pending.json");
let pending = [];
try {
  pending = JSON.parse(fs.readFileSync(trackingPath, "utf-8"));
} catch {
  // No tracking file yet
}

for (const flag of flags) {
  const agent = flag.split(" ")[0]; // e.g. "@dev-team-szabo"
  if (!pending.includes(agent)) {
    pending.push(agent);
  }
}

try {
  fs.mkdirSync(path.dirname(trackingPath), { recursive: true });
  fs.writeFileSync(trackingPath, JSON.stringify(pending, null, 2));
} catch {
  // Best effort — don't fail the hook over tracking
}

// Output as a DIRECTIVE, not a suggestion. CLAUDE.md instructs the LLM to act on this.
console.log(`[dev-team] ACTION REQUIRED — spawn these agents as background reviewers:`);
for (const flag of flags) {
  console.log(`  → ${flag}`);
}
console.log(
  `Use the Agent tool to spawn each as a general-purpose subagent with their agent definition from .claude/agents/.`,
);

process.exit(0);
