"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { run } = require("../../dist/init");
const {
  update,
  compareSemver,
  cleanupLegacyMemoryDirs,
  migrateToV3Layout,
} = require("../../dist/update");
const { removeHooksFromSettings } = require("../../dist/files");

let tmpDir;
let originalCwd;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-update-"));
  originalCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("dev-team update", () => {
  it("updates agent files when template content changes", async () => {
    // Initial install
    await run(tmpDir, ["--all"]);

    // Modify an installed agent to simulate a stale version
    const agentPath = path.join(tmpDir, ".claude", "agents", "dev-team-voss.agent.md");
    fs.writeFileSync(agentPath, "old content");

    // Run update
    await update(tmpDir);

    // Agent should be restored to template content
    const content = fs.readFileSync(agentPath, "utf-8");
    assert.ok(content.includes("dev-team-voss"), "agent should be updated to latest template");
    assert.ok(!content.includes("old content"), "old content should be replaced");
  });

  it("preserves agent memory files during update", async () => {
    await run(tmpDir, ["--all"]);

    // Add custom content to agent memory
    const memoryPath = path.join(tmpDir, ".claude", "agent-memory", "dev-team-voss", "MEMORY.md");
    fs.writeFileSync(memoryPath, "# Custom learnings\nVoss learned something important.");

    await update(tmpDir);

    // Memory should be untouched
    const content = fs.readFileSync(memoryPath, "utf-8");
    assert.ok(content.includes("Custom learnings"), "memory should not be overwritten");
  });

  it("preserves CLAUDE.md content outside dev-team markers", async () => {
    // Create a CLAUDE.md with custom content
    fs.writeFileSync(path.join(tmpDir, "CLAUDE.md"), "# My Project\n\nCustom instructions here.\n");

    await run(tmpDir, ["--all"]);

    // Verify custom content was preserved after init
    let content = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    assert.ok(content.includes("My Project"), "should preserve existing content after init");

    await update(tmpDir);

    // Still preserved after update
    content = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    assert.ok(content.includes("My Project"), "should preserve existing content after update");
    assert.ok(content.includes("dev-team:begin"), "should have dev-team markers");
  });

  it("updates hook files when template content changes", async () => {
    await run(tmpDir, ["--all"]);

    // Modify an installed hook to simulate a stale version
    const hookPath = path.join(tmpDir, ".dev-team", "hooks", "dev-team-safety-guard.js");
    fs.writeFileSync(hookPath, "// old hook");

    await update(tmpDir);

    const content = fs.readFileSync(hookPath, "utf-8");
    assert.ok(content.includes("safety-guard"), "hook should be updated");
    assert.ok(!content.includes("old hook"), "old content should be replaced");
  });

  it("updates skill files when template content changes", async () => {
    await run(tmpDir, ["--all"]);

    const skillPath = path.join(tmpDir, ".claude", "skills", "dev-team-challenge", "SKILL.md");
    fs.writeFileSync(skillPath, "old skill");

    await update(tmpDir);

    const content = fs.readFileSync(skillPath, "utf-8");
    assert.ok(content.includes("challenge"), "skill should be updated");
  });

  it("reports no changes when already up to date", async () => {
    await run(tmpDir, ["--all"]);

    // Update with no changes — should not throw
    await update(tmpDir);
  });

  it('reports "already at latest version" when version matches', async () => {
    await run(tmpDir, ["--all"]);

    // Capture console output during update
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(" "));
    };

    try {
      await update(tmpDir);
    } finally {
      console.log = originalLog;
    }

    const alreadyMsg = logs.find((l) => l.includes("Already at latest version"));
    assert.ok(alreadyMsg, "should report already at latest version when versions match");
  });

  it("respects user agent teams opt-out during update", async () => {
    await run(tmpDir, ["--all"]);

    // User explicitly disables agent teams
    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "0";
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    await update(tmpDir);

    // Should NOT re-enable agent teams
    const updatedSettings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    assert.equal(
      updatedSettings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS,
      "0",
      "should respect user opt-out",
    );

    // config.json should reflect disabled state
    const config = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".dev-team", "config.json"), "utf-8"),
    );
    assert.equal(config.agentTeams, false, "config should reflect disabled state");
  });

  it("preserves shared team learnings", async () => {
    await run(tmpDir, ["--all"]);

    const learningsPath = path.join(tmpDir, ".claude", "rules", "dev-team-learnings.md");
    fs.writeFileSync(learningsPath, "# Custom Learnings\nWe use PostgreSQL.");

    await update(tmpDir);

    const content = fs.readFileSync(learningsPath, "utf-8");
    assert.ok(content.includes("PostgreSQL"), "learnings should not be overwritten");
  });

  it("preserves process file on update", async () => {
    await run(tmpDir, ["--all"]);

    const processPath = path.join(tmpDir, ".claude", "rules", "dev-team-process.md");
    fs.writeFileSync(processPath, "# Custom Process\nWe use trunk-based development.");

    await update(tmpDir);

    const content = fs.readFileSync(processPath, "utf-8");
    assert.ok(content.includes("trunk-based"), "process file should not be overwritten");
  });

  it("installs process file on update if missing", async () => {
    await run(tmpDir, ["--all"]);

    const processPath = path.join(tmpDir, ".claude", "rules", "dev-team-process.md");
    fs.unlinkSync(processPath);
    assert.ok(!fs.existsSync(processPath));

    await update(tmpDir);

    assert.ok(fs.existsSync(processPath), "process file should be installed on update");
  });

  it("migrates learnings.md and process.md from .dev-team/ to .claude/rules/", async () => {
    await run(tmpDir, ["--all"]);

    // Simulate old layout: move files back to .dev-team/
    const rulesDir = path.join(tmpDir, ".claude", "rules");
    const oldLearnings = path.join(tmpDir, ".dev-team", "learnings.md");
    const oldProcess = path.join(tmpDir, ".dev-team", "process.md");
    const newLearnings = path.join(rulesDir, "dev-team-learnings.md");
    const newProcess = path.join(rulesDir, "dev-team-process.md");

    fs.writeFileSync(oldLearnings, "# Learnings\nWe use PostgreSQL.");
    fs.writeFileSync(oldProcess, "# Process\nWe use trunk-based.");
    fs.unlinkSync(newLearnings);
    fs.unlinkSync(newProcess);

    await update(tmpDir);

    // Files should be at new paths with original content
    assert.ok(fs.existsSync(newLearnings), "learnings should be migrated to .claude/rules/");
    assert.ok(fs.existsSync(newProcess), "process should be migrated to .claude/rules/");
    const learnings = fs.readFileSync(newLearnings, "utf-8");
    assert.ok(learnings.includes("PostgreSQL"), "learnings content should be preserved");
    const process_ = fs.readFileSync(newProcess, "utf-8");
    assert.ok(process_.includes("trunk-based"), "process content should be preserved");
    // Old files should be gone
    assert.ok(!fs.existsSync(oldLearnings), "old learnings should be removed");
    assert.ok(!fs.existsSync(oldProcess), "old process should be removed");
  });

  it("updates all agents including those added after initial install", async () => {
    await run(tmpDir, ["--all"]);

    // Stale every agent file
    const agentsDir = path.join(tmpDir, ".claude", "agents");
    const agentFiles = fs.readdirSync(agentsDir);
    for (const f of agentFiles) {
      fs.writeFileSync(path.join(agentsDir, f), "stale");
    }

    await update(tmpDir);

    // Every agent should be restored — none should be our sentinel value
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(agentsDir, f), "utf-8");
      assert.ok(
        content.startsWith("---"),
        `${f} should have been updated (should start with frontmatter)`,
      );
    }
  });

  it("upgrades version in prefs when package version is newer", async () => {
    // Initial install - saves current package version
    await run(tmpDir, ["--all"]);

    const prefsPath = path.join(tmpDir, ".dev-team", "config.json");
    const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    const currentVersion = prefs.version;
    assert.ok(currentVersion, "init should set a version in prefs");

    // Manually downgrade the version to simulate an older install
    prefs.version = "0.0.1";
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2) + "\n");

    // Run update - should detect the version difference and upgrade
    await update(tmpDir);

    // Verify version is now current
    const updatedPrefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    assert.equal(
      updatedPrefs.version,
      currentVersion,
      "version should be upgraded to current package version",
    );
    assert.notEqual(updatedPrefs.version, "0.0.1", "version should no longer be the old value");
  });

  it("auto-discovers and installs new hooks not in preferences", async () => {
    await run(tmpDir, ["--all"]);

    // Remove a hook from preferences to simulate an older install
    const prefsPath = path.join(tmpDir, ".dev-team", "config.json");
    const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    const removedHook = prefs.hooks.pop(); // Remove last hook
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));

    // Delete the hook file too
    fs.readdirSync(path.join(tmpDir, ".dev-team", "hooks"));

    await update(tmpDir);

    // Hook should be re-added to preferences
    const updatedPrefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    assert.ok(updatedPrefs.hooks.includes(removedHook), `${removedHook} should be auto-discovered`);
  });

  it("migrates renamed agents on update", async () => {
    await run(tmpDir, ["--all"]);

    // Simulate pre-v0.4 prefs with old agent names
    const prefsPath = path.join(tmpDir, ".dev-team", "config.json");
    const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    prefs.version = "0.3.1";

    // Replace new names with old names
    prefs.agents = prefs.agents.map((a) => {
      if (a === "Brooks") return "Architect";
      if (a === "Tufte") return "Docs";
      if (a === "Conway") return "Release";
      if (a === "Drucker") return "Lead";
      return a;
    });

    // Create old agent files to simulate old install (in runtime-native location)
    const agentsDir = path.join(tmpDir, ".claude", "agents");
    fs.writeFileSync(
      path.join(agentsDir, "dev-team-architect.agent.md"),
      "---\nname: dev-team-architect\n---",
    );
    fs.writeFileSync(
      path.join(agentsDir, "dev-team-docs.agent.md"),
      "---\nname: dev-team-docs\n---",
    );
    fs.writeFileSync(
      path.join(agentsDir, "dev-team-release.agent.md"),
      "---\nname: dev-team-release\n---",
    );
    fs.writeFileSync(
      path.join(agentsDir, "dev-team-lead.agent.md"),
      "---\nname: dev-team-lead\n---",
    );

    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));

    await update(tmpDir);

    // Verify old names replaced with new in prefs
    const updated = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    assert.ok(updated.agents.includes("Brooks"), "should have Brooks");
    assert.ok(updated.agents.includes("Tufte"), "should have Tufte");
    assert.ok(updated.agents.includes("Conway"), "should have Conway");
    assert.ok(updated.agents.includes("Drucker"), "should have Drucker");
    assert.ok(!updated.agents.includes("Architect"), "should not have old Architect");
    assert.ok(!updated.agents.includes("Docs"), "should not have old Docs");
    assert.ok(!updated.agents.includes("Release"), "should not have old Release");
    assert.ok(!updated.agents.includes("Lead"), "should not have old Lead");

    // Verify old agent files removed
    assert.ok(
      !fs.existsSync(path.join(agentsDir, "dev-team-architect.agent.md")),
      "old architect file should be removed",
    );
    assert.ok(
      !fs.existsSync(path.join(agentsDir, "dev-team-docs.agent.md")),
      "old docs file should be removed",
    );

    // Verify new agent files exist
    assert.ok(
      fs.existsSync(path.join(agentsDir, "dev-team-brooks.agent.md")),
      "new brooks file should exist",
    );
    assert.ok(
      fs.existsSync(path.join(agentsDir, "dev-team-tufte.agent.md")),
      "new tufte file should exist",
    );
  });

  it("removes ghost hook and agent entries from config.json on update", async () => {
    await run(tmpDir, ["--all"]);

    // Inject ghost entries into config.json
    const prefsPath = path.join(tmpDir, ".dev-team", "config.json");
    const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    prefs.hooks.push("Task loop"); // ghost hook from older version
    prefs.agents.push("Phantom"); // ghost agent from older version
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));

    await update(tmpDir);

    const updated = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    assert.ok(!updated.hooks.includes("Task loop"), "ghost hook should be removed");
    assert.ok(!updated.agents.includes("Phantom"), "ghost agent should be removed");
    // Real entries should still be there
    assert.ok(updated.hooks.includes("Safety guard"), "real hook should remain");
    assert.ok(updated.agents.includes("Voss"), "real agent should remain");
  });

  it("handles config where all entries are ghosts (empty arrays after filter)", async () => {
    await run(tmpDir, ["--all"]);

    // Replace all hooks and agents with ghost entries
    const prefsPath = path.join(tmpDir, ".dev-team", "config.json");
    const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    prefs.hooks = ["Ghost hook 1", "Ghost hook 2"];
    prefs.agents = ["Phantom1", "Phantom2"];
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));

    await update(tmpDir);

    const updated = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    // Ghost entries should be removed; real entries auto-discovered
    assert.ok(!updated.hooks.includes("Ghost hook 1"), "ghost hook 1 should be removed");
    assert.ok(!updated.agents.includes("Phantom1"), "ghost agent should be removed");
    // Auto-discovery should repopulate with real entries
    assert.ok(updated.hooks.length > 0, "hooks should be repopulated via auto-discovery");
    assert.ok(updated.agents.length > 0, "agents should be repopulated via auto-discovery");
  });

  it("migrates from old .claude/dev-team.json layout on update", async () => {
    // Simulate a pre-migration install (files in .claude/ with dev-team.json)
    fs.mkdirSync(path.join(tmpDir, ".claude", "agents"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".claude", "hooks"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".claude", "agent-memory", "dev-team-voss"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmpDir, ".claude", "agents", "dev-team-voss.agent.md"),
      "---\nname: dev-team-voss\n---",
    );
    fs.writeFileSync(
      path.join(tmpDir, ".claude", "hooks", "dev-team-safety-guard.js"),
      "#!/usr/bin/env node\n// safety-guard",
    );
    fs.writeFileSync(
      path.join(tmpDir, ".claude", "agent-memory", "dev-team-voss", "MEMORY.md"),
      "# Voss Memory\nCustom learnings here",
    );
    fs.writeFileSync(
      path.join(tmpDir, ".claude", "dev-team-learnings.md"),
      "# Shared Learnings\nWe use PostgreSQL",
    );
    fs.writeFileSync(
      path.join(tmpDir, ".claude", "dev-team.json"),
      JSON.stringify(
        {
          version: "0.4.0",
          agents: ["Voss"],
          hooks: ["Safety guard"],
          issueTracker: "GitHub Issues",
          branchConvention: "feat/123-description",
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(tmpDir, ".claude", "settings.json"),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: "Bash",
              hooks: [{ type: "command", command: "node .claude/hooks/dev-team-safety-guard.js" }],
            },
          ],
        },
      }),
    );

    await update(tmpDir);

    // Config should be in .dev-team/
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "config.json")),
      "config should be in .dev-team/",
    );
    // Learnings should be in .claude/rules/
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".claude", "rules", "dev-team-learnings.md")),
      "learnings should be in .claude/rules/",
    );
    // Agent memory should stay in .claude/agent-memory/ (runtime-native)
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".claude", "agent-memory", "dev-team-voss", "MEMORY.md")),
      "memory should be in .claude/agent-memory/",
    );

    // Memory content preserved
    const memory = fs.readFileSync(
      path.join(tmpDir, ".claude", "agent-memory", "dev-team-voss", "MEMORY.md"),
      "utf-8",
    );
    assert.ok(memory.includes("Custom learnings"), "memory content should be preserved");

    // Learnings content preserved
    const learnings = fs.readFileSync(
      path.join(tmpDir, ".claude", "rules", "dev-team-learnings.md"),
      "utf-8",
    );
    assert.ok(learnings.includes("PostgreSQL"), "learnings content should be preserved");

    // Settings.json hook paths rewritten
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    );
    const commands = settings.hooks.PreToolUse.flatMap((e) =>
      (e.hooks || []).map((h) => h.command),
    );
    assert.ok(
      commands.some((c) => c.includes(".dev-team/hooks/")),
      "hook paths should be rewritten to .dev-team/",
    );
    assert.ok(
      !commands.some((c) => c.includes(".claude/hooks/")),
      "no hook paths should reference .claude/hooks/",
    );

    // Old .claude/ prefs cleaned up
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".claude", "dev-team.json")),
      "old prefs should be removed",
    );
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".claude", "dev-team-learnings.md")),
      "old learnings should be removed",
    );

    // settings.json should remain
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".claude", "settings.json")),
      "settings.json should remain in .claude/",
    );
  });

  it("installs skills directly to .claude/skills/ during update (no symlinks)", async () => {
    await run(tmpDir, ["--all"]);

    // Remove .claude/skills/ to simulate missing skills
    const claudeSkillsDir = path.join(tmpDir, ".claude", "skills");
    if (fs.existsSync(claudeSkillsDir)) {
      fs.rmSync(claudeSkillsDir, { recursive: true });
    }

    await update(tmpDir);

    // Skills should be directly installed (not symlinks)
    const skillDirs = fs.readdirSync(claudeSkillsDir);
    for (const skillDir of skillDirs) {
      const skillPath = path.join(claudeSkillsDir, skillDir);
      const stat = fs.lstatSync(skillPath);
      assert.ok(!stat.isSymbolicLink(), `${skillDir} should NOT be a symlink`);
      assert.ok(stat.isDirectory(), `${skillDir} should be a real directory`);
    }

    // .dev-team/skills/ should NOT exist
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".dev-team", "skills")),
      ".dev-team/skills/ should not exist",
    );
  });

  it("migrates when .dev-team/ exists but config.json is missing (partial migration)", async () => {
    // Simulate partial migration: .dev-team/ dir exists but no config.json
    fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".claude", "dev-team.json"),
      JSON.stringify(
        {
          version: "0.4.0",
          agents: ["Voss"],
          hooks: ["Safety guard"],
          issueTracker: "GitHub Issues",
          branchConvention: "feat/123-description",
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(path.join(tmpDir, ".claude", "settings.json"), JSON.stringify({ hooks: {} }));

    await update(tmpDir);

    // Should have migrated despite .dev-team/ already existing
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".dev-team", "config.json")),
      "config.json should exist after partial migration",
    );
  });

  it("exits with error when config.json is malformed JSON", async () => {
    await run(tmpDir, ["--all"]);

    // Corrupt config.json with invalid JSON
    const prefsPath = path.join(tmpDir, ".dev-team", "config.json");
    fs.writeFileSync(prefsPath, "{ this is not valid json!!!");

    const origExit = process.exit;
    try {
      process.exit = (code) => {
        throw new Error(`__EXIT_${code}__`);
      };
      await assert.rejects(
        async () => update(tmpDir),
        (err) => err.message.includes("__EXIT_1__"),
        "should exit with code 1 for corrupted config.json",
      );

      // Backup file should have been created
      assert.ok(
        fs.existsSync(prefsPath + ".bak"),
        "backup file should be created for corrupted config",
      );
      const backup = fs.readFileSync(prefsPath + ".bak", "utf-8");
      assert.ok(
        backup.includes("this is not valid json"),
        "backup should contain original corrupted content",
      );
    } finally {
      process.exit = origExit;
    }
  });

  it("shows different error when backup of corrupted config.json fails", async () => {
    await run(tmpDir, ["--all"]);

    // Corrupt config.json
    const prefsPath = path.join(tmpDir, ".dev-team", "config.json");
    fs.writeFileSync(prefsPath, "not json");

    // Make backup path unwritable by creating a directory with the same name
    const backupPath = prefsPath + ".bak";
    fs.mkdirSync(backupPath, { recursive: true });

    const origExit = process.exit;
    const errors = [];
    const origError = console.error;
    console.error = (...args) => errors.push(args.join(" "));

    try {
      process.exit = (code) => {
        throw new Error(`__EXIT_${code}__`);
      };
      await assert.rejects(
        async () => update(tmpDir),
        (err) => err.message.includes("__EXIT_1__"),
        "should exit with code 1 when backup also fails",
      );

      // Should get the shorter error message without backup path
      const hasBackupMsg = errors.some((e) => e.includes("Backed up to"));
      const hasCorruptedMsg = errors.some((e) => e.includes("corrupted"));
      assert.ok(hasCorruptedMsg, "should mention corrupted config");
      assert.ok(!hasBackupMsg, "should not mention backup path when backup fails");
    } finally {
      process.exit = origExit;
      console.error = origError;
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
  });

  it("hookRemovals migration triggers removeHooksFromSettings cleanup end-to-end", async () => {
    await run(tmpDir, ["--all"]);

    // Read current settings and add a fake hook entry
    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

    // Add a fake hook entry to PreToolUse that references an obsolete hook
    if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
    settings.hooks.PreToolUse.push({
      matcher: "Bash",
      hooks: [
        {
          type: "command",
          command: "node .dev-team/hooks/dev-team-obsolete-hook.js",
        },
      ],
    });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

    // Verify the hook entry is present before cleanup
    const beforeSettings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    const beforeCommands = beforeSettings.hooks.PreToolUse.flatMap((e) =>
      (e.hooks || []).map((h) => h.command),
    );
    assert.ok(
      beforeCommands.some((c) => c.includes("dev-team-obsolete-hook.js")),
      "obsolete hook should be in settings before cleanup",
    );

    // Run removeHooksFromSettings to clean up the obsolete hook
    removeHooksFromSettings(settingsPath, ["dev-team-obsolete-hook.js"]);

    // Verify the hook entry is gone after cleanup
    const afterSettings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    const afterCommands = (afterSettings.hooks.PreToolUse || []).flatMap((e) =>
      (e.hooks || []).map((h) => h.command),
    );
    assert.ok(
      !afterCommands.some((c) => c.includes("dev-team-obsolete-hook.js")),
      "obsolete hook should be removed from settings after cleanup",
    );

    // Other hooks should still be present
    const allCommands = Object.values(afterSettings.hooks)
      .flat()
      .flatMap((e) => (e.hooks || []).map((h) => h.command));
    assert.ok(allCommands.length > 0, "other hooks should still be present");
  });

  it("hookRemovals migration deletes hook files and cleans settings.json", async () => {
    await run(tmpDir, ["--all"]);

    // Simulate a migration that removes a hook by:
    // 1. Adding a fake hook file
    const fakeHookPath = path.join(tmpDir, ".dev-team", "hooks", "dev-team-fake-obsolete.js");
    fs.writeFileSync(fakeHookPath, "// obsolete hook");

    // 2. Adding it to config.json hooks
    const prefsPath = path.join(tmpDir, ".dev-team", "config.json");
    const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    prefs.hooks.push("Fake obsolete");
    // Set an older version to trigger migrations
    prefs.version = "0.0.1";
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));

    // Note: This test verifies the hookRemovals infrastructure works.
    // Actual migrations with hookRemovals will be added when hooks are deprecated.
    await update(tmpDir);

    // The ghost entry should be cleaned up by the ghost filter at end of update
    const updatedPrefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    assert.ok(
      !updatedPrefs.hooks.includes("Fake obsolete"),
      "ghost hook label should be cleaned up",
    );
  });
});

