"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { run } = require("../../dist/init");

let tmpDir;
let originalCwd;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-python-"));
  originalCwd = process.cwd();
  process.chdir(tmpDir);

  // Simulate a Python project
  fs.writeFileSync(
    path.join(tmpDir, "pyproject.toml"),
    '[project]\nname = "my-python-app"\nversion = "1.0.0"\n',
  );
  fs.mkdirSync(path.join(tmpDir, "src", "my_app"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "src", "my_app", "__init__.py"), "");
  fs.writeFileSync(
    path.join(tmpDir, "src", "my_app", "main.py"),
    'def hello():\n    return "world"\n',
  );
  fs.mkdirSync(path.join(tmpDir, "tests"));
  fs.writeFileSync(
    path.join(tmpDir, "tests", "test_main.py"),
    "def test_hello():\n    assert True\n",
  );
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Python project scenario", () => {
  it("installs into a Python project without Node artifacts", async () => {
    await run(tmpDir, ["--all"]);

    // Agents installed in .claude/agents/ (runtime-native)
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-szabo.agent.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-knuth.agent.md")));

    // No package.json created (dev-team should not add Node artifacts to Python projects)
    assert.ok(!fs.existsSync(path.join(tmpDir, "package.json")), "should not create package.json");

    // CLAUDE.md created fresh (no existing one)
    assert.ok(fs.existsSync(path.join(tmpDir, "CLAUDE.md")));
    const claudeMd = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    assert.ok(claudeMd.includes("dev-team:begin"));

    // pyproject.toml untouched
    const pyproject = fs.readFileSync(path.join(tmpDir, "pyproject.toml"), "utf-8");
    assert.ok(pyproject.includes("my-python-app"));
  });

  it("hooks work with Python file paths", async () => {
    await run(tmpDir, ["--all"]);

    // The post-change-review hook should flag review needed for .py files
    const { execFileSync } = require("child_process");
    const hookPath = path.join(tmpDir, ".dev-team", "hooks", "dev-team-post-change-review.js");
    const input = JSON.stringify({ tool_input: { file_path: "/app/src/my_app/main.py" } });

    const stdout = execFileSync(process.execPath, [hookPath, input], {
      encoding: "utf-8",
      timeout: 5000,
    });
    assert.ok(stdout.includes("ACTION REQUIRED"), "should flag review needed for .py files");
  });

  it("tdd-enforce recognizes Python test patterns", async () => {
    await run(tmpDir, ["--all"]);

    const { execFileSync } = require("child_process");
    const hookPath = path.join(tmpDir, ".dev-team", "hooks", "dev-team-tdd-enforce.js");

    // Python test files should be skipped (not blocked)
    const input = JSON.stringify({ tool_input: { file_path: "/app/tests/test_main.py" } });
    execFileSync(process.execPath, [hookPath, input], {
      encoding: "utf-8",
      timeout: 5000,
    });
    // Exit 0 means allowed
    assert.ok(true);
  });
});
