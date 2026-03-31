"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { CodexAdapter, parseSkillFrontmatter } = require("../../dist/adapters/codex");
const { getAdapter } = require("../../dist/formats/adapters");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codex-adapter-test-"));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

const SAMPLE_DEFS = [
  {
    name: "dev-team-voss",
    description: "Backend engineer.",
    body: "You are Voss.\n",
  },
  {
    name: "dev-team-szabo",
    description: "Security auditor.",
    body: "You are Szabo.\n",
    tools: "Read, Bash",
    model: "sonnet",
  },
];

describe("CodexAdapter", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("has correct id and name", () => {
    const adapter = new CodexAdapter();
    assert.equal(adapter.id, "codex");
    assert.equal(adapter.name, "Codex CLI");
  });

  it("is registered in the adapter registry", () => {
    const adapter = getAdapter("codex");
    assert.ok(adapter, "codex adapter should be registered");
    assert.equal(adapter.id, "codex");
  });

  it("generate() creates .agents/AGENTS.md with all agent instructions", () => {
    const adapter = new CodexAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);

    const agentsMdPath = path.join(tmpDir, ".agents", "AGENTS.md");
    assert.ok(fs.existsSync(agentsMdPath), ".agents/AGENTS.md should exist");

    const content = fs.readFileSync(agentsMdPath, "utf-8");
    assert.ok(content.includes("## dev-team-voss"), "should contain Voss heading");
    assert.ok(content.includes("## dev-team-szabo"), "should contain Szabo heading");
    assert.ok(content.includes("Backend engineer."), "should contain Voss description");
    assert.ok(content.includes("You are Voss."), "should contain Voss body");
  });

  it("generate() creates .codex/config.toml with hooks flag", () => {
    const adapter = new CodexAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);

    const configPath = path.join(tmpDir, ".codex", "config.toml");
    assert.ok(fs.existsSync(configPath), ".codex/config.toml should exist");

    const content = fs.readFileSync(configPath, "utf-8");
    assert.ok(content.includes("codex_hooks = true"), "should enable hooks feature flag");
  });

  it("generate() does not overwrite existing .codex/config.toml", () => {
    const adapter = new CodexAdapter();
    const configPath = path.join(tmpDir, ".codex", "config.toml");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, "custom_setting = true\n");

    adapter.generate(SAMPLE_DEFS, tmpDir);

    const content = fs.readFileSync(configPath, "utf-8");
    assert.ok(content.includes("custom_setting"), "should preserve existing config");
    assert.ok(!content.includes("codex_hooks"), "should not add hooks flag to existing config");
  });

  it("update() returns added names on first run", () => {
    const adapter = new CodexAdapter();
    const result = adapter.update(SAMPLE_DEFS, tmpDir);

    assert.equal(result.added.length, 2, "should report 2 added agents");
    assert.ok(result.added.includes("dev-team-voss"));
    assert.ok(result.added.includes("dev-team-szabo"));
    assert.equal(result.updated.length, 0);
  });

  it("update() returns updated names when content changes", () => {
    const adapter = new CodexAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);

    const modifiedDefs = [
      { ...SAMPLE_DEFS[0], description: "Updated backend engineer." },
      SAMPLE_DEFS[1],
    ];
    const result = adapter.update(modifiedDefs, tmpDir);

    assert.ok(result.updated.length > 0, "should report updated agents");
    assert.equal(result.added.length, 0);
  });

  it("update() returns empty arrays when nothing changed", () => {
    const adapter = new CodexAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);
    const result = adapter.update(SAMPLE_DEFS, tmpDir);

    assert.equal(result.updated.length, 0);
    assert.equal(result.added.length, 0);
  });
});

describe("parseSkillFrontmatter", () => {
  it("parses valid SKILL.md content", () => {
    const content = [
      "---",
      "name: dev-team-task",
      "description: Start an iterative task loop",
      "disable-model-invocation: true",
      "---",
      "",
      "# Task skill body",
    ].join("\n");

    const result = parseSkillFrontmatter(content);
    assert.ok(result, "should parse successfully");
    assert.equal(result.name, "dev-team-task");
    assert.equal(result.description, "Start an iterative task loop");
    assert.equal(result.disableModelInvocation, true);
    assert.ok(result.body.includes("# Task skill body"));
  });

  it("returns null for content without frontmatter", () => {
    const result = parseSkillFrontmatter("# Just a heading\n\nNo frontmatter here.");
    assert.equal(result, null);
  });

  it("returns null when required fields are missing", () => {
    const content = ["---", "name: dev-team-task", "---", "", "Body"].join("\n");
    const result = parseSkillFrontmatter(content);
    assert.equal(result, null, "should return null without description");
  });

  it("defaults disableModelInvocation to false when not present", () => {
    const content = [
      "---",
      "name: dev-team-challenge",
      "description: Challenge a proposal",
      "---",
      "",
      "Body",
    ].join("\n");

    const result = parseSkillFrontmatter(content);
    assert.ok(result);
    assert.equal(result.disableModelInvocation, false);
  });
});

describe("CodexAdapter copySkills", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("generate() creates .agents/skills/ with skill files", () => {
    const adapter = new CodexAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);

    const skillsDir = path.join(tmpDir, ".agents", "skills");
    assert.ok(fs.existsSync(skillsDir), ".agents/skills/ should exist");

    // At least one skill directory should be created
    const entries = fs.readdirSync(skillsDir);
    assert.ok(entries.length > 0, "should have at least one skill directory");
  });

  it("generate() creates openai.yaml for orchestration skills", () => {
    const adapter = new CodexAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);

    const skillsDir = path.join(tmpDir, ".agents", "skills");
    if (!fs.existsSync(skillsDir)) return;

    // Look for any openai.yaml in skill subdirectories
    const entries = fs.readdirSync(skillsDir);
    let foundYaml = false;
    for (const entry of entries) {
      const yamlPath = path.join(skillsDir, entry, "agents", "openai.yaml");
      if (fs.existsSync(yamlPath)) {
        foundYaml = true;
        const content = fs.readFileSync(yamlPath, "utf-8");
        assert.ok(
          content.includes("allow_implicit_invocation: false"),
          "openai.yaml should disable implicit invocation",
        );
      }
    }
    // Orchestration skills (task, review, etc.) should have openai.yaml
    assert.ok(foundYaml, "should generate openai.yaml for at least one orchestration skill");
  });
});
