"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { reviewGateHandler } = require("../../dist/mcp/tools/review-gate");

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-review-gate-"));
  return tmpDir;
}

function contentHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function writeSidecar(tmpDir, agent, hash, sidecarData) {
  const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
  fs.mkdirSync(reviewsDir, { recursive: true });
  const filename = `${agent}--${hash}.json`;
  fs.writeFileSync(path.join(reviewsDir, filename), JSON.stringify(sidecarData, null, 2));
}

function writeProjectFile(tmpDir, filePath, content) {
  const fullPath = path.join(tmpDir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return content;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("MCP review_gate tool", () => {
  describe("non-gated files", () => {
    it("allows markdown files (not gated)", async () => {
      const result = await reviewGateHandler({ path: "README.md" });
      assert.equal(result.allowed, true);
      assert.ok(result.reason.includes("not gated"));
    });

    it("allows JSON config files (not gated)", async () => {
      const result = await reviewGateHandler({ path: "package.json" });
      assert.equal(result.allowed, true);
    });

    it("allows test files (not gated)", async () => {
      const result = await reviewGateHandler({ path: "tests/unit/foo.test.js" });
      assert.equal(result.allowed, true);
    });

    it("allows spec files (not gated)", async () => {
      const result = await reviewGateHandler({ path: "src/foo.spec.ts" });
      assert.equal(result.allowed, true);
    });
  });

  describe("missing path parameter", () => {
    it("returns not allowed when path is missing", async () => {
      const result = await reviewGateHandler({});
      assert.equal(result.allowed, false);
      assert.ok(result.reason.includes("Missing"));
    });
  });

  describe("gated files with review evidence", () => {
    it("allows a file when all required reviews exist", async () => {
      const tmpDir = createTempProject();
      const content = writeProjectFile(tmpDir, "src/index.ts", "export const x = 1;\n");
      const hash = contentHash(content);

      // Write sidecar files for required agents (knuth and brooks)
      writeSidecar(tmpDir, "dev-team-knuth", hash, {
        agent: "dev-team-knuth",
        contentHash: hash,
        reviewDepth: "STANDARD",
        findings: [],
      });
      writeSidecar(tmpDir, "dev-team-brooks", hash, {
        agent: "dev-team-brooks",
        contentHash: hash,
        reviewDepth: "STANDARD",
        findings: [],
      });

      const result = await reviewGateHandler({
        path: "src/index.ts",
        projectDir: tmpDir,
      });

      assert.equal(result.allowed, true);
      assert.ok(result.reason.includes("no unresolved defects"));

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("blocks when reviews are missing", async () => {
      const tmpDir = createTempProject();
      writeProjectFile(tmpDir, "src/server.ts", "console.log('hello');\n");
      // No sidecar files written

      const result = await reviewGateHandler({
        path: "src/server.ts",
        projectDir: tmpDir,
      });

      assert.equal(result.allowed, false);
      assert.ok(result.reason.includes("missing"));
      assert.ok(Array.isArray(result.missing));
      assert.ok(result.missing.length > 0);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe("unresolved defects", () => {
    it("blocks when there are unresolved DEFECT findings", async () => {
      const tmpDir = createTempProject();
      const content = writeProjectFile(tmpDir, "src/auth.ts", "export function login() {}\n");
      const hash = contentHash(content);

      // Write sidecars with an unresolved defect
      writeSidecar(tmpDir, "dev-team-szabo", hash, {
        agent: "dev-team-szabo",
        contentHash: hash,
        reviewDepth: "STANDARD",
        findings: [
          {
            classification: "[DEFECT]",
            description: "Missing input validation",
            resolved: false,
          },
        ],
      });
      writeSidecar(tmpDir, "dev-team-knuth", hash, {
        agent: "dev-team-knuth",
        contentHash: hash,
        reviewDepth: "STANDARD",
        findings: [],
      });
      writeSidecar(tmpDir, "dev-team-brooks", hash, {
        agent: "dev-team-brooks",
        contentHash: hash,
        reviewDepth: "STANDARD",
        findings: [],
      });

      const result = await reviewGateHandler({
        path: "src/auth.ts",
        projectDir: tmpDir,
      });

      assert.equal(result.allowed, false);
      assert.ok(result.reason.includes("DEFECT"));
      assert.ok(Array.isArray(result.unresolvedDefects));
      assert.ok(result.unresolvedDefects.length > 0);
      assert.ok(result.unresolvedDefects[0].description.includes("input validation"));

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("allows when LIGHT review has defects (advisory only)", async () => {
      const tmpDir = createTempProject();
      const content = writeProjectFile(tmpDir, "src/util.ts", "export const y = 2;\n");
      const hash = contentHash(content);

      writeSidecar(tmpDir, "dev-team-knuth", hash, {
        agent: "dev-team-knuth",
        contentHash: hash,
        reviewDepth: "LIGHT",
        findings: [
          {
            classification: "[DEFECT]",
            description: "Advisory finding in LIGHT review",
            resolved: false,
          },
        ],
      });
      writeSidecar(tmpDir, "dev-team-brooks", hash, {
        agent: "dev-team-brooks",
        contentHash: hash,
        reviewDepth: "LIGHT",
        findings: [],
      });

      const result = await reviewGateHandler({
        path: "src/util.ts",
        projectDir: tmpDir,
      });

      assert.equal(result.allowed, true);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe("file detection", () => {
    it("gates TypeScript implementation files", async () => {
      const tmpDir = createTempProject();
      writeProjectFile(tmpDir, "src/app.ts", "const x = 1;\n");

      const result = await reviewGateHandler({
        path: "src/app.ts",
        projectDir: tmpDir,
      });

      // Should be blocked (no reviews), proving it IS gated
      assert.equal(result.allowed, false);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("gates Python implementation files", async () => {
      const tmpDir = createTempProject();
      writeProjectFile(tmpDir, "src/main.py", "print('hello')\n");

      const result = await reviewGateHandler({
        path: "src/main.py",
        projectDir: tmpDir,
      });

      assert.equal(result.allowed, false);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("gates Go implementation files", async () => {
      const tmpDir = createTempProject();
      writeProjectFile(tmpDir, "cmd/main.go", "package main\n");

      const result = await reviewGateHandler({
        path: "cmd/main.go",
        projectDir: tmpDir,
      });

      assert.equal(result.allowed, false);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
