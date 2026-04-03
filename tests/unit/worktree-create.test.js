"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const HOOK = path.join(__dirname, "..", "..", "templates", "hooks", "dev-team-worktree-create.js");

/**
 * Run the worktree-create hook with a given input object.
 * Returns { code, stdout, stderr }.
 */
function runHook(input, options) {
  try {
    const stdout = execFileSync(process.execPath, [HOOK, JSON.stringify(input)], {
      encoding: "utf-8",
      timeout: 5000,
      ...options,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return { code: err.status ?? 1, stdout: err.stdout || "", stderr: err.stderr || "" };
  }
}

describe("dev-team-worktree-create path traversal", () => {
  it("rejects worktree_name containing '..'", () => {
    const result = runHook({ worktree_name: "../../escape" });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /path traversal/);
  });

  it("rejects worktree_name containing forward slash", () => {
    const result = runHook({ worktree_name: "sub/dir" });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /path traversal/);
  });

  it("rejects worktree_name containing backslash", () => {
    const result = runHook({ worktree_name: "sub\\dir" });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /path traversal/);
  });

  it("rejects bare '..'", () => {
    const result = runHook({ worktree_name: ".." });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /path traversal/);
  });

  it("rejects missing worktree_name", () => {
    const result = runHook({});
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Missing worktree_name/);
  });

  it("allows a simple worktree name past traversal validation", () => {
    // Use a temp directory with a .git dir so the test is hermetic (fixes #683)
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worktree-test-"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    try {
      const result = runHook(
        { base_path: tmpDir, worktree_name: "my-worktree-123" },
        { cwd: tmpDir },
      );
      // Should pass traversal validation — will fail at git worktree add (no real repo)
      // but must NOT fail with path traversal error
      assert.ok(!result.stderr.includes("path traversal"));
      assert.ok(!result.stderr.includes("resolves outside"));
      assert.ok(!result.stderr.includes("does not contain a .git directory"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
