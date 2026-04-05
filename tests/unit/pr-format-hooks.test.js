"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOOKS_DIR = path.join(__dirname, "..", "..", "templates", "hooks");

/**
 * Helper: run a hook script with the given tool_input JSON and return the exit code.
 * Captures stdout and stderr regardless of exit code.
 */
function runHook(hookFile, toolInput, options = {}) {
  const input = JSON.stringify({ tool_input: toolInput });
  const cwd = options.cwd || process.cwd();
  try {
    const stdout = execFileSync(process.execPath, [path.join(HOOKS_DIR, hookFile), input], {
      encoding: "utf-8",
      timeout: 5000,
      cwd,
      env: { ...process.env, PATH: process.env.PATH },
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || "", stderr: err.stderr || "" };
  }
}

/**
 * Create a temporary directory with a .dev-team/config.json containing the given config.
 * Initializes a git repo with an initial commit so git rev-parse works.
 */
function createTempConfig(config) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-hooks-test-"));
  const devTeamDir = path.join(tmpDir, ".dev-team");
  fs.mkdirSync(devTeamDir, { recursive: true });
  fs.writeFileSync(path.join(devTeamDir, "config.json"), JSON.stringify(config, null, 2));
  // Initialize a git repo with an initial commit so rev-parse works
  try {
    execFileSync("git", ["init", "--initial-branch=main"], {
      cwd: tmpDir,
      stdio: "pipe",
    });
  } catch {
    execFileSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
  }
  execFileSync("git", ["config", "user.email", "test@test.com"], {
    cwd: tmpDir,
    stdio: "pipe",
  });
  execFileSync("git", ["config", "user.name", "Test"], {
    cwd: tmpDir,
    stdio: "pipe",
  });
  // Create an initial commit so HEAD exists
  fs.writeFileSync(path.join(tmpDir, ".gitkeep"), "");
  execFileSync("git", ["add", "."], { cwd: tmpDir, stdio: "pipe" });
  execFileSync("git", ["commit", "-m", "init"], { cwd: tmpDir, stdio: "pipe" });
  return tmpDir;
}

function cleanupTempDir(tmpDir) {
  if (tmpDir && tmpDir.startsWith(os.tmpdir())) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// --- PR Title Format ---

describe("dev-team-pr-title-format", () => {
  const hook = "dev-team-pr-title-format.js";

  it("exits 0 for non-gh-pr-create commands", () => {
    const result = runHook(hook, {
      command: "git push origin main",
    });
    assert.equal(result.code, 0);
  });

  it("exits 0 when no config exists (defaults to plain)", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-noconfig-"));
    try {
      const result = runHook(
        hook,
        { command: 'gh pr create --title "anything"' },
        { cwd: emptyDir },
      );
      assert.equal(result.code, 0);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  describe("conventional format", () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = createTempConfig({ pr: { titleFormat: "conventional" } });
    });
    afterEach(() => cleanupTempDir(tmpDir));

    it("allows valid conventional title", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --title "feat: add login"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("allows conventional title with scope", () => {
      const result = runHook(
        hook,
        {
          command: 'gh pr create --title "fix(auth): correct token refresh"',
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("allows conventional title with breaking change indicator", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --title "feat\!: breaking change"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("blocks non-conventional title", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --title "Add login feature"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 2);
      assert.ok(result.stderr.includes("BLOCKED"));
    });

    it("exits 0 when --skip-format is used", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --skip-format --title "Bad title"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("exits 0 when no --title flag present", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create",
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });
  });

  describe("issue-prefix format", () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = createTempConfig({ pr: { titleFormat: "issue-prefix" } });
    });
    afterEach(() => cleanupTempDir(tmpDir));

    it("allows title with issue prefix", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --title "[#123] Add login"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("blocks title without issue prefix", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --title "Add login"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 2);
      assert.ok(result.stderr.includes("BLOCKED"));
    });
  });

  describe("workflow.pr disabled", () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = createTempConfig({
        workflow: { pr: false },
        pr: { titleFormat: "conventional" },
      });
    });
    afterEach(() => cleanupTempDir(tmpDir));

    it("exits 0 when workflow.pr is false", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --title "Bad title"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });
  });
});

// --- PR Link Keyword ---

