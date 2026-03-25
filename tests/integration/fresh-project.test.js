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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-fresh-"));
  originalCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("fresh project installation", () => {
  it("creates all expected files with --all", async () => {
    await run(tmpDir, ["--all"]);

    // Agents
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "agents", "dev-team-voss.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "agents", "dev-team-mori.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "agents", "dev-team-szabo.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "agents", "dev-team-knuth.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "agents", "dev-team-beck.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "agents", "dev-team-deming.md")));

    // Hooks
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "hooks", "dev-team-safety-guard.js")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "hooks", "dev-team-tdd-enforce.js")));
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "hooks", "dev-team-post-change-review.js")),
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "hooks", "dev-team-pre-commit-gate.js")),
    );

    // Framework skills (always installed to .dev-team/skills/)
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "skills", "dev-team-challenge", "SKILL.md")),
    );
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "skills", "dev-team-task", "SKILL.md")));
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "skills", "dev-team-assess", "SKILL.md")),
    );
    // Workflow skills (merge, security-status) are NOT installed to .dev-team/skills/ anymore
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".dev-team", "skills", "dev-team-merge", "SKILL.md")),
      "merge skill should not be in .dev-team/skills/ (moved to workflow-skills)",
    );

    // Memory
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "agent-memory", "dev-team-voss", "MEMORY.md")),
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "agent-memory", "dev-team-beck", "MEMORY.md")),
    );
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "learnings.md")));

    // Settings (stays in .claude/)
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "settings.json")));

    // CLAUDE.md
    assert.ok(fs.existsSync(path.join(tmpDir, "CLAUDE.md")));

    // Preferences
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "config.json")));
  });

  it("agent files have valid YAML frontmatter", async () => {
    await run(tmpDir, ["--all"]);

    const agentFiles = fs.readdirSync(path.join(tmpDir, ".dev-team", "agents"));
    for (const file of agentFiles) {
      const content = fs.readFileSync(path.join(tmpDir, ".dev-team", "agents", file), "utf-8");
      assert.ok(content.startsWith("---"), `${file} should start with YAML frontmatter`);
      assert.ok(content.includes("name:"), `${file} should have a name field`);
      assert.ok(content.includes("description:"), `${file} should have a description field`);
      assert.ok(content.includes("model:"), `${file} should have a model field`);
      assert.ok(content.includes("memory: project"), `${file} should have memory: project`);
    }
  });

  it("settings.json has valid hook configuration", async () => {
    await run(tmpDir, ["--all"]);

    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    );
    assert.ok(settings.hooks, "settings should have hooks");
    assert.ok(settings.hooks.PostToolUse, "should have PostToolUse hooks");
    assert.ok(settings.hooks.PreToolUse, "should have PreToolUse hooks");
    assert.ok(settings.hooks.TaskCompleted, "should have TaskCompleted hooks");
  });

  it("CLAUDE.md contains dev-team markers", async () => {
    await run(tmpDir, ["--all"]);

    const content = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    assert.ok(content.includes("<!-- dev-team:begin -->"));
    assert.ok(content.includes("<!-- dev-team:end -->"));
    assert.ok(content.includes("@dev-team-voss"));
  });

  it("preferences file records selections", async () => {
    await run(tmpDir, ["--all"]);

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.ok(prefs.version, "should have a version");
    assert.ok(/^\d+\.\d+\.\d+/.test(prefs.version), "version should be semver");
    assert.ok(prefs.agents.includes("Voss"));
    assert.ok(prefs.agents.includes("Beck"));
    assert.ok(prefs.hooks.includes("TDD enforcement"));
    assert.equal(prefs.issueTracker, "GitHub Issues");
    assert.equal(prefs.branchConvention, "feat/123-description");
  });

  it("--preset backend installs only backend agents", async () => {
    await run(tmpDir, ["--preset", "backend"]);

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.equal(prefs.preset, "backend");
    assert.ok(prefs.agents.includes("Voss"), "should include Voss");
    assert.ok(prefs.agents.includes("Szabo"), "should include Szabo");
    assert.ok(prefs.agents.includes("Brooks"), "should include Architect");
    assert.ok(prefs.agents.includes("Drucker"), "should include Lead");
    assert.ok(prefs.agents.includes("Borges"), "should include Borges");
    assert.ok(!prefs.agents.includes("Mori"), "should not include Mori");
    assert.ok(!prefs.agents.includes("Tufte"), "should not include Docs");

    // Only selected agents should have files
    const agents = fs.readdirSync(path.join(tmpDir, ".dev-team", "agents"));
    assert.equal(agents.length, prefs.agents.length);
  });

  it("--preset fullstack installs all agents", async () => {
    await run(tmpDir, ["--preset", "fullstack"]);

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.equal(prefs.preset, "fullstack");
    assert.equal(prefs.agents.length, 12);
  });

  it("installs workflow skills to .claude/skills/ when .github/ exists", async () => {
    // Simulate a GitHub project
    fs.mkdirSync(path.join(tmpDir, ".github"), { recursive: true });

    await run(tmpDir, ["--all"]);

    // Workflow skills should be in .claude/skills/
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".claude", "skills", "dev-team-merge", "SKILL.md")),
      "merge skill should be in .claude/skills/ for GitHub projects",
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".claude", "skills", "dev-team-security-status", "SKILL.md")),
      "security-status skill should be in .claude/skills/ for GitHub projects",
    );
  });

  it("does not install workflow skills when .github/ is absent", async () => {
    await run(tmpDir, ["--all"]);

    // No .github/ directory, so no GitHub workflow skills
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".claude", "skills", "dev-team-merge", "SKILL.md")),
      "merge skill should not be installed without .github/",
    );
  });

  it("--preset data installs data pipeline agents", async () => {
    await run(tmpDir, ["--preset", "data"]);

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.equal(prefs.preset, "data");
    assert.ok(prefs.agents.includes("Voss"), "should include Voss");
    assert.ok(prefs.agents.includes("Tufte"), "should include Docs");
    assert.ok(!prefs.agents.includes("Mori"), "should not include Mori");
    assert.ok(!prefs.agents.includes("Brooks"), "should not include Architect");
  });
});
