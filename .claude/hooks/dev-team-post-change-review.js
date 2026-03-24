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

// App config patterns → flag for Voss
// Voss owns: application config, migrations, database, .env (app-specific)
// Intentional overlap: Docker files trigger Hamilton below; .env files trigger
// Voss here for app-config review. Both perspectives are valuable.
const APP_CONFIG_PATTERNS = [/\.env/, /config/, /migration/, /database/, /\.sql$/];

if (APP_CONFIG_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-voss (app config/data change)");
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
  flags.push("@dev-team-tufte (documentation changed)");
}

// Doc-drift patterns → flag Tufte for implementation changes that may need doc updates
const DOC_DRIFT_PATTERNS = [
  /(?:^|\/)src\/.*\.(ts|js)$/, // New or changed source files
  /(?:^|\/)templates\/agents\//, // New or changed agent definitions
  /(?:^|\/)templates\/skills\//, // New or changed skill definitions
  /(?:^|\/)templates\/hooks\//, // New or changed hook definitions
  /(?:^|\/)src\/init\.(ts|js)$/, // Installer changes
  /(?:^|\/)src\/cli\.(ts|js)$/, // CLI entry point changes
  /(?:^|\/)bin\//, // CLI shim changes
  /(?:^|\/)package\.json$/, // Dependency or script changes
];

// Only flag for doc-drift if Tufte was not already flagged for a direct doc change
const alreadyFlaggedTufte = flags.some((f) => f.startsWith("@dev-team-tufte"));
if (!alreadyFlaggedTufte && DOC_DRIFT_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-tufte (implementation changed — check for doc drift)");
}

// Architecture patterns → flag for Architect. For architectural boundary files,
// Brooks is flagged here with the "architectural boundary touched" reason. The
// dedupe check below skips the generic "quality attribute review" reason for
// these files — this is intentional because Brooks's expanded agent definition
// already includes quality attribute assessment in every review.
const ARCH_PATTERNS = [
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

if (ARCH_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-brooks (architectural boundary touched)");
}

// Release patterns → flag for Release
const RELEASE_PATTERNS = [
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

if (RELEASE_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push("@dev-team-conway (version/release artifact changed)");
}

// Operations/infra patterns → flag for Hamilton
// NOTE: Docker and .env patterns intentionally overlap with INFRA_PATTERNS (Voss).
// Voss reviews Docker files for infrastructure correctness (base images, build stages, networking),
// while Hamilton reviews them for operational concerns (resource limits, health checks, image optimization).
// This dual-review is by design — both perspectives add value.
const OPS_PATTERNS = [
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
  /(?:^|\/)(?:monitoring|prometheus|grafana|datadog)\.(?:ya?ml|json|conf|config|toml)$/, // monitoring config files (not src/monitoring.ts)
  /(?:^|\/)(?:logging|logs)\.(?:ya?ml|json|conf|config|toml)$/, // logging config files (not src/logging.ts)
  /(?:^|\/)(?:alerting|alerts?)\.(?:ya?ml|json|conf|config|toml)$/, // alerting config files
  /(?:^|\/)(?:observability|otel|opentelemetry)\.(?:ya?ml|json|conf|config|toml)$/, // observability config files
  /(?<!\/src)\/(?:monitoring|logging|alerting|observability)\//, // ops directories (but not under src/)
  /\.env\.example$/,
  /\.env\.template$/,
  /env\.template$/,
];

if (OPS_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
  flags.push("@dev-team-hamilton (infrastructure/operations change)");
}

// Always flag Knuth and Brooks for non-test implementation files
const isTestFile = /\.(test|spec)\.|__tests__|\/tests?\//.test(fullPath);
const isCodeFile = /\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs)$/.test(fullPath);

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

// Output as a DIRECTIVE, not a suggestion. CLAUDE.md instructs the LLM to act on this.
console.log(`[dev-team] ACTION REQUIRED — spawn these agents as background reviewers:`);
for (const flag of flags) {
  console.log(`  → ${flag}`);
}
console.log(
  `Use the Agent tool to spawn each as a general-purpose subagent with their agent definition from .claude/agents/.`,
);

process.exit(0);
