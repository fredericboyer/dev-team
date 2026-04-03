"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");

const HOOK = path.join(__dirname, "..", "..", "templates", "hooks", "dev-team-worktree-create.js");

/**
 * Run the worktree-create hook with a given input object.
 * Returns { code, stdout, stderr }.
 */
function runHook(input) {
  try {
    const stdout = execFileSync(process.execPath, [HOOK, JSON.stringify(input)], {
      encoding: "utf-8",
      timeout: 5000,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || "", stderr: err.stderr || "" };
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
    const result = runHook({ worktree_name: "my-worktree-123" });
    // Should pass traversal validation — may fail later (git ops, sandbox)
    // but must NOT fail with path traversal error
    assert.ok(!result.stderr.includes("path traversal"));
    assert.ok(!result.stderr.includes("resolves outside"));
  });
});
