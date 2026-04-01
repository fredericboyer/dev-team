"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  CopilotAdapter,
  buildHooksConfig,
  mapTools,
  adaptAgentBody,
  adaptSkillContent,
} = require("../../dist/adapters/copilot");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "copilot-test-"));
}

function makeDefs() {
  return [
    {
      name: "dev-team-voss",
      description: "Backend engineer.",
      body: "You are Voss, a backend engineer.\n\n## Focus areas\n\n- APIs\n",
      tools: "Read, Edit, Write, Bash, Grep, Glob, Agent",
    },
    {
      name: "dev-team-szabo",
      description: "Security reviewer.",
      body: "You are Szabo, a security reviewer.\n",
      tools: "Read, Grep, Glob, Bash, Agent",
    },
  ];
}

describe("CopilotAdapter", () => {
  let tmpDir;
  let adapter;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    adapter = new CopilotAdapter();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("has correct id and name", () => {
    assert.equal(adapter.id, "copilot");
    assert.equal(adapter.name, "GitHub Copilot");
  });

  it("generate() creates copilot-instructions.md", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const generalPath = path.join(tmpDir, ".github", "copilot-instructions.md");
    assert.ok(fs.existsSync(generalPath), "copilot-instructions.md should exist");

    const content = fs.readFileSync(generalPath, "utf-8");
    assert.ok(content.includes("# Copilot Instructions"), "should have main heading");
    assert.ok(content.includes("## dev-team-voss"), "should contain voss section");
    assert.ok(content.includes("Backend engineer."), "should contain voss description");
    assert.ok(content.includes("## dev-team-szabo"), "should contain szabo section");
  });

  it("generate() creates per-agent instruction files", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const instructionsDir = path.join(tmpDir, ".github", "instructions");

    const vossPath = path.join(instructionsDir, "dev-team-voss.instructions.md");
    assert.ok(fs.existsSync(vossPath), "voss instruction file should exist");
    const vossContent = fs.readFileSync(vossPath, "utf-8");
    assert.ok(vossContent.includes("# dev-team-voss"), "should have agent heading");
    assert.ok(vossContent.includes("Backend engineer."), "should have description");
    assert.ok(vossContent.includes("You are Voss"), "should have body");

    const szaboPath = path.join(instructionsDir, "dev-team-szabo.instructions.md");
    assert.ok(fs.existsSync(szaboPath), "szabo instruction file should exist");
  });

  it("per-agent files do not contain YAML frontmatter by default", () => {
    const defs = [makeDefs()[0]];
    adapter.generate(defs, tmpDir);

    const content = fs.readFileSync(
      path.join(tmpDir, ".github", "instructions", "dev-team-voss.instructions.md"),
      "utf-8",
    );
    assert.ok(!content.startsWith("---"), "should not start with frontmatter");
  });

  it("update() reports added when files do not exist", () => {
    const defs = makeDefs();
    const result = adapter.update(defs, tmpDir);

    assert.deepEqual(result.updated, []);
    assert.deepEqual(result.added, ["dev-team-voss", "dev-team-szabo"]);
  });

  it("update() reports updated when content changed", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    defs[0].description = "Updated backend engineer.";
    const result = adapter.update(defs, tmpDir);

    assert.ok(result.updated.includes("dev-team-voss"), "voss should be updated");
    assert.ok(!result.updated.includes("dev-team-szabo"), "szabo should not be updated");
    assert.deepEqual(result.added, []);

    const content = fs.readFileSync(
      path.join(tmpDir, ".github", "instructions", "dev-team-voss.instructions.md"),
      "utf-8",
    );
    assert.ok(content.includes("Updated backend engineer."));
  });

  it("update() reports nothing when content unchanged", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const result = adapter.update(defs, tmpDir);
    assert.deepEqual(result.updated, []);
    assert.deepEqual(result.added, []);
  });

  it("update() detects new agents as added", () => {
    const defs = [makeDefs()[0]];
    adapter.generate(defs, tmpDir);

    // Add a second agent
    const allDefs = makeDefs();
    const result = adapter.update(allDefs, tmpDir);

    assert.ok(result.added.includes("dev-team-szabo"), "szabo should be added");
    assert.ok(!result.updated.includes("dev-team-voss"), "voss unchanged, should not be updated");
  });

  it("generate() creates hooks.json", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const hooksPath = path.join(tmpDir, ".github", "hooks", "hooks.json");
    assert.ok(fs.existsSync(hooksPath), "hooks.json should exist");

    const config = JSON.parse(fs.readFileSync(hooksPath, "utf-8"));
    assert.ok(config.hooks, "should have hooks key");
    assert.ok(Array.isArray(config.hooks.preToolUse), "should have preToolUse array");
    assert.ok(Array.isArray(config.hooks.postToolUse), "should have postToolUse array");
  });

  it("update() also writes hooks.json", () => {
    const defs = makeDefs();
    adapter.update(defs, tmpDir);

    const hooksPath = path.join(tmpDir, ".github", "hooks", "hooks.json");
    assert.ok(fs.existsSync(hooksPath), "hooks.json should exist after update");
  });
  // --- Agent file tests ---

  it("generate() creates Copilot-native agent files", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const agentPath = path.join(tmpDir, ".github", "agents", "dev-team-voss.agent.md");
    assert.ok(fs.existsSync(agentPath), "voss agent file should exist");

    const content = fs.readFileSync(agentPath, "utf-8");
    assert.ok(content.startsWith("---"), "agent file should start with frontmatter");
    assert.ok(content.includes("name: dev-team-voss"), "should have name field");
    assert.ok(content.includes("description: Backend engineer."), "should have description field");
    assert.ok(content.includes("tools:"), "should have tools field");
    assert.ok(content.includes("You are Voss"), "should have agent body");
  });

  it("generate() maps Claude Code tools to Copilot equivalents", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const content = fs.readFileSync(
      path.join(tmpDir, ".github", "agents", "dev-team-voss.agent.md"),
      "utf-8",
    );
    assert.ok(
      content.includes("tools: read, edit, terminal, search, agent"),
      "should have mapped tools",
    );
  });

  it("update() writes agent files", () => {
    const defs = makeDefs();
    adapter.update(defs, tmpDir);

    const agentPath = path.join(tmpDir, ".github", "agents", "dev-team-voss.agent.md");
    assert.ok(fs.existsSync(agentPath), "agent file should exist after update");
  });

  // --- Skills tests ---

  it("generate() creates skill files", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const skillsDir = path.join(tmpDir, ".github", "skills");
    assert.ok(fs.existsSync(skillsDir), "skills directory should exist");

    const skillDirs = fs.readdirSync(skillsDir);
    assert.ok(skillDirs.length > 0, "should have at least one skill");

    const taskSkillPath = path.join(skillsDir, "dev-team-task", "SKILL.md");
    if (fs.existsSync(taskSkillPath)) {
      const content = fs.readFileSync(taskSkillPath, "utf-8");
      assert.ok(content.includes("---"), "skill should have frontmatter");
      assert.ok(
        !content.includes("disable-model-invocation"),
        "should strip disable-model-invocation from skill frontmatter",
      );
    }
  });

  it("update() creates skill files", () => {
    const defs = makeDefs();
    adapter.update(defs, tmpDir);

    const skillsDir = path.join(tmpDir, ".github", "skills");
    assert.ok(fs.existsSync(skillsDir), "skills directory should exist after update");
  });

  // --- Agent memory tests ---

  it("generate() creates agent memory directories", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const vossMemory = path.join(tmpDir, ".github", "agent-memory", "dev-team-voss", "MEMORY.md");
    assert.ok(fs.existsSync(vossMemory), "voss memory file should exist");

    const content = fs.readFileSync(vossMemory, "utf-8");
    assert.ok(content.includes("# dev-team-voss Memory"), "should have agent name header");
    assert.ok(content.includes("calibration memory"), "should have calibration description");

    const szaboMemory = path.join(tmpDir, ".github", "agent-memory", "dev-team-szabo", "MEMORY.md");
    assert.ok(fs.existsSync(szaboMemory), "szabo memory file should exist");
  });

  it("preserves existing memory on update", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const memoryPath = path.join(tmpDir, ".github", "agent-memory", "dev-team-voss", "MEMORY.md");
    fs.writeFileSync(memoryPath, "# Custom memory content\n\nImportant findings here.\n");

    adapter.update(defs, tmpDir);

    const content = fs.readFileSync(memoryPath, "utf-8");
    assert.ok(content.includes("Custom memory content"), "should preserve existing memory");
    assert.ok(!content.includes("calibration memory"), "should not have template content");
  });

  // --- Shared learnings tests ---

  it("generate() creates shared learnings instruction file", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const learningsPath = path.join(
      tmpDir,
      ".github",
      "instructions",
      "dev-team-learnings.instructions.md",
    );
    assert.ok(fs.existsSync(learningsPath), "learnings instruction file should exist");

    const content = fs.readFileSync(learningsPath, "utf-8");
    assert.ok(content.startsWith("---"), "should start with frontmatter");
    assert.ok(content.includes('applyTo: "**"'), "should have applyTo field");
    assert.ok(
      content.includes("# Shared Team Learnings"),
      "should contain learnings template content",
    );
  });

  it("update() creates shared learnings instruction file", () => {
    const defs = makeDefs();
    adapter.update(defs, tmpDir);

    const learningsPath = path.join(
      tmpDir,
      ".github",
      "instructions",
      "dev-team-learnings.instructions.md",
    );
    assert.ok(fs.existsSync(learningsPath), "learnings instruction file should exist after update");
  });
});

