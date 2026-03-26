"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOOK_PATH = path.join(__dirname, "..", "..", "templates", "hooks", "dev-team-review-gate.js");

/**
 * Run the review gate hook with a given tool_input in a specific cwd.
 */
function runGate(toolInput, cwd) {
  const input = JSON.stringify({ tool_input: toolInput });
  try {
    const stdout = execFileSync(process.execPath, [HOOK_PATH, input], {
      encoding: "utf-8",
      timeout: 10000,
      cwd: cwd || process.cwd(),
      env: { ...process.env, PATH: process.env.PATH },
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || "", stderr: err.stderr || "" };
  }
}

/**
 * Create a temp git repo with initial commit and return its path.
 */
function createTempRepo() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-review-gate-"));
  execFileSync("git", ["init"], { cwd: tmpDir, encoding: "utf-8" });
  execFileSync("git", ["config", "user.email", "test@test.com"], {
    cwd: tmpDir,
    encoding: "utf-8",
  });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: tmpDir, encoding: "utf-8" });
  // Initial commit so HEAD exists
  fs.writeFileSync(path.join(tmpDir, ".gitkeep"), "");
  execFileSync("git", ["add", ".gitkeep"], { cwd: tmpDir, encoding: "utf-8" });
  execFileSync("git", ["commit", "-m", "init"], { cwd: tmpDir, encoding: "utf-8" });
  return tmpDir;
}

/**
 * Compute the content hash the same way the hook does (first 12 chars of SHA-256).
 */
function contentHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

/**
 * Write a sidecar file for a given agent and content hash.
 */
function writeSidecar(tmpDir, agent, hash, sidecarData) {
  const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
  fs.mkdirSync(reviewsDir, { recursive: true });
  const filename = `${agent}--${hash}.json`;
  fs.writeFileSync(path.join(reviewsDir, filename), JSON.stringify(sidecarData, null, 2));
}

// ─── Basic behavior ──────────────────────────────────────────────────────────

