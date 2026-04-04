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

  if (opts.cwd) execOpts.cwd = opts.cwd;

  try {
    const stdout = execFileSync(process.execPath, [path.join(HOOKS_DIR, HOOK), input], execOpts);
    return parseHookOutput(stdout, 0);
  } catch (err) {
    return parseHookOutput(err.stdout || "", err.status);
  }
}

/**
 * Parse hook stdout into structured data.
 */
function parseHookOutput(stdout, exitCode) {
  let reviewDepth = null;
  let complexityScore = null;
  const depthMatch = stdout.match(/Review depth: (\w+) \(complexity score: (\d+)\)/);
  if (depthMatch) {
    reviewDepth = depthMatch[1];
    complexityScore = parseInt(depthMatch[2], 10);
  }
  const hasAction = stdout.includes("ACTION REQUIRED");
  const noAgents = !stdout.includes("@dev-team-");
  return { exitCode, reviewDepth, complexityScore, stdout, hasAction, noAgents };
}

// ─── Scenario 1: Notification-only for implementation files ──────────────────

describe("Orchestration scenario: notification-only behavior", () => {
  it("emits ACTION REQUIRED for new source files", () => {
    const result = runReviewHook("src/utils/parser.ts", {
      content: "export function parse(input: string) { return input.trim(); }",
    });
    assert.equal(result.exitCode, 0);
    assert.ok(result.hasAction, "should emit ACTION REQUIRED");
    assert.ok(result.noAgents, "should not name specific agents");
  });

  it("emits ACTION REQUIRED for security-sensitive source files", () => {
    const result = runReviewHook("src/auth/oauth.ts", {
      content: "export function verify(token: string) { return jwt.verify(token); }",
    });
    assert.equal(result.exitCode, 0);
    assert.ok(result.hasAction, "should emit ACTION REQUIRED for auth files");
    assert.ok(result.noAgents, "should not name specific agents");
  });

  it("exits 0 with no output for non-code files", () => {
    const docFiles = ["docs/guide.md", "README.md", "CHANGELOG.md"];
    for (const file of docFiles) {
      const result = runReviewHook(file, { content: "# Updated" });
      assert.equal(result.exitCode, 0, `should exit 0 for ${file}`);
      assert.equal(result.stdout.trim(), "", `should emit no output for ${file}`);
    }
  });

  it("exits 0 with no output for test files", () => {
    const testFiles = ["src/utils/parser.test.ts", "tests/unit/auth.test.js", "handler_test.go"];
    for (const file of testFiles) {
      const result = runReviewHook(file, { content: "test code" });
      assert.equal(result.exitCode, 0, `should exit 0 for ${file}`);
      assert.equal(result.stdout.trim(), "", `should emit no output for ${file}`);
    }
  });

  it("emits ACTION REQUIRED for Python files", () => {
    const result = runReviewHook("src/my_app/main.py", {
      content: "def handler(): return True",
    });
    assert.equal(result.exitCode, 0);
    assert.ok(result.hasAction, "should emit ACTION REQUIRED for .py files");
    assert.ok(result.noAgents, "should not name specific agents");
  });

  it("emits ACTION REQUIRED for CI/infra files if they are code files", () => {
    // .yml files are not code files — no output
    const yml = runReviewHook(".github/workflows/deploy.yml", { content: "jobs: {}" });
    assert.equal(yml.exitCode, 0);
    assert.equal(yml.stdout.trim(), "", "should not emit for .yml");
    // .sh files ARE code files
    const sh = runReviewHook("scripts/deploy.sh", { content: "#!/bin/bash\necho deploy" });
    assert.equal(sh.exitCode, 0);
    assert.ok(sh.hasAction, "should emit ACTION REQUIRED for .sh files");
  });
});

// ─── Scenario 2: Complexity triage ───────────────────────────────────────────────────────────────

describe("Orchestration scenario: complexity triage", () => {
  it("LIGHT for trivial single-line change", () => {
    const result = runReviewHook("src/utils/helpers.ts", {
      old_string: "const x = 1;",
      new_string: "const y = 1;",
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.reviewDepth, "LIGHT");
    assert.ok(result.stdout.includes("advisory only"), "should mention advisory");
  });

  it("DEEP for large complex change", () => {
    const complexCode = Array(30)
      .fill("export async function handler() { try { await fetch(); } catch (e) { throw e; } }")
      .join("\n");
    const result = runReviewHook("src/api/endpoint.ts", {
      old_string: "",
      new_string: complexCode,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.reviewDepth, "DEEP");
    assert.ok(result.stdout.includes("thorough analysis"), "should mention thorough analysis");
  });

  it("security-sensitive files get elevated complexity (not LIGHT)", () => {
    const result = runReviewHook("src/auth/token.ts", {
      old_string: "const x = 1;",
      new_string: "const y = 1;",
    });
    assert.equal(result.exitCode, 0);
    assert.notEqual(result.reviewDepth, "LIGHT", "auth file should not get LIGHT review");
  });

  it("complexity score is included in output", () => {
    const result = runReviewHook("src/utils/helpers.ts", {
      old_string: "x",
      new_string: "y",
    });
    assert.equal(result.exitCode, 0);
    assert.ok(result.complexityScore !== null, "should include complexity score");
  });
});

// ─── Scenario 3: Configurable review thresholds ─────────────────────────────────────────────────

describe("Orchestration scenario: configurable review thresholds", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-test-"));
    const config = { reviewThresholds: { light: 100, deep: 200 } };
    fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".dev-team", "config.json"), JSON.stringify(config));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("uses custom light threshold — trivial change stays LIGHT (threshold not met)", () => {
    const result = runReviewHook("src/utils/helpers.ts", {
      old_string: "const x = 1;",
      new_string: "const y = 1;",
      cwd: tmpDir,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.reviewDepth, "LIGHT", "trivial change is below even high light threshold");
  });
});

// ─── Scenario 4: Review output format ──────────────────────────────────────────────────────────────

describe("Orchestration scenario: review output format", () => {
  it("output references the review skill (not agents directly)", () => {
    const result = runReviewHook("src/api/endpoint.ts", {
      content: "export const handler = () => {}",
    });
    assert.equal(result.exitCode, 0);
    assert.ok(
      result.stdout.includes("review skill") || result.stdout.includes("/dev-team:review"),
      "should reference review skill or /dev-team:review command",
    );
    assert.ok(!result.stdout.includes("@dev-team-"), "should not name specific agents");
  });

  it("output includes the file path that changed", () => {
    const result = runReviewHook("src/api/endpoint.ts", {
      content: "export const handler = () => {}",
    });
    assert.equal(result.exitCode, 0);
    assert.ok(
      result.stdout.includes("src/api/endpoint.ts"),
      "should include the changed file path",
    );
  });
});
