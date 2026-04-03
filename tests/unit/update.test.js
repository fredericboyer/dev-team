"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { compareSemver, cleanupLegacyMemoryDirs, migrateToV3Layout } = require("../../dist/update");

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-update-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── compareSemver ───────────────────────────────────────────────────────────

describe("compareSemver", () => {
  describe("basic version ordering", () => {
    it("returns 0 for equal versions", () => {
      assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
    });

    it("returns positive when a > b (major)", () => {
      assert.ok(compareSemver("2.0.0", "1.0.0") > 0);
    });

    it("returns negative when a < b (major)", () => {
      assert.ok(compareSemver("1.0.0", "2.0.0") < 0);
    });

    it("returns positive when a > b (minor)", () => {
      assert.ok(compareSemver("1.2.0", "1.1.0") > 0);
    });

    it("returns negative when a < b (minor)", () => {
      assert.ok(compareSemver("1.1.0", "1.2.0") < 0);
    });

    it("returns positive when a > b (patch)", () => {
      assert.ok(compareSemver("1.0.2", "1.0.1") > 0);
    });

    it("returns negative when a < b (patch)", () => {
      assert.ok(compareSemver("1.0.1", "1.0.2") < 0);
    });
  });

  describe("pre-release ordering", () => {
    it("pre-release is less than release (1.0.0-rc.1 < 1.0.0)", () => {
      assert.ok(compareSemver("1.0.0-rc.1", "1.0.0") < 0);
    });

    it("release is greater than pre-release (1.0.0 > 1.0.0-alpha)", () => {
      assert.ok(compareSemver("1.0.0", "1.0.0-alpha") > 0);
    });

    it("pre-release numeric identifiers compare numerically (rc.2 > rc.1)", () => {
      assert.ok(compareSemver("1.0.0-rc.2", "1.0.0-rc.1") > 0);
    });

    it("pre-release numeric 10 > 9 (not lexicographic)", () => {
      assert.ok(compareSemver("1.0.0-rc.10", "1.0.0-rc.9") > 0);
    });

    it("alpha < beta (string comparison)", () => {
      assert.ok(compareSemver("1.0.0-alpha", "1.0.0-beta") < 0);
    });

    it("numeric identifier < string identifier per semver spec", () => {
      // numeric < non-numeric
      assert.ok(compareSemver("1.0.0-1", "1.0.0-alpha") < 0);
    });

    it("fewer pre-release fields = lower precedence", () => {
      // 1.0.0-rc < 1.0.0-rc.1 (fewer fields is lower)
      assert.ok(compareSemver("1.0.0-rc", "1.0.0-rc.1") < 0);
    });

    it("equal pre-release strings return 0", () => {
      assert.equal(compareSemver("1.0.0-alpha.1", "1.0.0-alpha.1"), 0);
    });
  });

  describe("build metadata equality", () => {
    it("build metadata is ignored (1.0.0+build == 1.0.0)", () => {
      assert.equal(compareSemver("1.0.0+build", "1.0.0"), 0);
    });

    it("different build metadata are equal (1.0.0+build1 == 1.0.0+build2)", () => {
      assert.equal(compareSemver("1.0.0+build1", "1.0.0+build2"), 0);
    });

    it("build metadata stripped before pre-release comparison", () => {
      // 1.0.0-rc.1+build < 1.0.0+build (pre-release still lower than release)
      assert.ok(compareSemver("1.0.0-rc.1+build", "1.0.0+build") < 0);
    });
  });

  describe("multi-segment versions", () => {
    it("handles versions with zeroes correctly", () => {
      assert.ok(compareSemver("1.0.1", "1.0.0") > 0);
      assert.equal(compareSemver("0.0.0", "0.0.0"), 0);
    });

    it("handles large version numbers", () => {
      assert.ok(compareSemver("10.20.30", "9.20.30") > 0);
    });
  });
});

// ─── cleanupLegacyMemoryDirs ─────────────────────────────────────────────────

