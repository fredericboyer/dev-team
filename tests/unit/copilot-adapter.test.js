"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { CopilotAdapter, buildHooksConfig } = require("../../dist/adapters/copilot");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "copilot-test-"));
}

function makeDefs() {
  return [
    {
      name: "dev-team-voss",
      description: "Backend engineer.",
      body: "You are Voss, a backend engineer.\n\n## Focus areas\n\n- APIs\n",
    },
    {
      name: "dev-team-szabo",
      description: "Security reviewer.",
      body: "You are Szabo, a security reviewer.\n",
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
