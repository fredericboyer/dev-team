"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOOK_PATH = path.join(__dirname, "..", "..", "templates", "hooks", "dev-team-merge-gate.js");

/**
 * Run the merge gate hook with a given tool_input in a specific cwd.
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
 * Create a temp git repo with an initial commit on a known branch and return its path.
 */
function createTempRepo(branchName) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-merge-gate-"));
  execFileSync("git", ["init", "-b", branchName || "feat/test-branch"], {
    cwd: tmpDir,
    encoding: "utf-8",
  });
  execFileSync("git", ["config", "user.email", "test@test.com"], {
    cwd: tmpDir,
    encoding: "utf-8",
  });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: tmpDir, encoding: "utf-8" });
  fs.writeFileSync(path.join(tmpDir, ".gitkeep"), "");
  execFileSync("git", ["add", ".gitkeep"], { cwd: tmpDir, encoding: "utf-8" });
  execFileSync("git", ["commit", "-m", "init"], { cwd: tmpDir, encoding: "utf-8" });
  return tmpDir;
}

/**
 * Write a review sidecar for a branch in .dev-team/.reviews/.
 */
function writeSidecar(tmpDir, branch, agentName, extra) {
  const sanitized = branch.replace(/[^a-zA-Z0-9-]/g, "-");
  const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
  fs.mkdirSync(reviewsDir, { recursive: true });
  const filename = `${agentName}--${sanitized}.json`;
  const data = Object.assign({ branch, agent: agentName }, extra || {});
  fs.writeFileSync(path.join(reviewsDir, filename), JSON.stringify(data));
  return filename;
}

/**
 * Write a Brooks assessment sidecar for a branch in .dev-team/.assessments/.
 */
function writeAssessment(tmpDir, branch, fields) {
  const sanitized = branch.replace(/[^a-zA-Z0-9-]/g, "-");
  const assessmentsDir = path.join(tmpDir, ".dev-team", ".assessments");
  fs.mkdirSync(assessmentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(assessmentsDir, `${sanitized}.json`),
    JSON.stringify(Object.assign({ branch, complexity: "SIMPLE", requiredReviewers: [] }, fields)),
  );
}

// ─── Basic behavior ────────────────────────────────────────────────────────────

