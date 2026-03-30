"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { AgentsMdAdapter } = require("../../dist/adapters/agents-md");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-test-"));
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

describe("AgentsMdAdapter", () => {
  let tmpDir;
  let adapter;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    adapter = new AgentsMdAdapter();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("has correct id and name", () => {
    assert.equal(adapter.id, "agents-md");
    assert.equal(adapter.name, "AGENTS.md");
  });

  it("generate() creates AGENTS.md at project root", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const agentsMdPath = path.join(tmpDir, "AGENTS.md");
    assert.ok(fs.existsSync(agentsMdPath), "AGENTS.md should exist");

    const content = fs.readFileSync(agentsMdPath, "utf-8");
    assert.ok(content.includes("## Agent: dev-team-voss"), "should contain voss heading");
    assert.ok(content.includes("Backend engineer."), "should contain voss description");
    assert.ok(content.includes("You are Voss"), "should contain voss body");
    assert.ok(content.includes("## Agent: dev-team-szabo"), "should contain szabo heading");
    assert.ok(content.includes("Security reviewer."), "should contain szabo description");
  });

  it("generate() produces correct Markdown format without frontmatter", () => {
    const defs = [makeDefs()[0]];
    adapter.generate(defs, tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf-8");
    assert.ok(!content.includes("---"), "should not contain frontmatter delimiters");
    assert.ok(content.startsWith("## Agent: dev-team-voss"), "should start with agent heading");
  });

  it("update() reports added when AGENTS.md does not exist", () => {
    const defs = makeDefs();
    const result = adapter.update(defs, tmpDir);

    assert.deepEqual(result.updated, []);
    assert.deepEqual(result.added, ["dev-team-voss", "dev-team-szabo"]);
    assert.ok(fs.existsSync(path.join(tmpDir, "AGENTS.md")));
  });

  it("update() reports updated when content changed", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    // Modify a definition
    defs[0].description = "Updated backend engineer.";
    const result = adapter.update(defs, tmpDir);

    assert.deepEqual(result.updated, ["dev-team-voss", "dev-team-szabo"]);
    assert.deepEqual(result.added, []);

    const content = fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf-8");
    assert.ok(content.includes("Updated backend engineer."));
  });

  it("update() reports nothing when content unchanged", () => {
    const defs = makeDefs();
    adapter.generate(defs, tmpDir);

    const result = adapter.update(defs, tmpDir);
    assert.deepEqual(result.updated, []);
    assert.deepEqual(result.added, []);
  });
});