describe("dev-team-review-gate", () => {
  it("exits 0 for non-commit commands", () => {
    const result = runGate({ command: "git status" });
    assert.equal(result.code, 0);
  });

  it("exits 0 for malformed input", () => {
    const result = runGate({});
    assert.equal(result.code, 0);
  });

  it("exits 0 when --skip-review is used", () => {
    const tmpDir = createTempRepo();
    try {
      fs.writeFileSync(path.join(tmpDir, "handler.js"), "module.exports = {}");
      execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

      const result = runGate({ command: "git commit --skip-review -m 'test'" }, tmpDir);
      assert.equal(result.code, 0);
      assert.ok(result.stderr.includes("--skip-review") || result.stdout.includes("--skip-review"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("exits 0 when only non-code files are staged", () => {
    const tmpDir = createTempRepo();
    try {
      fs.writeFileSync(path.join(tmpDir, "README.md"), "# Hello");
      execFileSync("git", ["add", "README.md"], { cwd: tmpDir, encoding: "utf-8" });

      const result = runGate({ command: "git commit -m 'docs'" }, tmpDir);
      assert.equal(result.code, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("exits 0 when only test files are staged", () => {
    const tmpDir = createTempRepo();
    try {
      fs.writeFileSync(path.join(tmpDir, "handler.test.js"), "test('works', () => {})");
      execFileSync("git", ["add", "handler.test.js"], { cwd: tmpDir, encoding: "utf-8" });

      const result = runGate({ command: "git commit -m 'tests'" }, tmpDir);
      assert.equal(result.code, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ─── Gate 1: Review evidence ──────────────────────────────────────────────

  describe("Gate 1 — review evidence", () => {
    it("blocks when code is staged without review sidecars", () => {
      const tmpDir = createTempRepo();
      try {
        fs.writeFileSync(path.join(tmpDir, "handler.js"), "module.exports = {}");
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 2, "should block with exit 2");
        assert.ok(result.stderr.includes("BLOCKED"), "should show BLOCKED");
        assert.ok(result.stderr.includes("reviews missing"), "should mention missing reviews");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("allows commit when all required sidecars exist", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);

        // handler.js triggers knuth and brooks (non-test impl file)
        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });
        writeSidecar(tmpDir, "dev-team-brooks", hash, {
          agent: "dev-team-brooks",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 0, `Expected exit 0, got ${result.code}: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("blocks when only some required sidecars exist", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);

        // Only provide knuth, missing brooks
        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 2, "should block for missing brooks review");
        assert.ok(result.stderr.includes("dev-team-brooks"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("rejects stale sidecars (wrong content hash)", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = { updated: true }";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        // Write sidecar with old hash
        const staleHash = contentHash("module.exports = {}");

        writeSidecar(tmpDir, "dev-team-knuth", staleHash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: staleHash,
          reviewDepth: "STANDARD",
          findings: [],
        });
        writeSidecar(tmpDir, "dev-team-brooks", staleHash, {
          agent: "dev-team-brooks",
          file: "handler.js",
          contentHash: staleHash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 2, "should block — sidecars are for old content");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Gate 2: Findings resolution ──────────────────────────────────────────

  describe("Gate 2 — findings resolution", () => {
    it("blocks when unresolved [DEFECT] findings exist", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);

        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [
            {
              classification: "[DEFECT]",
              description: "Missing null check on input",
              line: 1,
              resolved: false,
            },
          ],
        });
        writeSidecar(tmpDir, "dev-team-brooks", hash, {
          agent: "dev-team-brooks",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 2, "should block for unresolved defect");
        assert.ok(result.stderr.includes("[DEFECT]"), "should mention DEFECT");
        assert.ok(result.stderr.includes("Missing null check"), "should show description");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("allows commit when [DEFECT] findings are resolved", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);

        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [
            {
              classification: "[DEFECT]",
              description: "Missing null check on input",
              line: 1,
              resolved: true,
            },
          ],
        });
        writeSidecar(tmpDir, "dev-team-brooks", hash, {
          agent: "dev-team-brooks",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 0, `Expected exit 0: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("allows [RISK] and [SUGGESTION] findings without resolution", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);

        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [
            { classification: "[RISK]", description: "Potential perf issue", resolved: false },
            {
              classification: "[SUGGESTION]",
              description: "Consider refactoring",
              resolved: false,
            },
          ],
        });
        writeSidecar(tmpDir, "dev-team-brooks", hash, {
          agent: "dev-team-brooks",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 0, `Non-defect findings should not block: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("skips defect check for LIGHT review depth", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);

        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "LIGHT",
          findings: [
            {
              classification: "[DEFECT]",
              description: "This would block if not LIGHT",
              resolved: false,
            },
          ],
        });
        writeSidecar(tmpDir, "dev-team-brooks", hash, {
          agent: "dev-team-brooks",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "LIGHT",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 0, `LIGHT review should not block: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Security ─────────────────────────────────────────────────────────────

  describe("security", () => {
    it("rejects symlinked sidecar files", () => {
      if (process.platform === "win32") return; // Symlinks need admin on Windows

      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);
        const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
        fs.mkdirSync(reviewsDir, { recursive: true });

        // Write a real file and symlink to it
        const realFile = path.join(tmpDir, "real-sidecar.json");
        fs.writeFileSync(
          realFile,
          JSON.stringify({
            agent: "dev-team-knuth",
            file: "handler.js",
            contentHash: hash,
            reviewDepth: "STANDARD",
            findings: [],
          }),
        );
        fs.symlinkSync(realFile, path.join(reviewsDir, `dev-team-knuth--${hash}.json`));

        // Brooks sidecar is real
        writeSidecar(tmpDir, "dev-team-brooks", hash, {
          agent: "dev-team-brooks",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 2, "should reject symlinked sidecar");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