describe("cleanupLegacyMemoryDirs", () => {
  function setup(claudeDir) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  it("returns empty array when agent-memory dir does not exist", () => {
    const claudeDir = path.join(tmpDir, ".claude");
    setup(claudeDir);
    const log = cleanupLegacyMemoryDirs(claudeDir);
    assert.deepEqual(log, []);
  });

  it("returns empty array when no legacy dirs exist", () => {
    const claudeDir = path.join(tmpDir, ".claude");
    const memoryDir = path.join(claudeDir, "agent-memory");
    fs.mkdirSync(memoryDir, { recursive: true });
    const log = cleanupLegacyMemoryDirs(claudeDir);
    assert.deepEqual(log, []);
  });

  it("removes legacy dir without content (no MEMORY.md)", () => {
    const claudeDir = path.join(tmpDir, ".claude");
    const memoryDir = path.join(claudeDir, "agent-memory");
    const legacyDir = path.join(memoryDir, "dev-team-architect");
    fs.mkdirSync(legacyDir, { recursive: true });

    const log = cleanupLegacyMemoryDirs(claudeDir);

    assert.ok(log.some((l) => l === "Removed legacy directory: dev-team-architect/"));
    assert.ok(!fs.existsSync(legacyDir), "legacy dir should be removed");
  });

  it("moves legacy MEMORY.md to current dir when current dir has no MEMORY.md", () => {
    const claudeDir = path.join(tmpDir, ".claude");
    const memoryDir = path.join(claudeDir, "agent-memory");
    const legacyDir = path.join(memoryDir, "dev-team-architect");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, "MEMORY.md"), "# Legacy memory\n");

    const log = cleanupLegacyMemoryDirs(claudeDir);

    const currentMemory = path.join(memoryDir, "dev-team-brooks", "MEMORY.md");
    assert.ok(fs.existsSync(currentMemory), "MEMORY.md should be moved to dev-team-brooks");
    assert.ok(log.some((l) => l.includes("Moved memory: dev-team-architect")));
  });

  it("merges structured legacy content into current MEMORY.md when both exist", () => {
    const claudeDir = path.join(tmpDir, ".claude");
    const memoryDir = path.join(claudeDir, "agent-memory");
    const legacyDir = path.join(memoryDir, "dev-team-architect");
    const currentDir = path.join(memoryDir, "dev-team-brooks");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.mkdirSync(currentDir, { recursive: true });

    const structuredContent = "# Memory\n\n### [2024-01-01] Some finding\nDetails here\n";
    fs.writeFileSync(path.join(legacyDir, "MEMORY.md"), structuredContent);
    fs.writeFileSync(path.join(currentDir, "MEMORY.md"), "# Current memory\n");

    const log = cleanupLegacyMemoryDirs(claudeDir);

    const merged = fs.readFileSync(path.join(currentDir, "MEMORY.md"), "utf-8");
    assert.ok(
      merged.includes("Migrated from dev-team-architect"),
      "should include migration header",
    );
    assert.ok(merged.includes("Some finding"), "should include legacy content");
    assert.ok(log.some((l) => l.includes("Merged memory: dev-team-architect")));
  });

  it("skips merging when legacy MEMORY.md has no structured entries", () => {
    const claudeDir = path.join(tmpDir, ".claude");
    const memoryDir = path.join(claudeDir, "agent-memory");
    const legacyDir = path.join(memoryDir, "dev-team-architect");
    const currentDir = path.join(memoryDir, "dev-team-brooks");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.mkdirSync(currentDir, { recursive: true });

    fs.writeFileSync(
      path.join(legacyDir, "MEMORY.md"),
      "# Just a template\nNo structured entries\n",
    );
    const currentContent = "# Current memory\n";
    fs.writeFileSync(path.join(currentDir, "MEMORY.md"), currentContent);

    cleanupLegacyMemoryDirs(claudeDir);

    const afterMerge = fs.readFileSync(path.join(currentDir, "MEMORY.md"), "utf-8");
    assert.equal(afterMerge, currentContent, "current MEMORY.md should be unchanged");
  });

  it("handles all four known legacy mappings", () => {
    const legacyPairs = [
      { legacy: "dev-team-architect", current: "dev-team-brooks" },
      { legacy: "dev-team-docs", current: "dev-team-tufte" },
      { legacy: "dev-team-lead", current: "dev-team-drucker" },
      { legacy: "dev-team-release", current: "dev-team-conway" },
    ];

    const claudeDir = path.join(tmpDir, ".claude");
    const memoryDir = path.join(claudeDir, "agent-memory");

    for (const { legacy } of legacyPairs) {
      fs.mkdirSync(path.join(memoryDir, legacy), { recursive: true });
    }

    const log = cleanupLegacyMemoryDirs(claudeDir);

    for (const { legacy } of legacyPairs) {
      assert.ok(!fs.existsSync(path.join(memoryDir, legacy)), `${legacy} should be removed`);
      assert.ok(
        log.some((l) => l === `Removed legacy directory: ${legacy}/`),
        `log should mention ${legacy}`,
      );
    }
  });
});

// ─── migrateToV3Layout ───────────────────────────────────────────────────────

