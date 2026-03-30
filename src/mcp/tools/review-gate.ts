/**
 * MCP tool: review_gate
 *
 * Checks whether a file has the required review evidence in
 * `.dev-team/.reviews/` sidecar files. Implements the same logic
 * as the `dev-team-review-gate.js` hook but as a read-only MCP tool.
 *
 * Input:  { path: string, projectDir?: string }
 * Output: { allowed: boolean, reason: string, ... }
 *
 * See ADR-029 for review gate design and ADR-037 for MCP architecture.
 */

import * as fs from "fs";
import * as nodePath from "path";
import * as crypto from "crypto";
import { execFileSync } from "child_process";
import type { McpTool, McpToolHandler, ReviewGateResult, ReviewSidecar } from "../types.js";

// ─── Tool definition ────────────────────────────────────────────────────────

export const reviewGateTool: McpTool = {
  name: "review_gate",
  description:
    "Check whether a file has the required review evidence before commit. " +
    "Returns { allowed: true } if all required reviews exist and have no " +
    "unresolved [DEFECT] findings, or { allowed: false, reason: ... } with details.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path to check (relative to project root)",
      },
      projectDir: {
        type: "string",
        description: "Absolute path to the project root (defaults to cwd)",
      },
    },
    required: ["path"],
  },
};

// ─── Code file detection ────────────────────────────────────────────────────
// Simplified pattern matching — checks if a file is a code file that would
// require review gating. Mirrors the codeFile/testFile patterns from
// agent-patterns.json without requiring the JSON file at runtime.

const CODE_EXTENSIONS =
  /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|kt|swift|c|cpp|h|cs|php|scala|ex|exs|clj|hs|ml|vue|svelte)$/i;
const TEST_PATTERNS = /[/\\](tests?|__tests?__|spec)[/\\]|\.(?:test|spec|e2e)\./i;

function isCodeFile(filePath: string): boolean {
  return CODE_EXTENSIONS.test(filePath);
}

function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.test(filePath);
}

function isGatedFile(filePath: string): boolean {
  return isCodeFile(filePath) && !isTestFile(filePath);
}

// ─── Review sidecar helpers ─────────────────────────────────────────────────

/**
 * Compute the content hash for a file's staged content (first 12 chars of SHA-256).
 * Falls back to reading the file directly if not in a git context.
 */
function getContentHash(filePath: string, projectDir: string): string | null {
  // Try git staged content first
  try {
    const content = execFileSync("git", ["show", `:${filePath}`], {
      cwd: projectDir,
      encoding: "buffer",
      timeout: 5000,
    });
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
  } catch {
    // Fall back to reading the file on disk
    try {
      const fullPath = nodePath.join(projectDir, filePath);
      const content = fs.readFileSync(fullPath);
      return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
    } catch {
      return null;
    }
  }
}

function findSidecar(reviewsDir: string, agent: string, contentHash: string): ReviewSidecar | null {
  const expectedName = `${agent}--${contentHash}.json`;
  const sidecarPath = nodePath.join(reviewsDir, expectedName);
  try {
    const stat = fs.lstatSync(sidecarPath);
    if (stat.isSymbolicLink()) return null;
    if (!stat.isFile()) return null;
    const content = fs.readFileSync(sidecarPath, "utf-8");
    return JSON.parse(content) as ReviewSidecar;
  } catch {
    return null;
  }
}

/**
 * Derive which agents are required to review a given file.
 * Simplified version of the hook's deriveRequiredAgents — always requires
 * knuth and brooks for non-test implementation code.
 */
function deriveRequiredAgents(filePath: string): string[] {
  const agents: string[] = [];
  const lowerPath = filePath.toLowerCase().replace(/\\/g, "/");

  // Security-related files
  if (/auth|security|crypto|secret|token|password|session|oauth|jwt|cred/i.test(lowerPath)) {
    agents.push("dev-team-szabo");
  }

  // Always require knuth and brooks for implementation code
  if (!agents.includes("dev-team-knuth")) agents.push("dev-team-knuth");
  if (!agents.includes("dev-team-brooks")) agents.push("dev-team-brooks");

  return agents;
}

// ─── Tool handler ───────────────────────────────────────────────────────────

export const reviewGateHandler: McpToolHandler = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const filePath = args.path as string;
  const projectDir = (args.projectDir as string) || process.cwd();

  if (!filePath) {
    return { allowed: false, reason: "Missing required parameter: path" };
  }

  // Non-code files and test files are not gated
  if (!isGatedFile(filePath)) {
    return {
      allowed: true,
      reason: "File is not gated (non-code or test file)",
    } satisfies ReviewGateResult;
  }

  const reviewsDir = nodePath.join(projectDir, ".dev-team", ".reviews");
  const contentHash = getContentHash(filePath, projectDir);

  if (!contentHash) {
    return {
      allowed: false,
      reason: "Could not compute content hash — file may not exist",
    } satisfies ReviewGateResult;
  }

  // Gate 1: Review evidence
  const requiredAgents = deriveRequiredAgents(filePath);
  const missingReviews: Array<{ file: string; agent: string }> = [];

  for (const agent of requiredAgents) {
    const sidecar = findSidecar(reviewsDir, agent, contentHash);
    if (!sidecar) {
      missingReviews.push({ file: filePath, agent });
    }
  }

  if (missingReviews.length > 0) {
    return {
      allowed: false,
      reason: "Required reviews missing",
      missing: missingReviews,
    } satisfies ReviewGateResult;
  }

  // Gate 2: Unresolved defects
  const unresolvedDefects: Array<{
    file: string;
    agent: string;
    description: string;
  }> = [];

  for (const agent of requiredAgents) {
    const sidecar = findSidecar(reviewsDir, agent, contentHash);
    if (!sidecar) continue;

    // LIGHT reviews are advisory only
    if (sidecar.reviewDepth === "LIGHT") continue;

    if (!Array.isArray(sidecar.findings)) continue;
    for (const finding of sidecar.findings) {
      if (finding.classification === "[DEFECT]" && !finding.resolved) {
        unresolvedDefects.push({
          file: filePath,
          agent,
          description: finding.description,
        });
      }
    }
  }

  if (unresolvedDefects.length > 0) {
    return {
      allowed: false,
      reason: "Unresolved [DEFECT] findings",
      unresolvedDefects,
    } satisfies ReviewGateResult;
  }

  return {
    allowed: true,
    reason: "All required reviews present, no unresolved defects",
  } satisfies ReviewGateResult;
};
