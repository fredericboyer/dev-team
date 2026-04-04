"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("crypto");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOOK_PATH = path.join(__dirname, "..", "..", "templates", "hooks", "dev-team-review-gate.js");

/**
 * Run the review gate hook with a given tool_input in a specific cwd.
 */
function runGate(toolInput, cwd) {
  const input = JSON.stringify({ tool_input: toolInput });
  const result = spawnSync(process.execPath, [HOOK_PATH, input], {
    encoding: "utf-8",
    timeout: 10000,
    cwd: cwd || process.cwd(),
    env: { ...process.env, PATH: process.env.PATH },
  });
  return { code: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
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

    it("exits 0 when any single sidecar exists (SIMPLE task)", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);

        // SIMPLE task: only knuth sidecar — no assessment, so any sidecar suffices
        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 0, `SIMPLE task: one sidecar should suffice: ${result.stderr}`);
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

  // ─── Mixed staged files ─────────────────────────────────────────────────

  describe("mixed staged files", () => {
    it("only requires sidecars for gated implementation files", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        fs.writeFileSync(path.join(tmpDir, "README.md"), "# Docs");
        fs.writeFileSync(path.join(tmpDir, "handler.test.js"), "test('works', () => {})");
        execFileSync("git", ["add", "handler.js", "README.md", "handler.test.js"], {
          cwd: tmpDir,
          encoding: "utf-8",
        });

        const hash = contentHash(code);

        // Only handler.js needs knuth + brooks sidecars (gated impl file)
        // README.md is non-code, handler.test.js is a test file — neither gated
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

        const result = runGate({ command: "git commit -m 'feat: mixed files'" }, tmpDir);
        assert.equal(result.code, 0, `Expected exit 0: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── QUESTION classification ───────────────────────────────────────────────

  describe("Gate 2 — [QUESTION] classification", () => {
    it("allows unresolved [QUESTION] findings without blocking", () => {
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
            { classification: "[QUESTION]", description: "Why is this exported?", resolved: false },
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
        assert.equal(result.code, 0, `[QUESTION] should not block: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Cleanup manifest ─────────────────────────────────────────────────────

  describe("cleanup manifest", () => {
    it("writes .cleanup-manifest.json with correct sidecar filenames after gates pass", () => {
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
        assert.equal(result.code, 0, `Expected exit 0: ${result.stderr}`);

        const manifestPath = path.join(tmpDir, ".dev-team", ".reviews", ".cleanup-manifest.json");
        assert.ok(fs.existsSync(manifestPath), "cleanup manifest should exist");

        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        assert.ok(Array.isArray(manifest), "manifest should be an array");
        assert.ok(manifest.includes(`dev-team-knuth--${hash}.json`));
        assert.ok(manifest.includes(`dev-team-brooks--${hash}.json`));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Security-pattern files triggering Szabo ───────────────────────────────

  describe("COMPLEX task — required reviewers from assessment sidecar", () => {
    function writeAssessment(tmpDir, requiredReviewers) {
      const branch = execFileSync("git", ["-C", tmpDir, "rev-parse", "--abbrev-ref", "HEAD"], {
        encoding: "utf-8",
      }).trim();
      const safeBranch = branch.replace(/[^a-zA-Z0-9._-]/g, "_");
      const assessmentsDir = path.join(tmpDir, ".dev-team", ".assessments");
      fs.mkdirSync(assessmentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(assessmentsDir, `${safeBranch}.json`),
        JSON.stringify({ complexity: "COMPLEX", requiredReviewers }),
      );
    }

    it("COMPLEX task blocks when a required reviewer sidecar is missing", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = { login() {} }";
        fs.writeFileSync(path.join(tmpDir, "auth.js"), code);
        execFileSync("git", ["add", "auth.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);
        writeAssessment(tmpDir, ["dev-team-szabo", "dev-team-knuth"]);

        // Provide knuth but NOT szabo (which is required by assessment)
        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "auth.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat: auth'" }, tmpDir);
        assert.equal(result.code, 2, "should block — missing required szabo review");
        assert.ok(result.stderr.includes("dev-team-szabo"), "should mention szabo");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("COMPLEX task passes when all required reviewers present", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = { verify() {} }";
        fs.writeFileSync(path.join(tmpDir, "token-service.ts"), code);
        execFileSync("git", ["add", "token-service.ts"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);
        writeAssessment(tmpDir, ["dev-team-szabo", "dev-team-knuth"]);

        writeSidecar(tmpDir, "dev-team-szabo", hash, {
          agent: "dev-team-szabo",
          file: "token-service.ts",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });
        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "token-service.ts",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        const result = runGate({ command: "git commit -m 'feat: token'" }, tmpDir);
        assert.equal(result.code, 0, `Expected exit 0: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Sidecar schema validation ─────────────────────────────────────────────

  describe("sidecar schema validation", () => {
    it("skips malformed sidecar where findings is not an array", () => {
      const tmpDir = createTempRepo();
      try {
        const code = "module.exports = {}";
        fs.writeFileSync(path.join(tmpDir, "handler.js"), code);
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        const hash = contentHash(code);

        // Knuth sidecar has findings as a string instead of array
        writeSidecar(tmpDir, "dev-team-knuth", hash, {
          agent: "dev-team-knuth",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: "not an array",
        });
        writeSidecar(tmpDir, "dev-team-brooks", hash, {
          agent: "dev-team-brooks",
          file: "handler.js",
          contentHash: hash,
          reviewDepth: "STANDARD",
          findings: [],
        });

        // Gate 1 passes (sidecars exist), Gate 2 should skip malformed findings
        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 0, `Malformed findings should be skipped: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── --skip-review strict matching ─────────────────────────────────────────

  describe("--skip-review strict matching", () => {
    it("does NOT bypass when --skip-review appears only in -m message body", () => {
      const tmpDir = createTempRepo();
      try {
        fs.writeFileSync(path.join(tmpDir, "handler.js"), "module.exports = {}");
        execFileSync("git", ["add", "handler.js"], { cwd: tmpDir, encoding: "utf-8" });

        // --skip-review is inside the commit message, not as a git flag
        const result = runGate(
          { command: "git commit -m 'fix: mentioned --skip-review in message'" },
          tmpDir,
        );
        // Should still block — no sidecars present
        assert.equal(result.code, 2, "should block — --skip-review in message should not bypass");
        assert.ok(result.stderr.includes("BLOCKED"));
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

        // knuth is symlinked (rejected) and no other real sidecar exists — should block
        const result = runGate({ command: "git commit -m 'feat'" }, tmpDir);
        assert.equal(result.code, 2, "should reject symlinked sidecar");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
