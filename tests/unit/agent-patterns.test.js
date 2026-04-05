"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");

const HOOKS_DIR = path.join(__dirname, "..", "..", "templates", "hooks");

/**
 * Helper: run a hook script with the given tool_input JSON.
 */
function runHook(hookFile, toolInput) {
  const input = JSON.stringify({ tool_input: toolInput });
  try {
    const stdout = execFileSync(process.execPath, [path.join(HOOKS_DIR, hookFile), input], {
      encoding: "utf-8",
      timeout: 5000,
      env: { ...process.env, PATH: process.env.PATH },
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || "", stderr: err.stderr || "" };
  }
}

/**
 * Tests for dev-team-post-change-review.js — notification-only behavior.
 * Agent selection is now the responsibility of the review skill, not this hook.
 */
describe("post-change-review notification behavior", () => {
  const hook = "dev-team-post-change-review.js";

  it("exits 0 with no file path (no output)", () => {
    const result = runHook(hook, {});
    assert.equal(result.code, 0);
    assert.equal(result.stdout.trim(), "", "should emit no output without file_path");
  });

  it("exits 0 and emits no output for non-code files", () => {
    const nonCodeFiles = ["/app/README.md", "/app/docs/guide.md", "/app/.github/CODEOWNERS"];
    for (const file_path of nonCodeFiles) {
      const result = runHook(hook, { file_path });
      assert.equal(result.code, 0, `should exit 0 for ${file_path}`);
      assert.equal(result.stdout.trim(), "", `should emit no output for ${file_path}`);
    }
  });

  it("exits 0 and emits no output for test files", () => {
    const testFiles = [
      "/app/tests/unit/helpers.test.ts",
      "/app/src/handler.spec.js",
      "/app/handler_test.go",
    ];
    for (const file_path of testFiles) {
      const result = runHook(hook, { file_path });
      assert.equal(result.code, 0, `should exit 0 for ${file_path}`);
      assert.equal(result.stdout.trim(), "", `should emit no output for ${file_path}`);
    }
  });

  it("emits ACTION REQUIRED notification for implementation files", () => {
    const implFiles = [
      "/app/src/utils/helpers.ts",
      "/app/src/auth/login.ts",
      "/app/src/api/users.js",
    ];
    for (const file_path of implFiles) {
      const result = runHook(hook, { file_path });
      assert.equal(result.code, 0, `should exit 0 for ${file_path}`);
      assert.ok(
        result.stdout.includes("ACTION REQUIRED"),
        `should include ACTION REQUIRED for ${file_path}`,
      );
    }
  });

  it("does not list specific agent names in output", () => {
    const result = runHook(hook, { file_path: "/app/src/auth/login.ts" });
    assert.equal(result.code, 0);
    const agentNames = [
      "@dev-team-szabo",
      "@dev-team-hopper",
      "@dev-team-mori",
      "@dev-team-knuth",
      "@dev-team-brooks",
      "@dev-team-tufte",
      "@dev-team-hamilton",
      "@dev-team-voss",
      "@dev-team-deming",
    ];
    for (const agent of agentNames) {
      assert.ok(!result.stdout.includes(agent), `should not name ${agent} in output`);
    }
  });

  it("includes review depth and complexity score in output", () => {
    const result = runHook(hook, {
      file_path: "/app/src/utils/helpers.ts",
      old_string: "x",
      new_string: "y",
    });
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("Review depth:"), "should include Review depth");
    assert.ok(result.stdout.includes("complexity score:"), "should include complexity score");
  });

  it("outputs LIGHT review depth for trivial changes", () => {
    const result = runHook(hook, {
      file_path: "/app/src/utils/helpers.ts",
      old_string: "const x = 1;",
      new_string: "const y = 1;",
    });
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("Review depth: LIGHT"), "should be LIGHT");
    assert.ok(result.stdout.includes("advisory only"), "should mention advisory");
  });

  it("outputs DEEP review depth for complex changes", () => {
    const complexCode = Array(30)
      .fill("export async function handler() { try { await fetch(); } catch (e) { throw e; } }")
      .join("\n");
    const result = runHook(hook, {
      file_path: "/app/src/utils/helpers.ts",
      old_string: "",
      new_string: complexCode,
    });
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("Review depth: DEEP"), "should be DEEP");
    assert.ok(result.stdout.includes("thorough analysis"), "should mention thorough analysis");
  });

  it("boosts complexity for security-sensitive files (no LIGHT review)", () => {
    const result = runHook(hook, {
      file_path: "/app/src/auth/login.ts",
      old_string: "const x = 1;",
      new_string: "const y = 1;",
    });
    assert.equal(result.code, 0);
    assert.ok(
      !result.stdout.includes("Review depth: LIGHT"),
      "auth file should not get LIGHT review",
    );
  });

  it("handles malformed JSON gracefully (exits 0)", () => {
    try {
      const { execFileSync: exec } = require("child_process");
      exec(process.execPath, [path.join(HOOKS_DIR, hook), "not-json"], {
        encoding: "utf-8",
        timeout: 5000,
      });
    } catch (err) {
      assert.fail(`Should exit 0 on malformed JSON, got exit ${err.status}`);
    }
  });
});