describe("buildHooksConfig", () => {
  it("returns preToolUse with safety guard matcher for bash/shell", () => {
    const config = buildHooksConfig();
    const preToolUse = config.hooks.preToolUse;

    const bashEntry = preToolUse.find((e) => e.matchers && e.matchers.includes("bash"));
    assert.ok(bashEntry, "should have a bash matcher entry");
    assert.ok(
      bashEntry.hooks.some((h) => h.command.includes("safety-guard")),
      "bash matcher should include safety guard",
    );
  });

  it("returns preToolUse with review gate and lint for git commit", () => {
    const config = buildHooksConfig();
    const preToolUse = config.hooks.preToolUse;

    const gitEntry = preToolUse.find((e) => e.matchers && e.matchers.includes("git_commit"));
    assert.ok(gitEntry, "should have a git_commit matcher entry");

    const commands = gitEntry.hooks.map((h) => h.command);
    assert.ok(
      commands.some((c) => c.includes("pre-commit-lint")),
      "git commit matcher should include lint",
    );
    assert.ok(
      commands.some((c) => c.includes("review-gate")),
      "git commit matcher should include review gate",
    );
  });

  it("returns postToolUse with TDD and post-change review for file edits", () => {
    const config = buildHooksConfig();
    const postToolUse = config.hooks.postToolUse;

    const editEntry = postToolUse.find((e) => e.matchers && e.matchers.includes("edit_file"));
    assert.ok(editEntry, "should have an edit_file matcher entry");

    const commands = editEntry.hooks.map((h) => h.command);
    assert.ok(
      commands.some((c) => c.includes("tdd-enforce")),
      "file edit matcher should include TDD enforcement",
    );
    assert.ok(
      commands.some((c) => c.includes("post-change-review")),
      "file edit matcher should include post-change review",
    );
  });

  it("all hook entries have descriptions", () => {
    const config = buildHooksConfig();
    const allEvents = [...config.hooks.preToolUse, ...config.hooks.postToolUse];

    for (const event of allEvents) {
      for (const hook of event.hooks) {
        assert.ok(hook.description, `hook "${hook.command}" should have a description`);
        assert.ok(hook.description.length > 0, "description should not be empty");
      }
    }
  });

  it("does not include sessionStart, sessionEnd, or errorOccurred events", () => {
    const config = buildHooksConfig();
    assert.equal(config.hooks.sessionStart, undefined, "no sessionStart hooks");
    assert.equal(config.hooks.sessionEnd, undefined, "no sessionEnd hooks");
    assert.equal(config.hooks.errorOccurred, undefined, "no errorOccurred hooks");
  });
});

