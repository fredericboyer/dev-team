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
  fs.mkdirSync(path.join(tmpDir, ".claude", "agents"), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Run createAgent expecting it to call process.exit(1).
 * Captures the exit code and any stderr output.
 * Returns { exitCode, stderr }.
 */
function expectExitError(dir, name) {
  const originalExit = process.exit;
  const originalStderr = process.stderr.write;
  let exitCode = null;
  const stderrChunks = [];
  process.exit = (code) => {
    exitCode = code;
    throw new Error("__EXIT__");
  };
  process.stderr.write = (chunk) => {
    stderrChunks.push(String(chunk));
    return true;
  };
  try {
    createAgent(dir, name);
    assert.fail("should have called process.exit");
  } catch (err) {
    assert.equal(err.message, "__EXIT__");
  } finally {
    process.exit = originalExit;
    process.stderr.write = originalStderr;
  }
  return { exitCode, stderr: stderrChunks.join("") };
}

describe("createAgent", () => {
  it("creates agent file and memory template for valid name", () => {
    createAgent(tmpDir, "codd");

    const agentPath = path.join(tmpDir, ".claude", "agents", "dev-team-codd.agent.md");
    const memoryPath = path.join(tmpDir, ".claude", "agent-memory", "dev-team-codd", "MEMORY.md");

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

    const agentPath = path.join(tmpDir, ".claude", "agents", "dev-team-my-agent---.agent.md");
    assert.ok(fs.existsSync(agentPath), "agent file should exist with sanitized name");
  });

  it("handles dev-team- prefix in name without doubling", () => {
    createAgent(tmpDir, "dev-team-codd");

    const agentPath = path.join(tmpDir, ".claude", "agents", "dev-team-codd.agent.md");
    assert.ok(fs.existsSync(agentPath), "should not double the prefix");

    const content = fs.readFileSync(agentPath, "utf-8");
    assert.ok(
      content.includes("name: dev-team-codd"),
      "frontmatter name should not have double prefix",
    );
  });

  it("exits with error if agent already exists", () => {
    createAgent(tmpDir, "codd");

    const { exitCode, stderr } = expectExitError(tmpDir, "codd");
    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(stderr.includes("already exists"), "should mention agent already exists");
  });

  it("creates correct frontmatter structure", () => {
    createAgent(tmpDir, "perf");

    const content = fs.readFileSync(
      path.join(tmpDir, ".claude", "agents", "dev-team-perf.agent.md"),
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

    const agentPath = path.join(tmpDir, ".claude", "agents", "dev-team-myagent.agent.md");
    assert.ok(fs.existsSync(agentPath), "agent file should exist with lowercased name");

    const content = fs.readFileSync(agentPath, "utf-8");
    assert.ok(
      content.includes("name: dev-team-myagent"),
      "frontmatter should have lowercased name",
    );
    assert.ok(content.includes("Myagent"), "body should have title-cased display name");
  });

  it('exits with error for name that is just "dev-team-" prefix with nothing after', () => {
    const { exitCode, stderr } = expectExitError(tmpDir, "dev-team-");
    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(stderr.includes("alphanumeric"), "should mention alphanumeric requirement");
  });

  it("exits with error for whitespace-only name", () => {
    const { exitCode, stderr } = expectExitError(tmpDir, "   ");
    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(stderr.length > 0, "should output an error message");
  });

  it("exits with error for single dash name", () => {
    const { exitCode, stderr } = expectExitError(tmpDir, "-");
    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(stderr.includes("alphanumeric"), "should mention alphanumeric requirement");
  });

  it("exits with error for all-special-character name", () => {
    const { exitCode, stderr } = expectExitError(tmpDir, "!@#$%^&*");
    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(stderr.includes("alphanumeric"), "should mention alphanumeric requirement");
  });
});