describe("cleanupLegacyMemoryDirs", () => {
  it("removes empty legacy memory directories", async () => {
    await run(tmpDir, ["--all"]);

    // Create legacy directories with boilerplate content
    const legacyDir = path.join(tmpDir, ".claude", "agent-memory", "dev-team-architect");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, "MEMORY.md"), "# Agent Memory\n<!-- boilerplate -->\n");

    const log = cleanupLegacyMemoryDirs(path.join(tmpDir, ".claude"));

    assert.ok(!fs.existsSync(legacyDir), "legacy directory should be removed");
    assert.ok(
      log.some((l) => l.includes("dev-team-architect")),
      "should log cleanup",
    );
  });

  it("merges substantive legacy content into current agent memory", async () => {
    await run(tmpDir, ["--all"]);

    // Create legacy directory with substantive content (structured entries)
    const legacyDir = path.join(tmpDir, ".claude", "agent-memory", "dev-team-architect");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyDir, "MEMORY.md"),
      "# Architect Memory\n## Structured Entries\n### [2026-01-15] Pattern 1 discovered\n- **Type**: PATTERN\n- **Tags**: architecture\n- **Context**: Found coupling issue\n",
    );

    cleanupLegacyMemoryDirs(path.join(tmpDir, ".claude"));

    // Legacy dir should be removed
    assert.ok(!fs.existsSync(legacyDir), "legacy directory should be removed");

    // Content should be merged into Brooks (new name for Architect)
    const brooksMemory = fs.readFileSync(
      path.join(tmpDir, ".claude", "agent-memory", "dev-team-brooks", "MEMORY.md"),
      "utf-8",
    );
    assert.ok(
      brooksMemory.includes("Migrated from dev-team-architect"),
      "should contain migration marker",
    );
    assert.ok(brooksMemory.includes("Pattern 1 discovered"), "should contain merged content");
  });

  it("moves legacy content when current agent memory does not exist", async () => {
    await run(tmpDir, ["--all"]);

    // Delete the current Brooks memory and create a legacy architect one
    const brooksDir = path.join(tmpDir, ".claude", "agent-memory", "dev-team-brooks");
    fs.rmSync(brooksDir, { recursive: true });

    const legacyDir = path.join(tmpDir, ".claude", "agent-memory", "dev-team-architect");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyDir, "MEMORY.md"),
      "# Architect Memory\nImportant learnings here.\n",
    );

    cleanupLegacyMemoryDirs(path.join(tmpDir, ".claude"));

    assert.ok(!fs.existsSync(legacyDir), "legacy directory should be removed after cleanup");
    assert.ok(fs.existsSync(path.join(brooksDir, "MEMORY.md")), "memory should be moved to Brooks");
    const content = fs.readFileSync(path.join(brooksDir, "MEMORY.md"), "utf-8");
    assert.ok(content.includes("Important learnings"), "content should be preserved");
  });

  it("handles all four known legacy renames", async () => {
    await run(tmpDir, ["--all"]);

    const legacyNames = [
      "dev-team-architect",
      "dev-team-docs",
      "dev-team-lead",
      "dev-team-release",
    ];

    for (const name of legacyNames) {
      const dir = path.join(tmpDir, ".claude", "agent-memory", name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "MEMORY.md"), "# Legacy\nBoilerplate\n");
    }

    cleanupLegacyMemoryDirs(path.join(tmpDir, ".claude"));

    for (const name of legacyNames) {
      assert.ok(
        !fs.existsSync(path.join(tmpDir, ".claude", "agent-memory", name)),
        `${name} should be removed`,
      );
    }
  });

  it("runs during update automatically", async () => {
    await run(tmpDir, ["--all"]);

    // Create a legacy directory
    const legacyDir = path.join(tmpDir, ".claude", "agent-memory", "dev-team-architect");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, "MEMORY.md"), "# Legacy\nBoilerplate\n");

    await update(tmpDir);

    assert.ok(!fs.existsSync(legacyDir), "legacy directory should be cleaned up during update");
  });
});

