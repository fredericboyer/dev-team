#!/usr/bin/env node

/**
 * dev-team-review-gate.js
 * PreToolUse hook on Bash — stateless commit gates for adversarial review enforcement.
 *
 * Intercepts `git commit` and enforces two gates:
 *   Gate 1 — Review evidence: required review sidecar files must exist
 *   Gate 2 — Findings resolution: no unresolved [DEFECT] findings
 *
 * Sidecar files are written by review agents to `.dev-team/.reviews/`.
 * Each sidecar is named `<agent>--<content-hash>.json` where content-hash
 * is derived from the file's staged content, ensuring stale reviews don't match.
 *
 * Escape hatches:
 *   - --skip-review in the commit command bypasses both gates (logged)
 *   - LIGHT review depth (from sidecar metadata) is advisory only
 *   - Non-code files are not gated
 *
 * See ADR-029 for design rationale.
 */

"use strict";

const { createHash } = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  // Fail open on parse error — not a safety hook
  process.exit(0);
}

const command = (input.tool_input && input.tool_input.command) || "";

// Only intercept git commit commands (not commit-tree, commit-graph, etc.)
if (!/\bgit\s+commit(\s|$)/.test(command)) {
  process.exit(0);
}

// Escape hatch: --skip-review bypasses both gates (only match as a flag, not in commit messages)
const argsBeforeMessage = command.replace(/\s+-m\s+(['"].*|[^\s]*).*$/, "");
if (/--skip-review\b/.test(argsBeforeMessage)) {
  console.warn(
    "[dev-team review-gate] WARNING: --skip-review used — review gates bypassed. " +
      "This is logged as a process deviation for Borges calibration.",
  );
  process.exit(0);
}

// ─── Pattern matching (mirrors dev-team-post-change-review.js) ──────────────
// These patterns determine which agents are required for which files.
// Kept in sync with post-change-review — if you update one, update both.

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

const FRONTEND_PATTERNS = [
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

const APP_CONFIG_PATTERNS = [/\.env/, /config/, /migration/, /database/, /\.sql$/];

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
  /(?:^|\/)(?:monitoring|prometheus|grafana|datadog)\.(?:ya?ml|json|conf|config|toml)$/,
  /(?:^|\/)(?:logging|logs)\.(?:ya?ml|json|conf|config|toml)$/,
  /(?:^|\/)(?:alerting|alerts?)\.(?:ya?ml|json|conf|config|toml)$/,
  /(?:^|\/)(?:observability|otel|opentelemetry)\.(?:ya?ml|json|conf|config|toml)$/,
  /(?<!\/src)\/(?:monitoring|logging|alerting|observability)\//,
  /\.env\.example$/,
  /\.env\.template$/,
  /env\.template$/,
];

/**
 * Derive which agents are required for a given file path.
 * Returns an array of agent names (e.g., ["dev-team-szabo", "dev-team-knuth"]).
 */
function deriveRequiredAgents(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  const fullPath = filePath.split("\\").join("/").toLowerCase();
  const agents = [];

  if (SECURITY_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
    agents.push("dev-team-szabo");
  }
  if (API_PATTERNS.some((p) => p.test(fullPath))) {
    agents.push("dev-team-mori");
  }
  if (FRONTEND_PATTERNS.some((p) => p.test(fullPath))) {
    agents.push("dev-team-rams");
  }
  if (APP_CONFIG_PATTERNS.some((p) => p.test(fullPath))) {
    agents.push("dev-team-voss");
  }
  if (TOOLING_PATTERNS.some((p) => p.test(fullPath))) {
    agents.push("dev-team-deming");
  }
  if (DOC_PATTERNS.some((p) => p.test(fullPath))) {
    agents.push("dev-team-tufte");
  }
  if (ARCH_PATTERNS.some((p) => p.test(fullPath))) {
    agents.push("dev-team-brooks");
  }
  if (RELEASE_PATTERNS.some((p) => p.test(fullPath))) {
    agents.push("dev-team-conway");
  }
  if (OPS_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
    agents.push("dev-team-hamilton");
  }

  // Always flag Knuth and Brooks for non-test implementation files
  const isTestFile = testFilePattern.test(fullPath);
  const isCodeFile = codeFilePattern.test(fullPath);

  if (isCodeFile && !isTestFile) {
    if (!agents.includes("dev-team-knuth")) {
      agents.push("dev-team-knuth");
    }
    if (!agents.includes("dev-team-brooks")) {
      agents.push("dev-team-brooks");
    }
  }

  if (isTestFile && isCodeFile) {
    agents.push("dev-team-beck");
  }

  return agents;
}

/**
 * Returns true if the file is an implementation file that requires review gating.
 * Non-code files (markdown, config, etc.) get reviews but are not gated.
 */
function isGatedFile(filePath) {
  const fullPath = filePath.split("\\").join("/").toLowerCase();
  const isCodeFile = codeFilePattern.test(fullPath);
  const isTestFile = testFilePattern.test(fullPath);
  // Gate implementation code files, not test files or non-code files
  return isCodeFile && !isTestFile;
}

// ─── Cached git diff (shared pattern with pre-commit-gate.js) ───────────────

function cachedGitDiff(args, timeoutMs) {
  const cwdHash = createHash("md5").update(process.cwd()).digest("hex").slice(0, 8);
  const argsKey = args.join("-").replace(/[^a-zA-Z0-9-]/g, "");
  const cacheFile = path.join(os.tmpdir(), `dev-team-git-cache-${cwdHash}-${argsKey}.txt`);
  let skipWrite = false;
  try {
    const stat = fs.lstatSync(cacheFile);
    if (stat.isSymbolicLink()) {
      try {
        fs.unlinkSync(cacheFile);
      } catch {
        skipWrite = true;
      }
    } else if (Date.now() - stat.mtimeMs < 5000) {
      return fs.readFileSync(cacheFile, "utf-8");
    }
  } catch {
    // No cache or stale
  }
  const result = execFileSync("git", args, { encoding: "utf-8", timeout: timeoutMs });
  if (!skipWrite) {
    try {
      const tmpFile = `${cacheFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmpFile, result, { mode: 0o600 });
      fs.renameSync(tmpFile, cacheFile);
      try {
        fs.chmodSync(cacheFile, 0o600);
      } catch {
        /* best effort */
      }
    } catch {
      // Best effort
    }
  }
  return result;
}

/**
 * Compute the content hash of a staged file using git show :<file>.
 * Returns a hex string (first 12 chars of SHA-256).
 */
function stagedContentHash(filePath) {
  try {
    const content = execFileSync("git", ["show", `:${filePath}`], {
      encoding: "buffer",
      timeout: 5000,
    });
    return createHash("sha256").update(content).digest("hex").slice(0, 12);
  } catch {
    // File may be deleted or binary — skip
    return null;
  }
}

// ─── Main gate logic ────────────────────────────────────────────────────────

let stagedFiles = "";
try {
  stagedFiles = cachedGitDiff(["diff", "--cached", "--name-only"], 2000);
} catch {
  // Not in a git repo or git not available — allow
  process.exit(0);
}

const files = stagedFiles
  .split("\n")
  .filter(Boolean)
  .map((f) => f.split("\\").join("/"));

if (files.length === 0) {
  process.exit(0);
}

// Only gate implementation files
const gatedFiles = files.filter(isGatedFile);

if (gatedFiles.length === 0) {
  process.exit(0);
}

// Read configurable thresholds from config.json
let lightThreshold = 10;
try {
  const configPath = path.join(process.cwd(), ".dev-team", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (config.reviewThresholds && config.reviewThresholds.light) {
    lightThreshold = config.reviewThresholds.light;
  }
} catch {
  // Use defaults
}

const reviewsDir = path.join(process.cwd(), ".dev-team", ".reviews");

/**
 * Find all sidecar files for a given agent and file content hash.
 * Sidecar naming: <agent>--<contentHash>.json
 */
function findSidecar(agent, contentHash) {
  const expectedName = `${agent}--${contentHash}.json`;
  const sidecarPath = path.join(reviewsDir, expectedName);
  try {
    const stat = fs.lstatSync(sidecarPath);
    if (stat.isSymbolicLink()) return null; // Reject symlinks
    if (!stat.isFile()) return null;
    const content = fs.readFileSync(sidecarPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ─── Gate 1: Review evidence ────────────────────────────────────────────────

const missingReviews = [];

for (const file of gatedFiles) {
  const contentHash = stagedContentHash(file);
  if (!contentHash) continue; // Deleted files — skip

  const requiredAgents = deriveRequiredAgents(file);
  if (requiredAgents.length === 0) continue;

  for (const agent of requiredAgents) {
    const sidecar = findSidecar(agent, contentHash);
    if (!sidecar) {
      missingReviews.push({ file, agent });
    }
  }
}

if (missingReviews.length > 0) {
  console.error("[dev-team review-gate] BLOCKED — required reviews missing:\n");
  // Group by file for readability
  const byFile = {};
  for (const { file, agent } of missingReviews) {
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(agent);
  }
  for (const [file, agents] of Object.entries(byFile)) {
    console.error(`  ${file}:`);
    for (const agent of agents) {
      console.error(`    - ${agent}`);
    }
  }
  console.error("\nRun the post-change review agents, or use --skip-review to bypass.");
  process.exit(2);
}

// ─── Gate 2: Findings resolution ────────────────────────────────────────────

const unresolvedDefects = [];

for (const file of gatedFiles) {
  const contentHash = stagedContentHash(file);
  if (!contentHash) continue;

  const requiredAgents = deriveRequiredAgents(file);
  for (const agent of requiredAgents) {
    const sidecar = findSidecar(agent, contentHash);
    if (!sidecar) continue; // Already caught by Gate 1

    // LIGHT reviews are advisory only — skip defect check
    if (sidecar.reviewDepth === "LIGHT") continue;

    const findings = sidecar.findings || [];
    for (const finding of findings) {
      if (finding.classification === "[DEFECT]" && !finding.resolved) {
        unresolvedDefects.push({
          file,
          agent,
          description: finding.description,
          line: finding.line,
        });
      }
    }
  }
}

if (unresolvedDefects.length > 0) {
  console.error("[dev-team review-gate] BLOCKED — unresolved [DEFECT] findings:\n");
  for (const { file, agent, description, line } of unresolvedDefects) {
    const loc = line ? `:${line}` : "";
    console.error(`  ${file}${loc} (${agent}):`);
    console.error(`    ${description}`);
  }
  console.error(
    "\nFix the defects and re-run reviews, dismiss findings explicitly, or use --skip-review to bypass.",
  );
  process.exit(2);
}

// ─── Cleanup: remove stale sidecars for committed files ─────────────────────
// After a successful gate pass, schedule cleanup of sidecar files for the
// files being committed. We don't delete them here (commit hasn't happened yet)
// but mark them for post-commit cleanup by writing a manifest.

try {
  if (fs.existsSync(reviewsDir)) {
    const manifest = [];
    for (const file of gatedFiles) {
      const contentHash = stagedContentHash(file);
      if (!contentHash) continue;
      const requiredAgents = deriveRequiredAgents(file);
      for (const agent of requiredAgents) {
        manifest.push(`${agent}--${contentHash}.json`);
      }
    }
    if (manifest.length > 0) {
      const manifestPath = path.join(reviewsDir, ".cleanup-manifest.json");
      const tmpFile = `${manifestPath}.${process.pid}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(manifest, null, 2), { mode: 0o600 });
      fs.renameSync(tmpFile, manifestPath);
    }
  }
} catch {
  // Best effort — don't block commit over cleanup bookkeeping
}

process.exit(0);
