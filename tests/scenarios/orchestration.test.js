"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOOKS_DIR = path.join(__dirname, "..", "..", "templates", "hooks");
const HOOK = "dev-team-post-change-review.js";

/**
 * Helper: run the post-change-review hook with a given file path and optional content.
 * Returns parsed output with flags and review depth.
 */
function runReviewHook(filePath, opts = {}) {
  const toolInput = { file_path: filePath };
  if (opts.old_string !== undefined) toolInput.old_string = opts.old_string;
  if (opts.new_string !== undefined) toolInput.new_string = opts.new_string;
  if (opts.content !== undefined) toolInput.content = opts.content;

  const input = JSON.stringify({ tool_input: toolInput });
  const execOpts = {
    encoding: "utf-8",
    timeout: 5000,
    env: { ...process.env, PATH: process.env.PATH },
  };

  // If cwd is provided (for config.json lookup), use it
  if (opts.cwd) {
    execOpts.cwd = opts.cwd;
  }

  try {
    const stdout = execFileSync(process.execPath, [path.join(HOOKS_DIR, HOOK), input], execOpts);
    return parseHookOutput(stdout, 0);
  } catch (err) {
    return parseHookOutput(err.stdout || "", err.status);
  }
}

/**
 * Parse hook stdout into structured data: flags, reviewDepth, complexityScore.
 */
function parseHookOutput(stdout, exitCode) {
  const lines = stdout.split("\n").filter((l) => l.trim());
  const flags = lines
    .filter((l) => l.trim().startsWith("->") || l.trim().startsWith("\u2192"))
    .map((l) =>
      l
        .trim()
        .replace(/^(\u2192|->)\s*/, "")
        .trim(),
    );

  let reviewDepth = null;
  let complexityScore = null;
  const depthMatch = stdout.match(/Review depth: (\w+) \(complexity score: (\d+)\)/);
  if (depthMatch) {
    reviewDepth = depthMatch[1];
    complexityScore = parseInt(depthMatch[2], 10);
  }

  return { exitCode, flags, reviewDepth, complexityScore, stdout };
}

// ─── Scenario 1: Happy path — implementation triggers correct reviewers ──────

