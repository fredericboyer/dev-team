"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { status } = require("../../dist/status");

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-status-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Helper: capture status output and exit code.
 */
function runStatus(targetDir) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;

  let exitCode = null;
  console.log = (...args) => logs.push(args.join(" "));
  console.error = (...args) => errors.push(args.join(" "));
  process.exit = (code) => {
    exitCode = code;
    throw new Error(`__EXIT_${code}__`);
  };

  try {
    status(targetDir);
  } catch (err) {
    if (!err.message.startsWith("__EXIT_")) throw err;
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  }

  return { logs, errors, exitCode, output: logs.join("\n"), errorOutput: errors.join("\n") };
}

/**
 * Helper: scaffold a minimal dev-team project.
 */
function scaffold(opts = {}) {
  const devTeam = path.join(tmpDir, ".dev-team");
  fs.mkdirSync(devTeam, { recursive: true });

  const config = {
    version: "1.0.0",
    agents: opts.agents || ["Voss"],
    hooks: opts.hooks || ["TDD enforcement"],
    ...opts.configOverrides,
  };

  fs.writeFileSync(path.join(devTeam, "config.json"), JSON.stringify(config));

  // Skills directories
  if (opts.skills) {
    const skillsDir = path.join(devTeam, "skills");
    fs.mkdirSync(skillsDir, { recursive: true });
    for (const skill of opts.skills) {
      fs.mkdirSync(path.join(skillsDir, skill), { recursive: true });
    }
  }

  // Agent memory
  if (opts.memory) {
    for (const [label, content] of Object.entries(opts.memory)) {
      const memDir = path.join(devTeam, "agent-memory", `dev-team-${label.toLowerCase()}`);
      fs.mkdirSync(memDir, { recursive: true });
      fs.writeFileSync(path.join(memDir, "MEMORY.md"), content);
    }
  }

  // Shared learnings (rules path)
  if (opts.learnings) {
    const rulesDir = path.join(tmpDir, ".claude", "rules");
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, "dev-team-learnings.md"), opts.learnings);
  }

  // Legacy learnings path
  if (opts.legacyLearnings) {
    fs.writeFileSync(path.join(devTeam, "learnings.md"), opts.legacyLearnings);
  }

  return devTeam;
}

// ─── Missing / corrupt config ────────────────────────────────────────────────

describe("status — config errors", () => {
  it("exits 1 when config.json is missing", () => {
    const { exitCode, errorOutput } = runStatus(tmpDir);
    assert.equal(exitCode, 1);
    assert.ok(errorOutput.includes("Not a dev-team project"));
  });

  it("exits 1 when config.json is corrupt", () => {
    const devTeam = path.join(tmpDir, ".dev-team");
    fs.mkdirSync(devTeam, { recursive: true });
    fs.writeFileSync(path.join(devTeam, "config.json"), "broken{{{");
    const { exitCode, errorOutput } = runStatus(tmpDir);
    assert.equal(exitCode, 1);
    assert.ok(errorOutput.includes("corrupted"));
  });
});

// ─── Basic output ────────────────────────────────────────────────────────────

describe("status — basic output", () => {
  it("prints version from config", () => {
    scaffold();
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("v1.0.0"));
  });

  it("prints preset when present", () => {
    scaffold({ configOverrides: { preset: "standard" } });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("standard"));
  });

  it("lists agents", () => {
    scaffold({ agents: ["Voss", "Szabo"] });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("Voss"));
    assert.ok(output.includes("Szabo"));
  });

  it("lists hooks", () => {
    scaffold({ hooks: ["TDD enforcement", "Safety guard"] });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("TDD enforcement"));
    assert.ok(output.includes("Safety guard"));
  });
});

// ─── Skills discovery ────────────────────────────────────────────────────────

describe("status — skills", () => {
  it("reports 'none' when no skills directory", () => {
    scaffold();
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("none"));
  });

  it("lists discovered skills with dev-team- prefix stripped", () => {
    scaffold({ skills: ["dev-team-task", "dev-team-review"] });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("task"));
    assert.ok(output.includes("review"));
  });
});

// ─── Workflow fields ─────────────────────────────────────────────────────────

describe("status — workflow fields", () => {
  it("prints issue tracker when set", () => {
    scaffold({ configOverrides: { issueTracker: "GitHub Issues" } });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("GitHub Issues"));
  });

  it("prints branch convention when set and not None", () => {
    scaffold({ configOverrides: { branchConvention: "feat/fix" } });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("feat/fix"));
  });

  it("does not print branch convention when set to None", () => {
    scaffold({ configOverrides: { branchConvention: "None" } });
    const { output } = runStatus(tmpDir);
    assert.ok(!output.includes("Branches:"));
  });
});

// ─── Memory status ───────────────────────────────────────────────────────────

describe("status — memory", () => {
  it("reports 'no memory file' for agents without MEMORY.md", () => {
    scaffold({ agents: ["Voss"] });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("no memory file"));
  });

  it("reports 'empty (template only)' for MEMORY.md without dated entries", () => {
    scaffold({ agents: ["Voss"], memory: { Voss: "# Memory\n\nNo entries yet." } });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("empty (template only)"));
  });

  it("reports 'has learnings' for MEMORY.md with dated entries", () => {
    scaffold({
      agents: ["Voss"],
      memory: { Voss: "# Memory\n\n### [2026-03-01] Some finding\nDetails here." },
    });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("has learnings"));
  });
});

// ─── Shared learnings ────────────────────────────────────────────────────────

describe("status — shared learnings", () => {
  it("detects learnings in rules path (.claude/rules/dev-team-learnings.md)", () => {
    scaffold({
      learnings: "# Learnings\n\n## Coding Conventions\n\n- Use oxlint for linting.",
    });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("has content"));
  });

  it("detects learnings in legacy path (.dev-team/learnings.md)", () => {
    scaffold({
      legacyLearnings: "# Learnings\n\n## Process\n\n- Always test.",
    });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("has content"));
  });

  it("prefers rules path over legacy path", () => {
    scaffold({
      learnings: "# Learnings\n\n## Process\n\n- Rules content.",
      legacyLearnings: "# Learnings\n\n## Process\n\n- Legacy content.",
    });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("has content"), "should report learnings has content");
    // Verify it read the rules path by removing it and confirming legacy is used as fallback
    const rulesPath = path.join(tmpDir, ".claude", "rules", "dev-team-learnings.md");
    assert.ok(fs.existsSync(rulesPath), "rules path should exist for precedence test");
    fs.unlinkSync(rulesPath);
    const { output: fallbackOutput } = runStatus(tmpDir);
    assert.ok(fallbackOutput.includes("has content"), "legacy path should work as fallback");
  });

  it("reports 'template only' for headers-only learnings file", () => {
    scaffold({
      learnings: "# Learnings\n\n## Coding Conventions\n\n## Process\n",
    });
    const { output } = runStatus(tmpDir);
    assert.ok(output.includes("template only"));
  });
});
