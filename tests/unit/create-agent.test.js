"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { createAgent } = require("../../dist/create-agent");

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-create-agent-"));
  fs.mkdirSync(path.join(tmpDir, ".dev-team", "agents"), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("createAgent", () => {
  it("creates agent file and memory template for valid name", () => {
    createAgent(tmpDir, "codd");

    const agentPath = path.join(tmpDir, ".dev-team", "agents", "dev-team-codd.md");
    const memoryPath = path.join(tmpDir, ".dev-team", "agent-memory", "dev-team-codd", "MEMORY.md");

    assert.ok(fs.existsSync(agentPath), "agent file should exist");
    assert.ok(fs.existsSync(memoryPath), "memory file should exist");

    const agentContent = fs.readFileSync(agentPath, "utf-8");
    assert.ok(agentContent.startsWith("---"), "should have frontmatter");
    assert.ok(
      agentContent.includes("name: dev-team-codd"),
      "should have correct name in frontmatter",
    );
    assert.ok(agentContent.includes("Codd"), "should have capitalized name in body");

    const memoryContent = fs.readFileSync(memoryPath, "utf-8");
    assert.ok(memoryContent.includes("Agent Memory"), "memory should have header");
    assert.ok(memoryContent.includes("Codd"), "memory should reference agent name");
  });

  it("sanitizes special characters in name", () => {
    createAgent(tmpDir, "My Agent!@#");

    const agentPath = path.join(tmpDir, ".dev-team", "agents", "dev-team-my-agent---.md");
    assert.ok(fs.existsSync(agentPath), "agent file should exist with sanitized name");
  });

  it("handles dev-team- prefix in name without doubling", () => {
    createAgent(tmpDir, "dev-team-codd");

    const agentPath = path.join(tmpDir, ".dev-team", "agents", "dev-team-codd.md");
    assert.ok(fs.existsSync(agentPath), "should not double the prefix");

    const content = fs.readFileSync(agentPath, "utf-8");
    assert.ok(
      content.includes("name: dev-team-codd"),
      "frontmatter name should not have double prefix",
    );
  });

  it("exits with error if agent already exists", () => {
    // Create agent first time
    createAgent(tmpDir, "codd");

    // Override process.exit to capture the call
    const originalExit = process.exit;
    let exitCode = null;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };

    try {
      createAgent(tmpDir, "codd");
      assert.fail("should have called process.exit");
    } catch (err) {
      assert.equal(err.message, "EXIT");
      assert.equal(exitCode, 1, "should exit with code 1");
    } finally {
      process.exit = originalExit;
    }
  });

  it("creates correct frontmatter structure", () => {
    createAgent(tmpDir, "perf");

    const content = fs.readFileSync(
      path.join(tmpDir, ".dev-team", "agents", "dev-team-perf.md"),
      "utf-8",
    );

    // Check frontmatter fields
    assert.ok(content.includes("name: dev-team-perf"), "should have name");
    assert.ok(content.includes("tools:"), "should have tools");
    assert.ok(content.includes("model: sonnet"), "should default to sonnet");
    assert.ok(content.includes("memory: project"), "should have memory: project");
  });

  it("lowercases uppercase characters in name", () => {
    createAgent(tmpDir, "MyAgent");

    const agentPath = path.join(tmpDir, ".dev-team", "agents", "dev-team-myagent.md");
    assert.ok(fs.existsSync(agentPath), "agent file should exist with lowercased name");

    const content = fs.readFileSync(agentPath, "utf-8");
    assert.ok(
      content.includes("name: dev-team-myagent"),
      "frontmatter should have lowercased name",
    );
    assert.ok(content.includes("Myagent"), "body should have title-cased display name");
  });

  it('handles name that is just "dev-team-" prefix with nothing after', () => {
    createAgent(tmpDir, "dev-team-");

    const agentPath = path.join(tmpDir, ".dev-team", "agents", "dev-team-.md");
    assert.ok(fs.existsSync(agentPath), "agent file should exist even with empty suffix");

    const content = fs.readFileSync(agentPath, "utf-8");
    assert.ok(content.includes("name: dev-team-"), "should have name with trailing dash");

    // Verify the template placeholders (AGENTNAME) are replaced, not left empty
    assert.ok(!content.includes("AGENTNAME"), "should not have unresolved AGENTNAME placeholder");
    assert.ok(!content.includes("FULLNAME"), "should not have unresolved FULLNAME placeholder");
    assert.ok(content.startsWith("---"), "should have valid frontmatter");
    assert.ok(content.includes("model: sonnet"), "should have model field");
    assert.ok(content.includes("memory: project"), "should have memory field");
  });
});
