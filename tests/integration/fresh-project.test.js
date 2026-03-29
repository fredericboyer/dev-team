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
      fs.existsSync(path.join(tmpDir, ".dev-team", "skills", "dev-team-retro", "SKILL.md")),
    );
    // Memory
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "agent-memory", "dev-team-voss", "MEMORY.md")),
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "agent-memory", "dev-team-beck", "MEMORY.md")),
    );
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "rules", "dev-team-learnings.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "metrics.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "rules", "dev-team-process.md")));

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
      if (file === "SHARED.md") continue; // SHARED.md is not an agent — skip agent-specific fields
      assert.ok(content.includes("model:"), `${file} should have a model field`);
      assert.ok(content.includes("memory: project"), `${file} should have memory: project`);
    }
  });

  it("enables agent teams in settings.json and config.json", async () => {
    await run(tmpDir, ["--all"]);

    // settings.json should have agent teams env var
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    );
    assert.equal(settings.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, "1");

    // config.json should record agent teams status
    const config = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.equal(config.agentTeams, true);
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
    assert.equal(prefs.platform, "github", "should have platform field");
  });

  it("creates symlinks in .claude/skills/ pointing to .dev-team/skills/", async () => {
    await run(tmpDir, ["--all"]);

    const claudeSkillsDir = path.join(tmpDir, ".claude", "skills");
    const devTeamSkillsDir = path.join(tmpDir, ".dev-team", "skills");

    // Framework skills should exist in .dev-team/skills/
    const skillDirs = fs.readdirSync(devTeamSkillsDir);
    assert.ok(skillDirs.length > 0, "should have framework skills installed");

    // Each framework skill should have a symlink in .claude/skills/
    for (const skillDir of skillDirs) {
      const symlinkPath = path.join(claudeSkillsDir, skillDir);
      assert.ok(fs.existsSync(symlinkPath), `symlink should exist for ${skillDir}`);
      const stat = fs.lstatSync(symlinkPath);
      assert.ok(stat.isSymbolicLink(), `${skillDir} should be a symlink`);

      // Symlink target should be relative
      const target = fs.readlinkSync(symlinkPath);
      assert.ok(!path.isAbsolute(target), `symlink target should be relative, got: ${target}`);

      // Should resolve to the actual SKILL.md
      assert.ok(
        fs.existsSync(path.join(symlinkPath, "SKILL.md")),
        `symlink for ${skillDir} should resolve to a directory with SKILL.md`,
      );
    }
  });

  it("does not overwrite real directories in .claude/skills/ with symlinks", async () => {
    // Create a real directory in .claude/skills/ before init
    const realSkillDir = path.join(tmpDir, ".claude", "skills", "dev-team-challenge");
    fs.mkdirSync(realSkillDir, { recursive: true });
    fs.writeFileSync(path.join(realSkillDir, "SKILL.md"), "# Custom skill override");

    await run(tmpDir, ["--all"]);

    // The real directory should NOT be replaced by a symlink
    const stat = fs.lstatSync(realSkillDir);
    assert.ok(!stat.isSymbolicLink(), "should not replace real directory with symlink");
    const content = fs.readFileSync(path.join(realSkillDir, "SKILL.md"), "utf-8");
    assert.ok(
      content.includes("Custom skill override"),
      "real directory content should be preserved",
    );
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

    // Only selected agents should have files (plus SHARED.md)
    const agents = fs.readdirSync(path.join(tmpDir, ".dev-team", "agents"));
    assert.equal(agents.length, prefs.agents.length + 1);
    assert.ok(agents.includes("SHARED.md"));
  });

  it("--preset fullstack installs all agents", async () => {
    await run(tmpDir, ["--preset", "fullstack"]);

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.equal(prefs.preset, "fullstack");
    assert.equal(prefs.agents.length, 14);
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

  it("includes INFRA_HOOKS labels in config.json", async () => {
    await run(tmpDir, ["--all"]);

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.ok(prefs.hooks.includes("Worktree create"), "should include Worktree create");
    assert.ok(prefs.hooks.includes("Worktree remove"), "should include Worktree remove");
  });

  it("refuses to init when config.json already exists without --force", async () => {
    // First init
    await run(tmpDir, ["--all"]);
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "config.json")));

    // Second init should fail
    await assert.rejects(
      async () => {
        const origExit = process.exit;
        process.exit = (code) => {
          throw new Error(`__EXIT_${code}__`);
        };
        try {
          await run(tmpDir, ["--all"]);
        } finally {
          process.exit = origExit;
        }
      },
      (err) => err.message.includes("__EXIT_1__"),
      "should exit with code 1 when config.json exists",
    );
  });

  it("allows re-init with --force when config.json exists", async () => {
    // First init
    await run(tmpDir, ["--all"]);

    // Second init with --force should succeed
    await run(tmpDir, ["--all", "--force"]);

    // Verify config.json was rewritten
    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.ok(prefs.version, "should have a version after --force re-init");
  });
});
