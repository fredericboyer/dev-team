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

// ─── Agent pattern loading (mirrors hook lib/agent-patterns.js) ────────────
// Loads patterns from agent-patterns.json — the single source of truth for
// file-to-agent routing (K10). Falls back to hardcoded defaults only if the
// JSON file is missing (e.g., running outside a dev-team project).

interface PatternCategory {
  agent?: string;
  label?: string;
  matchOn?: string[];
  compiled: RegExp[] | RegExp;
}

type LoadedPatterns = Record<string, PatternCategory>;

function compilePattern(entry: string | [string, string]): RegExp {
  if (Array.isArray(entry)) {
    return new RegExp(entry[0], entry[1] || "");
  }
  return new RegExp(entry);
}

function loadAgentPatterns(projectDir: string): LoadedPatterns | null {
  const jsonPath = nodePath.join(projectDir, ".dev-team", "hooks", "agent-patterns.json");
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const result: LoadedPatterns = {};
    for (const [key, value] of Object.entries(data) as Array<[string, Record<string, unknown>]>) {
      if (Array.isArray(value.patterns)) {
        result[key] = {
          agent: value.agent as string | undefined,
          label: value.label as string | undefined,
          matchOn: (value.matchOn as string[] | undefined) || ["fullPath"],
          compiled: (value.patterns as Array<string | [string, string]>).map(compilePattern),
        };
      } else if (typeof value.pattern === "string") {
        result[key] = { compiled: compilePattern(value.pattern as string) };
      }
    }
    return result;
  } catch {
    return null;
  }
}

function getPatterns(loaded: LoadedPatterns, key: string): RegExp[] {
  const cat = loaded[key];
  if (!cat) return [];
  return Array.isArray(cat.compiled) ? cat.compiled : [];
}

function getSinglePattern(loaded: LoadedPatterns, key: string): RegExp | null {
  const cat = loaded[key];
  if (!cat) return null;
  return cat.compiled instanceof RegExp ? cat.compiled : null;
}

// ─── Code file detection ────────────────────────────────────────────────────

// Fallback patterns used only when agent-patterns.json is unavailable
const FALLBACK_CODE_PATTERN = /\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs)$/;
const FALLBACK_TEST_PATTERN = /\.(test|spec)\.|_test\.|__tests__|\/tests?\//;

function isGatedFile(filePath: string, loaded: LoadedPatterns | null): boolean {
  const fullPath = filePath.split("\\").join("/").toLowerCase();
  const codePattern = loaded ? getSinglePattern(loaded, "codeFile") : null;
  const testPattern = loaded ? getSinglePattern(loaded, "testFile") : null;
  const isCode = (codePattern || FALLBACK_CODE_PATTERN).test(fullPath);
  const isTest = (testPattern || FALLBACK_TEST_PATTERN).test(fullPath);
  return isCode && !isTest;
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
 * Uses agent-patterns.json (same source as the hook) to determine the full
 * set of required agents, not just a hardcoded subset.
 */
function deriveRequiredAgents(filePath: string, loaded: LoadedPatterns | null): string[] {
  const basename = nodePath.basename(filePath).toLowerCase();
  const fullPath = filePath.split("\\").join("/").toLowerCase();
  const agents: string[] = [];

  // Pattern categories that map to specific agents
  const categories = [
    "security",
    "api",
    "frontend",
    "appConfig",
    "tooling",
    "docs",
    "architecture",
    "release",
    "operations",
  ];

  if (loaded) {
    for (const category of categories) {
      const cat = loaded[category];
      if (!cat || !cat.agent) continue;
      const patterns = getPatterns(loaded, category);
      const matchTargets = cat.matchOn || ["fullPath"];
      const matched = patterns.some((p: RegExp) => {
        return matchTargets.some((target: string) => {
          if (target === "basename") return p.test(basename);
          return p.test(fullPath);
        });
      });
      if (matched && !agents.includes(cat.agent)) {
        agents.push(cat.agent);
      }
    }
  } else {
    // Fallback: basic security detection when patterns unavailable
    if (/auth|security|crypto|secret|token|password|session|oauth|jwt|cred/i.test(fullPath)) {
      agents.push("dev-team-szabo");
    }
  }

  // Always require knuth and brooks for non-test implementation code
  const codePattern = loaded ? getSinglePattern(loaded, "codeFile") : null;
  const testPattern = loaded ? getSinglePattern(loaded, "testFile") : null;
  const isCode = (codePattern || FALLBACK_CODE_PATTERN).test(fullPath);
  const isTest = (testPattern || FALLBACK_TEST_PATTERN).test(fullPath);

  if (isCode && !isTest) {
    if (!agents.includes("dev-team-knuth")) agents.push("dev-team-knuth");
    if (!agents.includes("dev-team-brooks")) agents.push("dev-team-brooks");
  }

  if (isTest && isCode) {
    if (!agents.includes("dev-team-beck")) agents.push("dev-team-beck");
  }

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

  // R-02: Path traversal validation — reject absolute or escaping paths
  const normalized = nodePath.normalize(filePath);
  if (normalized.startsWith("..") || nodePath.isAbsolute(normalized)) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            allowed: false,
            reason: "Invalid path: must be relative to project root",
          }),
        },
      ],
    };
  }

  // Load agent patterns from the project's agent-patterns.json
  const loadedPatterns = loadAgentPatterns(projectDir);

  // Non-code files and test files are not gated
  if (!isGatedFile(filePath, loadedPatterns)) {
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
  const requiredAgents = deriveRequiredAgents(filePath, loadedPatterns);
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