describe("migrateToV3Layout", () => {
  it("returns empty array when no migration needed", () => {
    const claudeDir = path.join(tmpDir, ".claude");
    fs.mkdirSync(claudeDir, { recursive: true });
    const log = migrateToV3Layout(tmpDir);
    assert.deepEqual(log, []);
  });

  it("migrates agents from .dev-team/agents/ to .claude/agents/ with .agent.md extension", () => {
    const devTeamAgentsDir = path.join(tmpDir, ".dev-team", "agents");
    const claudeAgentsDir = path.join(tmpDir, ".claude", "agents");
    fs.mkdirSync(devTeamAgentsDir, { recursive: true });
    fs.writeFileSync(path.join(devTeamAgentsDir, "dev-team-voss.md"), "# Voss\ncontent");

    const log = migrateToV3Layout(tmpDir);

    assert.ok(
      fs.existsSync(path.join(claudeAgentsDir, "dev-team-voss.agent.md")),
      "should create .agent.md in .claude/agents/",
    );
    assert.ok(log.some((l) => l.includes("agents")));
  });

  it("does not overwrite existing agent files in .claude/agents/", () => {
    const devTeamAgentsDir = path.join(tmpDir, ".dev-team", "agents");
    const claudeAgentsDir = path.join(tmpDir, ".claude", "agents");
    fs.mkdirSync(devTeamAgentsDir, { recursive: true });
    fs.mkdirSync(claudeAgentsDir, { recursive: true });
    fs.writeFileSync(path.join(devTeamAgentsDir, "dev-team-voss.md"), "# Voss new");
    fs.writeFileSync(path.join(claudeAgentsDir, "dev-team-voss.agent.md"), "# Voss existing");

    migrateToV3Layout(tmpDir);

    const content = fs.readFileSync(path.join(claudeAgentsDir, "dev-team-voss.agent.md"), "utf-8");
    assert.equal(
      content,
      "# Voss existing",
      "existing .claude/agents/ file should not be overwritten",
    );
  });

  it("migrates agent-memory from .dev-team/agent-memory/ to .claude/agent-memory/", () => {
    const devTeamMemoryDir = path.join(tmpDir, ".dev-team", "agent-memory", "dev-team-voss");
    const claudeMemoryDir = path.join(tmpDir, ".claude", "agent-memory");
    fs.mkdirSync(devTeamMemoryDir, { recursive: true });
    fs.writeFileSync(path.join(devTeamMemoryDir, "MEMORY.md"), "# Memory");

    const log = migrateToV3Layout(tmpDir);

    assert.ok(
      fs.existsSync(path.join(claudeMemoryDir, "dev-team-voss", "MEMORY.md")),
      "should migrate MEMORY.md to .claude/agent-memory/",
    );
    assert.ok(log.some((l) => l.includes("memory")));
  });

  it("preserves existing memory files (never overwrites user content)", () => {
    const devTeamMemoryDir = path.join(tmpDir, ".dev-team", "agent-memory", "dev-team-voss");
    const claudeMemoryPath = path.join(
      tmpDir,
      ".claude",
      "agent-memory",
      "dev-team-voss",
      "MEMORY.md",
    );
    fs.mkdirSync(devTeamMemoryDir, { recursive: true });
    fs.mkdirSync(path.dirname(claudeMemoryPath), { recursive: true });
    fs.writeFileSync(path.join(devTeamMemoryDir, "MEMORY.md"), "# New template");
    fs.writeFileSync(claudeMemoryPath, "# User memory — do not overwrite");

    migrateToV3Layout(tmpDir);

    const content = fs.readFileSync(claudeMemoryPath, "utf-8");
    assert.equal(content, "# User memory — do not overwrite");
  });

  it("removes .dev-team/skills/ directory", () => {
    const devTeamSkillsDir = path.join(tmpDir, ".dev-team", "skills");
    fs.mkdirSync(devTeamSkillsDir, { recursive: true });
    fs.writeFileSync(path.join(devTeamSkillsDir, "some-skill.md"), "skill content");

    const log = migrateToV3Layout(tmpDir);

    assert.ok(!fs.existsSync(devTeamSkillsDir), ".dev-team/skills/ should be removed");
    assert.ok(log.some((l) => l.includes(".dev-team/skills/")));
  });

  it("removes .dev-team/learnings.md when .claude/rules/dev-team-learnings.md exists", () => {
    const rulesDir = path.join(tmpDir, ".claude", "rules");
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, "dev-team-learnings.md"), "# Learnings");
    const devTeamLearnings = path.join(tmpDir, ".dev-team", "learnings.md");
    fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
    fs.writeFileSync(devTeamLearnings, "# Old learnings");

    const log = migrateToV3Layout(tmpDir);

    assert.ok(!fs.existsSync(devTeamLearnings), "should remove .dev-team/learnings.md");
    assert.ok(log.some((l) => l.includes("learnings")));
  });

  it("does not remove .dev-team/learnings.md when .claude/rules/ version is missing", () => {
    const devTeamLearnings = path.join(tmpDir, ".dev-team", "learnings.md");
    fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
    fs.writeFileSync(devTeamLearnings, "# Old learnings");

    migrateToV3Layout(tmpDir);

    assert.ok(
      fs.existsSync(devTeamLearnings),
      "should not remove .dev-team/learnings.md when rules version is absent",
    );
  });

  it("is idempotent — safe to run multiple times", () => {
    const devTeamAgentsDir = path.join(tmpDir, ".dev-team", "agents");
    fs.mkdirSync(devTeamAgentsDir, { recursive: true });
    fs.writeFileSync(path.join(devTeamAgentsDir, "dev-team-voss.md"), "# Voss");

    migrateToV3Layout(tmpDir);
    // old dir is removed, calling again should not throw
    const log2 = migrateToV3Layout(tmpDir);
    assert.deepEqual(log2, []);
  });
});