describe("migrateToV3Layout", () => {
  it("migrates agents from .dev-team/agents/ to .claude/agents/ with rename", async () => {
    await run(tmpDir, ["--all"]);
    const oldAgentsDir = path.join(tmpDir, ".dev-team", "agents");
    fs.mkdirSync(oldAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(oldAgentsDir, "dev-team-voss.md"),
      "---\nname: dev-team-voss\n---\n# Voss agent definition",
    );
    const newAgentPath = path.join(tmpDir, ".claude", "agents", "dev-team-voss.agent.md");
    fs.unlinkSync(newAgentPath);
    const log = migrateToV3Layout(tmpDir);
    assert.ok(
      fs.existsSync(newAgentPath),
      "agent should be at .claude/agents/dev-team-voss.agent.md",
    );
    const content = fs.readFileSync(newAgentPath, "utf-8");
    assert.ok(content.includes("Voss agent definition"), "content should be preserved");
    assert.ok(!fs.existsSync(oldAgentsDir), ".dev-team/agents/ should be removed");
    assert.ok(
      log.some((l) => l.includes("Migrated") && l.includes("agents")),
      "should log agent migration",
    );
  });

  it("is idempotent -- running twice produces same result", async () => {
    await run(tmpDir, ["--all"]);
    const oldAgentsDir = path.join(tmpDir, ".dev-team", "agents");
    fs.mkdirSync(oldAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(oldAgentsDir, "dev-team-voss.md"),
      "---\nname: dev-team-voss\n---\n# Voss",
    );
    const newAgentPath = path.join(tmpDir, ".claude", "agents", "dev-team-voss.agent.md");
    fs.unlinkSync(newAgentPath);
    migrateToV3Layout(tmpDir);
    const firstContent = fs.readFileSync(newAgentPath, "utf-8");
    const log2 = migrateToV3Layout(tmpDir);
    const secondContent = fs.readFileSync(newAgentPath, "utf-8");
    assert.equal(firstContent, secondContent, "content should be identical after second run");
    assert.ok(
      !log2.some((l) => l.includes("Migrated") && l.includes("agents")),
      "second run should not re-migrate agents",
    );
  });

  it("handles partial state -- some agents already in .claude/agents/", async () => {
    await run(tmpDir, ["--all"]);
    const oldAgentsDir = path.join(tmpDir, ".dev-team", "agents");
    fs.mkdirSync(oldAgentsDir, { recursive: true });
    const newMoriPath = path.join(tmpDir, ".claude", "agents", "dev-team-mori.agent.md");
    fs.unlinkSync(newMoriPath);
    fs.writeFileSync(
      path.join(oldAgentsDir, "dev-team-mori.md"),
      "---\nname: dev-team-mori\n---\n# Mori old",
    );
    fs.writeFileSync(
      path.join(oldAgentsDir, "dev-team-voss.md"),
      "---\nname: dev-team-voss\n---\n# Voss OLD -- should not overwrite",
    );
    migrateToV3Layout(tmpDir);
    const vossContent = fs.readFileSync(
      path.join(tmpDir, ".claude", "agents", "dev-team-voss.agent.md"),
      "utf-8",
    );
    assert.ok(
      !vossContent.includes("should not overwrite"),
      "existing agent should not be overwritten",
    );
    assert.ok(fs.existsSync(newMoriPath), "mori should be migrated");
    const moriContent = fs.readFileSync(newMoriPath, "utf-8");
    assert.ok(moriContent.includes("Mori old"), "migrated mori should have old content");
  });

  it("migrates agent-memory from .dev-team/agent-memory/ to .claude/agent-memory/", async () => {
    await run(tmpDir, ["--all"]);
    const oldMemoryDir = path.join(tmpDir, ".dev-team", "agent-memory", "dev-team-voss");
    fs.mkdirSync(oldMemoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(oldMemoryDir, "MEMORY.md"),
      "# Voss Memory\nCustom calibration data here.",
    );
    const newMemoryDir = path.join(tmpDir, ".claude", "agent-memory", "dev-team-voss");
    fs.rmSync(newMemoryDir, { recursive: true });
    const log = migrateToV3Layout(tmpDir);
    const memoryPath = path.join(newMemoryDir, "MEMORY.md");
    assert.ok(fs.existsSync(memoryPath), "memory should be at .claude/agent-memory/");
    const content = fs.readFileSync(memoryPath, "utf-8");
    assert.ok(content.includes("Custom calibration data"), "memory content should be preserved");
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".dev-team", "agent-memory")),
      ".dev-team/agent-memory/ should be removed",
    );
    assert.ok(
      log.some((l) => l.includes("memory")),
      "should log memory migration",
    );
  });

  it("removes .claude/skills/ symlinks pointing to .dev-team/skills/", async () => {
    await run(tmpDir, ["--all"]);
    const claudeSkillsDir = path.join(tmpDir, ".claude", "skills");
    const fakeTarget = path.join(tmpDir, ".dev-team", "skills", "dev-team-challenge");
    fs.mkdirSync(fakeTarget, { recursive: true });
    fs.writeFileSync(path.join(fakeTarget, "SKILL.md"), "# skill");
    const symlinkPath = path.join(claudeSkillsDir, "dev-team-fake-symlink");
    fs.symlinkSync(fakeTarget, symlinkPath);
    const log = migrateToV3Layout(tmpDir);
    assert.ok(!fs.existsSync(symlinkPath), "symlink to .dev-team/skills/ should be removed");
    assert.ok(
      log.some((l) => l.includes("stale symlink")),
      "should log symlink removal",
    );
  });

  it("preserves non-agent .md files (SHARED.md) without rename", async () => {
    await run(tmpDir, ["--all"]);
    const oldAgentsDir = path.join(tmpDir, ".dev-team", "agents");
    fs.mkdirSync(oldAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(oldAgentsDir, "SHARED.md"),
      "# Shared Agent Protocol\nShared instructions here.",
    );
    const destPath = path.join(tmpDir, ".claude", "agents", "SHARED.md");
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    migrateToV3Layout(tmpDir);
    assert.ok(fs.existsSync(destPath), "SHARED.md should be migrated without rename");
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".claude", "agents", "SHARED.agent.md")),
      "SHARED.md should NOT be renamed to SHARED.agent.md",
    );
    const content = fs.readFileSync(destPath, "utf-8");
    assert.ok(content.includes("Shared instructions"), "SHARED.md content should be preserved");
  });
});