describe("dev-team-pr-link-keyword", () => {
  const hook = "dev-team-pr-link-keyword.js";

  it("exits 0 for non-gh-pr-create commands", () => {
    const result = runHook(hook, {
      command: "git push origin main",
    });
    assert.equal(result.code, 0);
  });

  it("exits 0 when no linkKeyword configured", () => {
    const result = runHook(hook, {
      command: 'gh pr create --body "no link"',
    });
    assert.equal(result.code, 0);
  });

  describe("with Closes keyword", () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = createTempConfig({ pr: { linkKeyword: "Closes" } });
    });
    afterEach(() => cleanupTempDir(tmpDir));

    it("allows body with correct link keyword", () => {
      const result = runHook(
        hook,
        {
          command: 'gh pr create --title "feat: x" --body "Closes #123"',
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("blocks body without link keyword", () => {
      const result = runHook(
        hook,
        {
          command: 'gh pr create --title "feat: x" --body "No link here"',
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 2);
      assert.ok(result.stderr.includes("BLOCKED"));
    });

    it("exits 0 when --skip-format is used", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --skip-format --body "No link"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("exits 0 when no --body flag present", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create",
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });
  });
});

// --- PR Draft Advisory ---

describe("dev-team-pr-draft", () => {
  const hook = "dev-team-pr-draft.js";

  it("exits 0 for non-gh-pr-create commands", () => {
    const result = runHook(hook, {
      command: "git push origin main",
    });
    assert.equal(result.code, 0);
  });

  it("exits 0 when pr.draft is not set", () => {
    const result = runHook(hook, {
      command: "gh pr create",
    });
    assert.equal(result.code, 0);
  });

  describe("with pr.draft enabled", () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = createTempConfig({ pr: { draft: true } });
    });
    afterEach(() => cleanupTempDir(tmpDir));

    it("exits 0 when --draft is present", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create --draft",
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("exits 0 when --draft is missing (advisory only, never blocks)", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create",
        },
        { cwd: tmpDir },
      );
      // Advisory only — must exit 0 regardless
      assert.equal(result.code, 0);
    });

    it("exits 0 when --skip-format is used", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create --skip-format",
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });
  });
});

// --- PR Template Sections ---

describe("dev-team-pr-template", () => {
  const hook = "dev-team-pr-template.js";

  it("exits 0 for non-gh-pr-create commands", () => {
    const result = runHook(hook, {
      command: "git push origin main",
    });
    assert.equal(result.code, 0);
  });

  it("exits 0 when no template configured", () => {
    const result = runHook(hook, {
      command: 'gh pr create --body "anything"',
    });
    assert.equal(result.code, 0);
  });

  describe("with required sections", () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = createTempConfig({
        pr: { template: ["## Summary", "## Test plan"] },
      });
    });
    afterEach(() => cleanupTempDir(tmpDir));

    it("allows body with all required sections", () => {
      // Use actual newlines in the body string
      const body = "## Summary\nSome summary\n## Test plan\nSome tests";
      const result = runHook(
        hook,
        { command: 'gh pr create --body "' + body + '"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("blocks body missing a required section", () => {
      const body = "## Summary\nSome summary";
      const result = runHook(
        hook,
        { command: 'gh pr create --body "' + body + '"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 2);
      assert.ok(result.stderr.includes("BLOCKED"));
      assert.ok(result.stderr.includes("## Test plan"));
    });

    it("exits 0 when --skip-format is used", () => {
      const result = runHook(
        hook,
        { command: 'gh pr create --skip-format --body "no sections"' },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });

    it("exits 0 when no --body flag present", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create",
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });
  });
});

// --- PR Auto-Label ---

describe("dev-team-pr-auto-label", () => {
  const hook = "dev-team-pr-auto-label.js";

  it("exits 0 for non-gh-pr-create commands", () => {
    const result = runHook(hook, {
      command: "git push origin main",
    });
    assert.equal(result.code, 0);
  });

  it("exits 0 when pr.autoLabel is not set", () => {
    const result = runHook(hook, {
      command: "gh pr create",
    });
    assert.equal(result.code, 0);
  });

  describe("with autoLabel enabled on feat/ branch", () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = createTempConfig({ pr: { autoLabel: true } });
      execFileSync("git", ["checkout", "-b", "feat/123-test"], {
        cwd: tmpDir,
        stdio: "pipe",
      });
    });
    afterEach(() => cleanupTempDir(tmpDir));

    it("suggests enhancement label for feat/ branch", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create",
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
      assert.ok(result.stdout.includes("enhancement"));
    });

    it("exits 0 when --skip-format is used", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create --skip-format",
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
    });
  });

  describe("with autoLabel enabled on fix/ branch", () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = createTempConfig({ pr: { autoLabel: true } });
      execFileSync("git", ["checkout", "-b", "fix/456-bugfix"], {
        cwd: tmpDir,
        stdio: "pipe",
      });
    });
    afterEach(() => cleanupTempDir(tmpDir));

    it("suggests bug label for fix/ branch", () => {
      const result = runHook(
        hook,
        {
          command: "gh pr create",
        },
        { cwd: tmpDir },
      );
      assert.equal(result.code, 0);
      assert.ok(result.stdout.includes("bug"));
    });
  });
});