describe("mapTools", () => {
  it("maps Claude Code tools to Copilot equivalents", () => {
    const result = mapTools("Read, Edit, Write, Bash, Grep, Glob, Agent");
    assert.equal(result, "read, edit, terminal, search, agent");
  });

  it("deduplicates mapped tools", () => {
    const result = mapTools("Read, Edit, Write");
    assert.equal(result, "read, edit");
  });

  it("returns defaults when no tools provided", () => {
    const result = mapTools(undefined);
    assert.equal(result, "read, edit, search");
  });

  it("returns defaults for empty string", () => {
    const result = mapTools("");
    assert.equal(result, "read, edit, search");
  });

  it("maps WebSearch and WebFetch", () => {
    const result = mapTools("Read, Grep, Glob, Bash, Agent, WebSearch, WebFetch");
    assert.equal(result, "read, search, terminal, agent, fetch");
  });
});

describe("adaptAgentBody", () => {
  it("replaces .claude/rules/ with .github/instructions/", () => {
    const body = "Shared context is loaded via `.claude/rules/`.";
    const result = adaptAgentBody(body);
    assert.ok(result.includes(".github/instructions/"), "should replace .claude/rules/");
    assert.ok(!result.includes(".claude/rules/"), "should not contain .claude/rules/");
  });

  it("replaces .claude/agents/ with .github/agents/", () => {
    const body = "Read agent definition from `.claude/agents/dev-team-voss.agent.md`.";
    const result = adaptAgentBody(body);
    assert.ok(result.includes(".github/agents/"), "should replace .claude/agents/");
  });

  it("replaces .claude/agent-memory/ with .github/agent-memory/", () => {
    const body = "Memory lives at `.claude/agent-memory/dev-team-voss/MEMORY.md`.";
    const result = adaptAgentBody(body);
    assert.ok(result.includes(".github/agent-memory/"), "should replace .claude/agent-memory/");
  });

  it("preserves non-Claude-specific content", () => {
    const body = "You are Voss, a backend engineer.\n\n## Focus areas\n\n- APIs\n";
    const result = adaptAgentBody(body);
    assert.equal(result, body, "should preserve content without Claude references");
  });
});

describe("adaptSkillContent", () => {
  it("strips disable-model-invocation from frontmatter", () => {
    const content =
      "---\nname: dev-team:task\ndescription: Task loop.\ndisable-model-invocation: true\n---\n\nBody here.\n";
    const result = adaptSkillContent(content);
    assert.ok(
      !result.includes("disable-model-invocation"),
      "should strip disable-model-invocation",
    );
    assert.ok(result.includes("name: dev-team:task"), "should preserve name");
    assert.ok(result.includes("description: Task loop."), "should preserve description");
    assert.ok(result.includes("Body here."), "should preserve body");
  });

  it("preserves content without frontmatter", () => {
    const content = "No frontmatter here.";
    const result = adaptSkillContent(content);
    assert.equal(result, content, "should return content unchanged");
  });

  it("preserves frontmatter without disable-model-invocation", () => {
    const content = "---\nname: dev-team:challenge\ndescription: Challenge.\n---\n\nBody.\n";
    const result = adaptSkillContent(content);
    assert.ok(result.includes("name: dev-team:challenge"), "should preserve name");
    assert.ok(result.includes("description: Challenge."), "should preserve description");
    assert.ok(!result.includes("disable-model-invocation"), "should not add the field");
  });
});