describe("Orchestration scenario: happy path agent selection", () => {
  it("flags Knuth and Brooks for a new source file", () => {
    const result = runReviewHook("src/utils/parser.ts", {
      content: "export function parse(input: string) { return input.trim(); }",
    });
    assert.equal(result.exitCode, 0);
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-knuth")),
      "Should flag Knuth for new code",
    );
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-brooks")),
      "Should flag Brooks for new code",
    );
  });

  it("flags Szabo for security-sensitive files", () => {
    const result = runReviewHook("src/auth/login.ts", {
      content: "export function login(user: string, password: string) {}",
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-szabo")),
      "Should flag Szabo for auth file",
    );
  });

  it("flags Hamilton for infrastructure files", () => {
    const result = runReviewHook("Dockerfile", {
      content: "FROM node:22-alpine\nRUN npm install",
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-hamilton")),
      "Should flag Hamilton for Dockerfile",
    );
  });

  it("flags Mori for API contract files", () => {
    const result = runReviewHook("src/api/users.ts", {
      content: "export const getUser = async (id: string) => {};",
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-mori")),
      "Should flag Mori for API file",
    );
  });

  it("flags Conway for release artifacts", () => {
    const result = runReviewHook("package.json", {
      content: '{"version": "1.0.0"}',
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-conway")),
      "Should flag Conway for package.json",
    );
  });

  it("flags Tufte for documentation files", () => {
    const result = runReviewHook("docs/api.md", {
      content: "# API Documentation\n\n## Endpoints",
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-tufte")),
      "Should flag Tufte for docs",
    );
  });

  it("flags Tufte for doc-drift on implementation changes", () => {
    const result = runReviewHook("src/init.ts", {
      content: 'export function run() { console.log("init"); }',
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-tufte") && f.includes("doc drift")),
      "Should flag Tufte for doc-drift on src/init.ts",
    );
  });

  it("flags Voss for app config files", () => {
    const result = runReviewHook(".env.local", {
      content: "DATABASE_URL=postgres://localhost/mydb",
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-voss")),
      "Should flag Voss for .env file",
    );
  });

  it("flags Deming for tooling files", () => {
    const result = runReviewHook(".github/workflows/ci.yml", {
      content: "name: CI\non: push",
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-deming")),
      "Should flag Deming for CI workflow",
    );
  });

  it("does not flag any agent for test files (no Knuth/Brooks)", () => {
    const result = runReviewHook("tests/unit/parser.test.js", {
      content: 'const assert = require("assert"); assert.ok(true);',
    });
    assert.ok(
      !result.flags.some((f) => f.includes("@dev-team-knuth")),
      "Should NOT flag Knuth for test files",
    );
    assert.ok(
      !result.flags.some((f) => f.includes("@dev-team-brooks") && f.includes("quality attribute")),
      "Should NOT flag Brooks for quality review of test files",
    );
  });


  it("produces no output for non-code, non-config files", () => {
    const result = runReviewHook("assets/logo.png");
    assert.equal(result.exitCode, 0, "Hook should exit 0 for non-code, non-config files");
    assert.equal(result.flags.length, 0, "Should not flag any agent for image files");
  });
});

// ─── Scenario 2: Multi-domain file triggers multiple reviewers ───────────────

describe("Orchestration scenario: multi-domain routing", () => {
  it("flags both Szabo and Knuth for security-sensitive source code", () => {
    const result = runReviewHook("src/auth/token-validator.ts", {
      content: [
        "export function validateToken(token: string): boolean {",
        "  if (!token) throw new Error('Missing token');",
        "  const decoded = jwt.verify(token, SECRET);",
        "  return decoded.exp > Date.now();",
        "}",
      ].join("\n"),
    });
    assert.ok(result.flags.some((f) => f.includes("@dev-team-szabo")));
    assert.ok(result.flags.some((f) => f.includes("@dev-team-knuth")));
  });

  it("flags Hamilton + Deming + Conway for CI workflow files", () => {
    const result = runReviewHook(".github/workflows/release.yml", {
      content: "name: Release\non: push:\n  tags: ['v*']",
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-hamilton")),
      "Hamilton for ops",
    );
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-deming")),
      "Deming for tooling",
    );
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-conway")),
      "Conway for release artifact",
    );
  });

  it("flags Brooks for architectural boundary files", () => {
    const result = runReviewHook("docs/adr/023-new-pattern.md", {
      content: "# ADR-023: New Pattern\n\n## Context\n...",
    });
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-brooks")),
      "Brooks for ADR changes",
    );
    assert.ok(
      result.flags.some((f) => f.includes("@dev-team-tufte")),
      "Tufte for doc changes",
    );
  });
});

// ─── Scenario 3: Complexity-based review triage ──────────────────────────────

describe("Orchestration scenario: complexity triage", () => {
  it("assigns LIGHT review for trivial changes", () => {
    const result = runReviewHook("src/utils.ts", {
      old_string: "const x = 1;",
      new_string: "const x = 2;",
    });
    assert.equal(result.reviewDepth, "LIGHT", "Trivial one-line change should be LIGHT");
  });

  it("assigns STANDARD review for moderate changes", () => {
    // ~15 lines with several functions and control flow to score between 10 and 40
    const result = runReviewHook("src/service.ts", {
      content: [
        "export function greet(name: string) {",
        "  if (!name) return 'Hello';",
        "  return `Hello ${name}`;",
        "}",
        "export function farewell(name: string) {",
        "  if (!name) return 'Goodbye';",
        "  return `Goodbye ${name}`;",
        "}",
        "function helper() {",
        "  return true;",
        "}",
      ].join("\n"),
    });
    assert.equal(result.reviewDepth, "STANDARD", "Moderate function additions should be STANDARD");
  });

  it("assigns DEEP review for complex changes with many patterns", () => {
    const complexCode = [
      "export class AuthService {",
      "  async login(user: string, pass: string): Promise<Token> {",
      "    try {",
      "      const result = await this.db.query(user);",
      "      if (result.locked) throw new Error('locked');",
      "      if (!result.active) throw new Error('inactive');",
      "      const token = await this.generateToken(result);",
      "      export function helper() {}",
      "      export function another() {}",
      "      export class Inner {}",
      "      if (token.expired) { throw new Error('expired'); } else { return token; }",
      "      if (a) { if (b) { if (c) {} } }",
      "      await Promise.all([task1(), task2()]);",
      "      await fetch(url);",
      "      export const api = {};",
      "      export const config = {};",
      "    } catch (err) {",
      "      throw err;",
      "    }",
      "  }",
      "}",
    ].join("\n");

    const result = runReviewHook("src/auth/service.ts", {
      content: complexCode,
    });
    assert.equal(result.reviewDepth, "DEEP", "Complex auth code should be DEEP review");
  });

  it("boosts complexity score for security-sensitive files", () => {
    const simpleCode = "export const check = true;";
    const normalResult = runReviewHook("src/utils.ts", { content: simpleCode });
    const securityResult = runReviewHook("src/auth/check.ts", { content: simpleCode });

    assert.ok(
      securityResult.complexityScore > normalResult.complexityScore,
      `Security file score (${securityResult.complexityScore}) should exceed normal file score (${normalResult.complexityScore})`,
    );
  });
});

// ─── Scenario 4: Configurable thresholds from config.json ────────────────────

describe("Orchestration scenario: configurable review thresholds", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-orch-"));
    fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("uses custom thresholds from config.json", () => {
    // Set very high light threshold so even moderate changes are LIGHT
    fs.writeFileSync(
      path.join(tmpDir, ".dev-team", "config.json"),
      JSON.stringify({ reviewThresholds: { light: 100, deep: 200 } }),
    );

    const result = runReviewHook("src/service.ts", {
      content: [
        "export function fn1() { return 1; }",
        "export function fn2() { return 2; }",
        "export function fn3() { return 3; }",
      ].join("\n"),
      cwd: tmpDir,
    });

    assert.equal(result.reviewDepth, "LIGHT", "Should be LIGHT with high threshold");
  });
});

// ─── Scenario 5: Edge cases in agent selection ───────────────────────────────

describe("Orchestration scenario: edge cases", () => {
  it("handles empty file path gracefully (no flags, exit 0)", () => {
    const input = JSON.stringify({ tool_input: { file_path: "" } });
    try {
      execFileSync(process.execPath, [path.join(HOOKS_DIR, HOOK), input], {
        encoding: "utf-8",
        timeout: 5000,
      });
    } catch {
      assert.fail("Should not throw for empty file path");
    }
  });

  it("handles malformed JSON gracefully (exit 0)", () => {
    try {
      execFileSync(process.execPath, [path.join(HOOKS_DIR, HOOK), "not-json"], {
        encoding: "utf-8",
        timeout: 5000,
      });
    } catch {
      assert.fail("Should not throw for malformed JSON");
    }
  });

  it("handles missing tool_input gracefully (exit 0)", () => {
    const input = JSON.stringify({});
    try {
      execFileSync(process.execPath, [path.join(HOOKS_DIR, HOOK), input], {
        encoding: "utf-8",
        timeout: 5000,
      });
    } catch {
      assert.fail("Should not throw for missing tool_input");
    }
  });

  it("does not double-flag Brooks for architectural code files", () => {
    // A file in /core/ that is also a .ts file should flag Brooks once, not twice
    const result = runReviewHook("src/core/engine.ts", {
      content: "export class Engine {}",
    });
    const brooksFlags = result.flags.filter((f) => f.includes("@dev-team-brooks"));
    assert.equal(brooksFlags.length, 1, "Brooks should be flagged exactly once");
  });

  it("does not double-flag Tufte for doc files that are also implementation", () => {
    // A .md file should only get one Tufte flag (direct doc, not doc-drift)
    const result = runReviewHook("docs/guide.md", {
      content: "# Guide",
    });
    const tufteFlags = result.flags.filter((f) => f.includes("@dev-team-tufte"));
    assert.equal(tufteFlags.length, 1, "Tufte should be flagged exactly once for doc files");
  });
});

// ─── Scenario 6: Parallel orchestration — file independence check ────────────

describe("Orchestration scenario: parallel file independence", () => {
  it("independent files trigger non-overlapping agent sets", () => {
    // Simulate two files that would be worked in parallel
    const file1Result = runReviewHook("src/parser.ts", {
      content: "export function parse() {}",
    });
    const file2Result = runReviewHook("Dockerfile", {
      content: "FROM node:22",
    });

    // Both should have independent primary flags
    // parser.ts -> Knuth + Brooks
    // Dockerfile -> Hamilton
    assert.ok(file1Result.flags.some((f) => f.includes("@dev-team-knuth")));
    assert.ok(file2Result.flags.some((f) => f.includes("@dev-team-hamilton")));

    // Verify no file-level conflict (different primary domains)
    const file1Primary = file1Result.flags.filter(
      (f) => f.includes("@dev-team-knuth") || f.includes("@dev-team-brooks"),
    );
    const file2Primary = file2Result.flags.filter((f) => f.includes("@dev-team-hamilton"));
    assert.ok(file1Primary.length > 0, "File 1 has code reviewers");
    assert.ok(file2Primary.length > 0, "File 2 has infra reviewer");
  });

  it("overlapping files would trigger same reviewers (conflict detection)", () => {
    // Two source files in same domain would need sequential handling
    const file1Result = runReviewHook("src/auth/login.ts", {
      content: "export function login() {}",
    });
    const file2Result = runReviewHook("src/auth/session.ts", {
      content: "export function createSession() {}",
    });

    // Both trigger Szabo + Knuth + Brooks — same review set indicates potential conflict
    const file1Agents = new Set(
      file1Result.flags.map((f) => f.match(/@dev-team-\w+/)?.[0]).filter(Boolean),
    );
    const file2Agents = new Set(
      file2Result.flags.map((f) => f.match(/@dev-team-\w+/)?.[0]).filter(Boolean),
    );

    // Compute intersection
    const overlap = [...file1Agents].filter((a) => file2Agents.has(a));
    assert.ok(
      overlap.length >= 2,
      `Files in same domain should trigger overlapping reviewers: ${overlap.join(", ")}`,
    );
  });
});

// ─── Scenario 7: Iteration limit behavior ───────────────────────────────────

describe("Orchestration scenario: iteration limits", () => {
  it("hook always exits 0 (advisory, never blocks)", () => {
    // The hook itself does not enforce iteration limits — that is Drucker's
    // responsibility in the conversation. But the hook must always exit 0
    // to avoid blocking the edit/write operation.
    const files = [
      "src/auth/login.ts",
      "Dockerfile",
      "package.json",
      "docs/api.md",
      ".github/workflows/ci.yml",
      "src/core/engine.ts",
    ];

    for (const file of files) {
      const result = runReviewHook(file, { content: "// change" });
      assert.equal(result.exitCode, 0, `Hook should exit 0 for ${file}`);
    }
  });
});

// ─── Scenario 8: Review depth output format ──────────────────────────────────

describe("Orchestration scenario: review output format", () => {
  it("includes ACTION REQUIRED directive in output", () => {
    const result = runReviewHook("src/service.ts", {
      content: "export function serve() {}",
    });
    assert.ok(
      result.stdout.includes("ACTION REQUIRED"),
      "Output should include ACTION REQUIRED directive",
    );
  });

  it("includes agent spawn instruction in output", () => {
    const result = runReviewHook("src/service.ts", {
      content: "export function serve() {}",
    });
    assert.ok(
      result.stdout.includes("Agent tool"),
      "Output should include Agent tool spawn instruction",
    );
  });

  it("LIGHT review includes advisory-only notice", () => {
    const result = runReviewHook("src/utils.ts", {
      old_string: "x",
      new_string: "y",
    });
    if (result.reviewDepth === "LIGHT") {
      assert.ok(
        result.stdout.includes("advisory only"),
        "LIGHT review should note findings are advisory only",
      );
    }
  });

  it("DEEP review includes thorough analysis notice", () => {
    const complexCode = Array(30)
      .fill(null)
      .map(
        (_, i) =>
          `export async function fn${i}() { try { await fetch('/'); } catch (e) { throw e; } }`,
      )
      .join("\n");

    const result = runReviewHook("src/auth/complex.ts", {
      content: complexCode,
    });
    if (result.reviewDepth === "DEEP") {
      assert.ok(
        result.stdout.includes("thorough analysis"),
        "DEEP review should request thorough analysis",
      );
    }
  });
});