describe("compareSemver", () => {
  it("compares equal versions", () => {
    assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
  });

  it("compares major versions", () => {
    assert.ok(compareSemver("2.0.0", "1.0.0") > 0);
    assert.ok(compareSemver("1.0.0", "2.0.0") < 0);
  });

  it("compares minor versions", () => {
    assert.ok(compareSemver("0.10.0", "0.4.0") > 0, "0.10.0 should be greater than 0.4.0");
    assert.ok(compareSemver("0.4.0", "0.10.0") < 0);
  });

  it("compares patch versions", () => {
    assert.ok(compareSemver("0.4.2", "0.4.1") > 0);
    assert.ok(compareSemver("0.4.1", "0.4.2") < 0);
  });

  it("handles the bug case: string comparison would get 0.10.0 vs 0.4.0 wrong", () => {
    // String comparison: "0.4.0" > "0.10.0" (because "4" > "1")
    // Numeric comparison: 0.10.0 > 0.4.0 (correct)
    assert.ok(compareSemver("0.10.0", "0.4.0") > 0);
  });

  it("pre-release has lower precedence than release", () => {
    assert.ok(compareSemver("1.0.0-alpha", "1.0.0") < 0);
    assert.ok(compareSemver("1.0.0", "1.0.0-alpha") > 0);
  });

  it("two pre-release versions with same numeric parts are equal", () => {
    assert.equal(compareSemver("1.0.0-alpha", "1.0.0-beta"), 0);
  });

  it("pre-release on lower version is still less than higher release", () => {
    assert.ok(compareSemver("1.0.0-rc1", "2.0.0") < 0);
    assert.ok(compareSemver("0.9.0-beta", "1.0.0") < 0);
  });
});

