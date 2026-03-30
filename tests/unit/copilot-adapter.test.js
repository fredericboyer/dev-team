"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { CopilotAdapter } = require("../../dist/adapters/copilot");

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
});
