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

    // Agents (runtime-native: .claude/agents/*.agent.md)
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-voss.agent.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-mori.agent.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-szabo.agent.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-knuth.agent.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-beck.agent.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-deming.agent.md")));

    // Hooks
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "hooks", "dev-team-safety-guard.js")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".dev-team", "hooks", "dev-team-tdd-enforce.js")));
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "hooks", "dev-team-post-change-review.js")),
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "hooks", "dev-team-pre-commit-gate.js")),
    );

    // Framework skills (directly in .claude/skills/)
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".claude", "skills", "dev-team-challenge", "SKILL.md")),
    );
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "skills", "dev-team-task", "SKILL.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "skills", "dev-team-retro", "SKILL.md")));
    // Memory (runtime-native: .claude/agent-memory/)
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".claude", "agent-memory", "dev-team-voss", "MEMORY.md")),
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".claude", "agent-memory", "dev-team-beck", "MEMORY.md")),
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

    const agentFiles = fs.readdirSync(path.join(tmpDir, ".claude", "agents"));
    for (const file of agentFiles) {
      const content = fs.readFileSync(path.join(tmpDir, ".claude", "agents", file), "utf-8");
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

  it("installs skills directly to .claude/skills/ (no symlinks)", async () => {
    await run(tmpDir, ["--all"]);

    const claudeSkillsDir = path.join(tmpDir, ".claude", "skills");

    // Framework skills should exist directly in .claude/skills/
    const skillDirs = fs.readdirSync(claudeSkillsDir);
    assert.ok(skillDirs.length > 0, "should have framework skills installed");

    // Each framework skill should be a real directory (not a symlink)
    for (const skillDir of skillDirs) {
      const skillPath = path.join(claudeSkillsDir, skillDir);
      const stat = fs.lstatSync(skillPath);
      assert.ok(!stat.isSymbolicLink(), `${skillDir} should NOT be a symlink`);
      assert.ok(stat.isDirectory(), `${skillDir} should be a real directory`);

      // Should contain SKILL.md
      assert.ok(
        fs.existsSync(path.join(skillPath, "SKILL.md")),
        `${skillDir} should contain SKILL.md`,
      );
    }

    // .dev-team/skills/ should NOT exist
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".dev-team", "skills")),
      ".dev-team/skills/ should not exist",
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
    const agents = fs.readdirSync(path.join(tmpDir, ".claude", "agents"));
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

  it("exits with code 1 for invalid preset", async () => {
    const origExit = process.exit;
    try {
      process.exit = (code) => {
        throw new Error(`__EXIT_${code}__`);
      };
      await assert.rejects(
        async () => run(tmpDir, ["--preset", "nonexistent"]),
        (err) => err.message.includes("__EXIT_1__"),
        "should exit with code 1 for unknown preset",
      );
    } finally {
      process.exit = origExit;
    }
  });

  it("supports --preset=backend form (with =)", async () => {
    await run(tmpDir, ["--preset=backend"]);

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.equal(prefs.preset, "backend");
    assert.ok(prefs.agents.includes("Voss"), "should include Voss");
    assert.ok(prefs.agents.includes("Szabo"), "should include Szabo");
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

  it("--runtime claude produces standard output (default behavior)", async () => {
    await run(tmpDir, ["--all", "--runtime", "claude"]);

    // Standard Claude Code files
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-voss.agent.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "settings.json")));
    assert.ok(fs.existsSync(path.join(tmpDir, "CLAUDE.md")));

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.deepEqual(prefs.runtimes, ["claude"]);
  });

  it("--runtime copilot generates Copilot files", async () => {
    await run(tmpDir, ["--all", "--runtime", "copilot"]);

    assert.ok(
      fs.existsSync(path.join(tmpDir, ".github", "copilot-instructions.md")),
      "should generate .github/copilot-instructions.md",
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".github", "hooks", "hooks.json")),
      "should generate .github/hooks/hooks.json",
    );

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.deepEqual(prefs.runtimes, ["copilot"]);
  });

  it("--runtime claude,copilot generates both Claude and Copilot files", async () => {
    await run(tmpDir, ["--all", "--runtime", "claude,copilot"]);

    // Claude Code files
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "agents", "dev-team-voss.agent.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, "CLAUDE.md")));

    // Copilot files
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".github", "copilot-instructions.md")),
      "should generate Copilot instructions",
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".github", "hooks", "hooks.json")),
      "should generate Copilot hooks",
    );

    const prefs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.deepEqual(prefs.runtimes, ["claude", "copilot"]);
  });

  it("--runtime with invalid value produces an error", async () => {
    const origExit = process.exit;
    let exitCalled = false;
    try {
      process.exit = (code) => {
        exitCalled = true;
        throw new Error(`__EXIT_${code}__`);
      };
      // Invalid runtime should cause adapter lookup failure
      await assert.rejects(
        async () => run(tmpDir, ["--all", "--runtime", "foo"]),
        (err) => {
          // Accept either exit code 1 or an error about unknown runtime
          return (
            err.message.includes("__EXIT_") ||
            err.message.toLowerCase().includes("unknown") ||
            err.message.toLowerCase().includes("adapter") ||
            err.message.toLowerCase().includes("foo")
          );
        },
        "should error for invalid runtime",
      );
    } catch (e) {
      // If run() throws directly (not via process.exit), that's also acceptable
      assert.ok(
        e.message.includes("foo") ||
          e.message.includes("unknown") ||
          e.message.includes("adapter") ||
          exitCalled,
        "should fail for unknown runtime 'foo'",
      );
    } finally {
      process.exit = origExit;
    }
  });
});
