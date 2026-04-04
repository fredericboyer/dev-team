#!/usr/bin/env node

/**
 * dev-team-review-gate.js
 * PreToolUse hook on Bash — stateless commit gates for adversarial review enforcement.
 *
 * Intercepts `git commit` and enforces two gates:
 *   Gate 1 — Review evidence: required review sidecar files must exist
 *   Gate 2 — Findings resolution: no unresolved [DEFECT] findings
 *
 * Agent selection authority:
 *   - SIMPLE tasks: any sidecar matching the content hash suffices (any reviewer)
 *   - COMPLEX tasks: the assessment sidecar at .dev-team/.assessments/<branch>.json
 *     lists requiredReviewers[] — each must have a matching sidecar.
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
const path = require("path");

const { cachedGitDiff } = require("./lib/git-cache");
let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  process.exit(0);
}

const command = (input.tool_input && input.tool_input.command) || "";

if (!/\bgit\s+commit(\s|$)/.test(command)) {
  process.exit(0);
}

const argsBeforeMessage = command.replace(/\s+-m\s+(['"].*|[^\s]*).*$/, "");
if (/--skip-review\b/.test(argsBeforeMessage)) {
  console.warn(
    "[dev-team review-gate] WARNING: --skip-review used — review gates bypassed. " +
      "This is logged as a process deviation for Borges calibration.",
  );
  process.exit(0);
}

// ─── File classification ──────────────────────────────────────────────────────────────

const CODE_FILE_PATTERN =
  /\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs|swift|kt|scala|php|r|sh|bash|zsh|fish)$/i;
const TEST_FILE_PATTERN = /(\.test\.|\.spec\.)|_test\.|_spec\.|\/tests?\/|__tests__/;

function isGatedFile(filePath) {
  const fullPath = filePath.split("\\").join("/").toLowerCase();
  return CODE_FILE_PATTERN.test(fullPath) && !TEST_FILE_PATTERN.test(fullPath);
}

function stagedContentHash(filePath) {
  try {
    const content = execFileSync("git", ["show", `:${filePath}`], {
      encoding: "buffer",
      timeout: 5000,
    });
    return createHash("sha256").update(content).digest("hex").slice(0, 12);
  } catch {
    return null;
  }
}

// ─── Main gate logic ──────────────────────────────────────────────────────────────────────────────

let stagedFiles = "";
try {
  stagedFiles = cachedGitDiff(["diff", "--cached", "--name-only"], 2000);
} catch {
  process.exit(0);
}

const files = stagedFiles
  .split("\n")
  .filter(Boolean)
  .map((f) => f.split("\\").join("/"));

if (files.length === 0) {
  process.exit(0);
}

const gatedFiles = files.filter(isGatedFile);

if (gatedFiles.length === 0) {
  process.exit(0);
}

const reviewsDir = path.join(process.cwd(), ".dev-team", ".reviews");

function readSidecar(sidecarPath) {
  try {
    const stat = fs.lstatSync(sidecarPath);
    if (stat.isSymbolicLink()) return null;
    if (!stat.isFile()) return null;
    const content = fs.readFileSync(sidecarPath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    if (parsed.findings !== undefined && !Array.isArray(parsed.findings)) {
      parsed.findings = [];
    }
    if (Array.isArray(parsed.findings)) {
      parsed.findings = parsed.findings
        .filter((f) => f !== null && typeof f === "object" && !Array.isArray(f))
        .map((f) => {
          if (
            Object.prototype.hasOwnProperty.call(f, "classification") &&
            typeof f.classification !== "string"
          ) {
            const copy = { ...f };
            delete copy.classification;
            return copy;
          }
          return f;
        });
    }
    return parsed;
  } catch {
    return null;
  }
}

function findSidecarsForHash(contentHash) {
  const results = [];
  try {
    const entries = fs.readdirSync(reviewsDir);
    for (const entry of entries) {
      if (!entry.endsWith(`--${contentHash}.json`)) continue;
      const sidecarPath = path.join(reviewsDir, entry);
      const data = readSidecar(sidecarPath);
      if (data) results.push({ path: sidecarPath, data, name: entry });
    }
  } catch {
    // reviewsDir may not exist
  }
  return results;
}

function findSidecar(agent, contentHash) {
  const expectedName = `${agent}--${contentHash}.json`;
  const sidecarPath = path.join(reviewsDir, expectedName);
  const data = readSidecar(sidecarPath);
  if (!data) return null;
  return { path: sidecarPath, data };
}

// ─── Load assessment sidecar ─────────────────────────────────────────────────────

let assessment = null;
try {
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 3000,
  }).trim();
  if (branch && branch !== "HEAD") {
    const safeBranch = branch.replace(/[^a-zA-Z0-9-]/g, "-");
    const assessmentPath = path.join(
      process.cwd(),
      ".dev-team",
      ".assessments",
      `${safeBranch}.json`,
    );
    try {
      const stat = fs.lstatSync(assessmentPath);
      if (!stat.isSymbolicLink() && stat.isFile()) {
        const raw = fs.readFileSync(assessmentPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          assessment = parsed;
        }
      }
    } catch {
      // No assessment sidecar
    }
  }
} catch {
  // git not available
}

// ─── Gate 1: Review evidence ────────────────────────────────────────────────────────────────────────────

const isComplexTask =
  assessment &&
  assessment.complexity === "COMPLEX" &&
  Array.isArray(assessment.requiredReviewers) &&
  assessment.requiredReviewers.length > 0;

const missingReviews = [];

for (const file of gatedFiles) {
  const contentHash = stagedContentHash(file);
  if (!contentHash) continue;

  if (isComplexTask) {
    for (const agent of assessment.requiredReviewers) {
      const sidecar = findSidecar(agent, contentHash);
      if (!sidecar) {
        missingReviews.push({ file, agent });
      }
    }
  } else {
    const sidecars = findSidecarsForHash(contentHash);
    if (sidecars.length === 0) {
      missingReviews.push({ file, agent: null });
    }
  }
}

if (missingReviews.length > 0) {
  console.error("[dev-team review-gate] BLOCKED — required reviews missing:\n");
  const byFile = {};
  for (const { file, agent } of missingReviews) {
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(agent);
  }
  for (const [file, agents] of Object.entries(byFile)) {
    console.error(`  ${file}:`);
    for (const agent of agents) {
      if (agent) {
        console.error(`    - ${agent} (required by COMPLEX task assessment)`);
      } else {
        console.error(`    - (no review found — run /dev-team:review)`);
      }
    }
  }
  if (isComplexTask) {
    console.error(`\nCOMPLEX task: required reviewers: ${assessment.requiredReviewers.join(", ")}`);
  }
  console.error("\nRun /dev-team:review, or use --skip-review to bypass.");
  process.exit(2);
}

// ─── Gate 2: Findings resolution ───────────────────────────────────────────────────────────────────────────────

const unresolvedDefects = [];

for (const file of gatedFiles) {
  const contentHash = stagedContentHash(file);
  if (!contentHash) continue;

  const sidecars = findSidecarsForHash(contentHash);
  for (const { data: sidecar, name } of sidecars) {
    if (sidecar.reviewDepth === "LIGHT") continue;

    const findings = sidecar.findings;
    if (!Array.isArray(findings)) continue;
    const agent = name.split("--")[0];
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

// ─── Cleanup manifest ────────────────────────────────────────────────────────────────────────────────────

try {
  if (fs.existsSync(reviewsDir)) {
    const manifest = [];
    for (const file of gatedFiles) {
      const contentHash = stagedContentHash(file);
      if (!contentHash) continue;
      const sidecars = findSidecarsForHash(contentHash);
      for (const { name } of sidecars) {
        manifest.push(name);
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
  // Best effort
}

process.exit(0);