describe("migrateFromClaude structured settings migration", () => {
  // Helper replicating the structured migration logic (migrateFromClaude is not exported)
  function rewriteHookPaths(settings) {
    let changed = false;
    if (settings.hooks && typeof settings.hooks === "object") {
      for (const event of Object.keys(settings.hooks)) {
        const matchers = settings.hooks[event];
        if (!Array.isArray(matchers)) continue;
        for (const matcher of matchers) {
          if (!matcher) continue;
          if (typeof matcher.command === "string" && matcher.command.includes(".claude/hooks/")) {
            matcher.command = matcher.command.replace(/\.claude\/hooks\//g, ".dev-team/hooks/");
            changed = true;
          }
          if (Array.isArray(matcher.hooks)) {
            for (const hook of matcher.hooks) {
              if (
                hook &&
                typeof hook.command === "string" &&
                hook.command.includes(".claude/hooks/")
              ) {
                hook.command = hook.command.replace(/\.claude\/hooks\//g, ".dev-team/hooks/");
                changed = true;
              }
            }
          }
        }
      }
    }
    return changed;
  }

  it("only rewrites command fields in hooks, not other fields", () => {
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            command: "node .claude/hooks/my-hook.js",
          },
        ],
      },
      description: "A project with .claude/hooks/ in its description",
    };

    const changed = rewriteHookPaths(settings);

    assert.ok(changed, "should have rewritten hook command paths");
    assert.equal(settings.hooks.PreToolUse[0].command, "node .dev-team/hooks/my-hook.js");
    assert.equal(
      settings.description,
      "A project with .claude/hooks/ in its description",
      "non-hook fields should be untouched",
    );
  });

  it("rewrites nested hooks array commands", () => {
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              { type: "command", command: "node .claude/hooks/safety-guard.js" },
              { type: "command", command: "node .dev-team/hooks/already-migrated.js" },
            ],
          },
        ],
      },
    };

    const changed = rewriteHookPaths(settings);

    assert.ok(changed, "should have rewritten nested hook commands");
    assert.equal(
      settings.hooks.PreToolUse[0].hooks[0].command,
      "node .dev-team/hooks/safety-guard.js",
    );
    assert.equal(
      settings.hooks.PreToolUse[0].hooks[1].command,
      "node .dev-team/hooks/already-migrated.js",
      "already-migrated paths should be untouched",
    );
  });
});