describe("dev-team-merge-gate", () => {
  it("exits 0 for non-merge commands", () => {
    const result = runGate({ command: "git status" });
    assert.equal(result.code, 0);
  });

  it("exits 0 for malformed input", () => {
    const result = runGate({});
    assert.equal(result.code, 0);
  });

  it("exits 0 and logs warning when --skip-review is used", () => {
    const tmpDir = createTempRepo();
    try {
      const result = runGate(
        { command: "gh pr merge feat/my-branch --skip-review --squash" },
        tmpDir,
      );
      assert.equal(result.code, 0);
      assert.ok(result.stderr.includes("--skip-review"), "should log --skip-review bypass warning");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ─── Branch detection ──────────────────────────────────────────────────────

  describe("branch detection", () => {
    it("uses current git branch when no explicit branch in command", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
        fs.mkdirSync(reviewsDir, { recursive: true });
        // No sidecar → should block with the current branch name in message
        const result = runGate({ command: "gh pr merge --squash" }, tmpDir);
        assert.equal(result.code, 2);
        assert.ok(result.stderr.includes(branch), `stderr should mention branch '${branch}'`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("uses explicit branch from command when provided", () => {
      const tmpDir = createTempRepo("main");
      try {
        const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
        fs.mkdirSync(reviewsDir, { recursive: true });
        const result = runGate({ command: "gh pr merge feat/my-feature --squash" }, tmpDir);
        assert.equal(result.code, 2);
        assert.ok(result.stderr.includes("feat/my-feature"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Sidecar review evidence ───────────────────────────────────────────────

  describe("review evidence gate", () => {
    it("blocks when no .dev-team/.reviews/ directory exists", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        const result = runGate({ command: "gh pr merge feat/test-branch --squash" }, tmpDir);
        assert.equal(result.code, 2);
        assert.ok(result.stderr.includes("BLOCKED"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("blocks when reviews dir exists but no sidecar matches branch", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        // Write a sidecar for a different branch
        writeSidecar(tmpDir, "feat/other-branch", "dev-team-knuth");
        const result = runGate({ command: "gh pr merge feat/test-branch --squash" }, tmpDir);
        assert.equal(result.code, 2);
        assert.ok(result.stderr.includes("BLOCKED"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("allows merge when a matching sidecar exists", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        writeSidecar(tmpDir, branch, "dev-team-knuth");
        const result = runGate({ command: "gh pr merge feat/test-branch --squash" }, tmpDir);
        assert.equal(result.code, 0, `Expected exit 0: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("rejects symlinked sidecar files", () => {
      if (process.platform === "win32") return; // Symlinks require admin on Windows

      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
        fs.mkdirSync(reviewsDir, { recursive: true });

        // Create a real sidecar file outside the reviews dir and symlink it in
        const realFile = path.join(tmpDir, "real-sidecar.json");
        fs.writeFileSync(realFile, JSON.stringify({ branch, agent: "dev-team-knuth" }));
        const sanitized = branch.replace(/[^a-zA-Z0-9-]/g, "-");
        fs.symlinkSync(realFile, path.join(reviewsDir, `dev-team-knuth--${sanitized}.json`));

        const result = runGate({ command: "gh pr merge feat/test-branch --squash" }, tmpDir);
        assert.equal(result.code, 2, "should reject symlinked sidecar");
        assert.ok(result.stderr.includes("BLOCKED"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("warns and fails open when readdirSync throws", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        // Create .reviews as a file (not a directory) so readdirSync throws
        const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
        fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
        fs.writeFileSync(reviewsDir, "not a directory");

        const result = runGate({ command: "gh pr merge feat/test-branch --squash" }, tmpDir);
        assert.equal(result.code, 0, "should fail open on readdirSync error");
        assert.ok(
          result.stderr.includes("WARNING") || result.stderr.includes("warn"),
          "should warn on fail-open",
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Assessment sidecar — symlink guard ───────────────────────────────────

  describe("assessment symlink guard", () => {
    it("skips symlinked assessment file and falls back to any-sidecar behavior", () => {
      if (process.platform === "win32") return;

      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        // Write a matching review sidecar (gate 1 passes)
        writeSidecar(tmpDir, branch, "dev-team-knuth");

        // Create a real assessment file elsewhere and symlink it into .assessments/
        const assessmentsDir = path.join(tmpDir, ".dev-team", ".assessments");
        fs.mkdirSync(assessmentsDir, { recursive: true });
        const realAssessment = path.join(tmpDir, "real-assessment.json");
        fs.writeFileSync(
          realAssessment,
          JSON.stringify({
            branch,
            complexity: "COMPLEX",
            requiredReviewers: ["dev-team-szabo"],
          }),
        );
        const sanitized = branch.replace(/[^a-zA-Z0-9-]/g, "-");
        fs.symlinkSync(realAssessment, path.join(assessmentsDir, `${sanitized}.json`));

        // Symlink assessment is skipped → falls back to any-sidecar → passes (knuth sidecar exists)
        const result = runGate({ command: `gh pr merge ${branch} --squash` }, tmpDir);
        assert.equal(
          result.code,
          0,
          `Symlinked assessment should be skipped, not enforced: ${result.stderr}`,
        );
        assert.ok(result.stderr.includes("WARNING"), "should warn about symlinked assessment");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Assessment branch field validation ───────────────────────────────────

  describe("assessment branch field validation", () => {
    it("skips assessment when branch field mismatches", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        writeSidecar(tmpDir, branch, "dev-team-knuth");

        // Write assessment with a different branch field
        const sanitized = branch.replace(/[^a-zA-Z0-9-]/g, "-");
        const assessmentsDir = path.join(tmpDir, ".dev-team", ".assessments");
        fs.mkdirSync(assessmentsDir, { recursive: true });
        fs.writeFileSync(
          path.join(assessmentsDir, `${sanitized}.json`),
          JSON.stringify({
            branch: "feat/some-other-branch",
            complexity: "COMPLEX",
            requiredReviewers: ["dev-team-szabo"],
          }),
        );

        // Mismatched branch → assessment skipped → any-sidecar sufficient → passes
        const result = runGate({ command: `gh pr merge ${branch} --squash` }, tmpDir);
        assert.equal(result.code, 0, `Branch mismatch should skip assessment: ${result.stderr}`);
        assert.ok(result.stderr.includes("WARNING"), "should warn about branch mismatch");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("uses assessment when branch field matches", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        writeSidecar(tmpDir, branch, "dev-team-knuth");

        writeAssessment(tmpDir, branch, {
          complexity: "COMPLEX",
          requiredReviewers: ["dev-team-szabo"],
        });

        // szabo sidecar is missing → COMPLEX enforcement fires → blocked
        const result = runGate({ command: `gh pr merge ${branch} --squash` }, tmpDir);
        assert.equal(result.code, 2, "COMPLEX assessment should enforce required reviewers");
        assert.ok(result.stderr.includes("dev-team-szabo"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Complexity-aware enforcement ─────────────────────────────────────────

  describe("COMPLEX task enforcement", () => {
    it("blocks when COMPLEX assessment lists required reviewers not present", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        writeSidecar(tmpDir, branch, "dev-team-knuth");
        writeAssessment(tmpDir, branch, {
          complexity: "COMPLEX",
          requiredReviewers: ["dev-team-szabo", "dev-team-knuth"],
        });

        // knuth is present but szabo is missing
        const result = runGate({ command: `gh pr merge ${branch} --squash` }, tmpDir);
        assert.equal(result.code, 2);
        assert.ok(result.stderr.includes("dev-team-szabo"));
        assert.ok(result.stderr.includes("BLOCKED"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("allows merge when all COMPLEX required reviewers are present", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        writeSidecar(tmpDir, branch, "dev-team-szabo");
        writeSidecar(tmpDir, branch, "dev-team-knuth");
        writeAssessment(tmpDir, branch, {
          complexity: "COMPLEX",
          requiredReviewers: ["dev-team-szabo", "dev-team-knuth"],
        });

        const result = runGate({ command: `gh pr merge ${branch} --squash` }, tmpDir);
        assert.equal(result.code, 0, `Expected exit 0: ${result.stderr}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("allows merge for COMPLEX assessment with empty requiredReviewers", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        writeSidecar(tmpDir, branch, "dev-team-knuth");
        writeAssessment(tmpDir, branch, {
          complexity: "COMPLEX",
          requiredReviewers: [],
        });

        // Empty requiredReviewers → COMPLEX enforcement does not fire → passes
        const result = runGate({ command: `gh pr merge ${branch} --squash` }, tmpDir);
        assert.equal(
          result.code,
          0,
          `COMPLEX with empty requiredReviewers should pass: ${result.stderr}`,
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("treats complexity case-insensitively (lowercase 'complex')", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        writeSidecar(tmpDir, branch, "dev-team-knuth");

        // Write assessment with lowercase complexity
        const sanitized = branch.replace(/[^a-zA-Z0-9-]/g, "-");
        const assessmentsDir = path.join(tmpDir, ".dev-team", ".assessments");
        fs.mkdirSync(assessmentsDir, { recursive: true });
        fs.writeFileSync(
          path.join(assessmentsDir, `${sanitized}.json`),
          JSON.stringify({
            branch,
            complexity: "complex",
            requiredReviewers: ["dev-team-szabo"],
          }),
        );

        // lowercase 'complex' should be treated as COMPLEX → szabo missing → blocked
        const result = runGate({ command: `gh pr merge ${branch} --squash` }, tmpDir);
        assert.equal(result.code, 2, "lowercase 'complex' should trigger COMPLEX enforcement");
        assert.ok(result.stderr.includes("dev-team-szabo"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("skips agent-less sidecar when checking reviewer coverage for COMPLEX", () => {
      const branch = "feat/test-branch";
      const tmpDir = createTempRepo(branch);
      try {
        // Write a sidecar without an 'agent' field for this branch
        const sanitized = branch.replace(/[^a-zA-Z0-9-]/g, "-");
        const reviewsDir = path.join(tmpDir, ".dev-team", ".reviews");
        fs.mkdirSync(reviewsDir, { recursive: true });
        fs.writeFileSync(
          path.join(reviewsDir, `dev-team-knuth--${sanitized}.json`),
          JSON.stringify({ branch }), // no 'agent' field
        );

        writeAssessment(tmpDir, branch, {
          complexity: "COMPLEX",
          requiredReviewers: ["dev-team-knuth"],
        });

        // Agent field is missing → reviewer set is empty → blocked
        const result = runGate({ command: `gh pr merge ${branch} --squash` }, tmpDir);
        assert.equal(
          result.code,
          2,
          "sidecar without agent field should not satisfy COMPLEX requirement",
        );
        assert.ok(result.stderr.includes("dev-team-knuth"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
