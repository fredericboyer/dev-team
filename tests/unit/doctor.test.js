"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { doctor } = require("../../dist/doctor");

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-doctor-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Derive hookFileMap from init.ts exports (same source doctor.ts uses at runtime).
 */
function getHookFileMapFromSource() {
  const { QUALITY_HOOKS, INFRA_HOOKS } = require("../../dist/init");
  const entries = {};
  for (const h of [...QUALITY_HOOKS, ...INFRA_HOOKS]) {
    entries[h.label] = h.file;
  }
  if (Object.keys(entries).length === 0) {
    throw new Error("hookFileMap derived from init.ts was empty");
  }
  return entries;
}

const SOURCE_HOOK_FILE_MAP = getHookFileMapFromSource();

/**
 * Helper: create a minimal dev-team project layout for doctor checks.
 */
function scaffold(opts = {}) {
  const devTeam = path.join(tmpDir, ".dev-team");
  fs.mkdirSync(devTeam, { recursive: true });

  const agents = opts.agents || ["Voss"];
  const hooks = opts.hooks || ["TDD enforcement"];

  const config = {
    version: "1.0.0",
    agents,
    hooks,
    ...opts.configOverrides,
  };

  fs.writeFileSync(path.join(devTeam, "config.json"), JSON.stringify(config));

  // Create agent files (runtime-native: .claude/agents/*.agent.md)
  if (!opts.skipAgents) {
    const agentsDir = path.join(tmpDir, ".claude", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    for (const label of agents) {
      fs.writeFileSync(
        path.join(agentsDir, `dev-team-${label.toLowerCase()}.agent.md`),
        `# ${label}`,
      );
    }
  }

  // Create hook files
  if (!opts.skipHooks) {
    const hooksDir = path.join(devTeam, "hooks");
    fs.mkdirSync(hooksDir, { recursive: true });
    for (const label of hooks) {
      const fileName = SOURCE_HOOK_FILE_MAP[label];
      if (fileName) {
        fs.writeFileSync(path.join(hooksDir, fileName), "// hook");
      }
    }
  }

  // Create CLAUDE.md
  if (!opts.skipClaudeMd) {
    fs.writeFileSync(
      path.join(tmpDir, "CLAUDE.md"),
      opts.claudeMdContent ||
        "# Project\n\n<!-- dev-team:begin -->\ncontent\n<!-- dev-team:end -->",
    );
  }

  // Create agent memory files (runtime-native: .claude/agent-memory/)
  if (!opts.skipMemory) {
    for (const label of agents) {
      const memDir = path.join(
        tmpDir,
        ".claude",
        "agent-memory",
        `dev-team-${label.toLowerCase()}`,
      );
      fs.mkdirSync(memDir, { recursive: true });
      fs.writeFileSync(path.join(memDir, "MEMORY.md"), "# Memory");
    }
  }

  return devTeam;
}

/**
 * Helper: capture doctor output and exit code.
 * doctor() calls process.exit — we throw a sentinel to halt execution.
 */
function runDoctor(targetDir) {
  const logs = [];
  const originalLog = console.log;
  const originalExit = process.exit;

  let exitCode = null;
  console.log = (...args) => logs.push(args.join(" "));
  process.exit = (code) => {
    exitCode = code;
    throw new Error(`__EXIT_${code}__`);
  };

  try {
    doctor(targetDir);
  } catch (err) {
    if (!err.message.startsWith("__EXIT_")) throw err;
  } finally {
    console.log = originalLog;
    process.exit = originalExit;
  }

  return { logs, exitCode, output: logs.join("\n") };
}

// ─── config.json checks ─────────────────────────────────────────────────────

describe("doctor — config.json", () => {
  it("reports missing config.json", () => {
    fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "CLAUDE.md"),
      "<!-- dev-team:begin -->x<!-- dev-team:end -->",
    );
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(
      output.includes("FAIL") && output.includes("config.json"),
      "should report config.json failure",
    );
    assert.equal(exitCode, 1);
  });

  it("reports invalid JSON in config.json", () => {
    const devTeam = path.join(tmpDir, ".dev-team");
    fs.mkdirSync(devTeam, { recursive: true });
    fs.writeFileSync(path.join(devTeam, "config.json"), "not json{{{");
    fs.writeFileSync(
      path.join(tmpDir, "CLAUDE.md"),
      "<!-- dev-team:begin -->x<!-- dev-team:end -->",
    );
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(output.includes("Invalid JSON"));
    assert.equal(exitCode, 1);
  });

  it("reports valid config.json with version", () => {
    scaffold();
    const { output } = runDoctor(tmpDir);
    assert.match(output, /OK\s+config\.json\s+—\s+v1\.0\.0/);
  });
});

// ─── Agent checks ────────────────────────────────────────────────────────────

describe("doctor — agent files", () => {
  it("passes when agent files exist", () => {
    scaffold({ agents: ["Voss", "Szabo"] });
    const { output } = runDoctor(tmpDir);
    assert.match(output, /OK\s+Agent: Voss\s+—\s+dev-team-voss\.agent\.md/);
    assert.match(output, /OK\s+Agent: Szabo\s+—\s+dev-team-szabo\.agent\.md/);
  });

  it("fails when agent file is missing", () => {
    scaffold({ agents: ["Voss"], skipAgents: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.match(output, /FAIL\s+Agent: Voss\s+—\s+dev-team-voss\.agent\.md missing/);
    assert.equal(exitCode, 1);
  });
});

// ─── Hook checks ─────────────────────────────────────────────────────────────

describe("doctor — hookFileMap", () => {
  it("passes when hook files exist", () => {
    scaffold({ hooks: ["TDD enforcement", "Post-change review"] });
    const { output } = runDoctor(tmpDir);
    assert.match(output, /OK\s+Hook: TDD enforcement\s+—\s+dev-team-tdd-enforce\.js/);
    assert.match(output, /OK\s+Hook: Post-change review\s+—\s+dev-team-post-change-review\.js/);
  });

  it("fails when hook file is missing", () => {
    scaffold({ hooks: ["TDD enforcement"], skipHooks: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.match(output, /FAIL\s+Hook: TDD enforcement\s+—\s+dev-team-tdd-enforce\.js missing/);
    assert.equal(exitCode, 1);
  });

  it("reports unknown hook labels not in hookFileMap", () => {
    scaffold({ hooks: ["Nonexistent hook"], skipHooks: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(output.includes("Unknown hook"));
    assert.equal(exitCode, 1);
  });

  it("maps every known hook label to the correct file", () => {
    const allHooks = Object.keys(SOURCE_HOOK_FILE_MAP);
    scaffold({ hooks: allHooks });
    const { output, exitCode } = runDoctor(tmpDir);
    for (const label of allHooks) {
      const expectedFile = SOURCE_HOOK_FILE_MAP[label];
      const pattern = new RegExp(
        `OK\\s+Hook: ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+—\\s+${expectedFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      );
      assert.match(output, pattern, `${label} should pass with file ${expectedFile}`);
    }
    assert.equal(exitCode, 0);
  });
});

// ─── CLAUDE.md checks ────────────────────────────────────────────────────────

describe("doctor — CLAUDE.md", () => {
  it("fails when CLAUDE.md is missing", () => {
    scaffold({ skipClaudeMd: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(output.includes("FAIL") && output.includes("CLAUDE.md"));
    assert.equal(exitCode, 1);
  });

  it("fails when CLAUDE.md has no dev-team markers", () => {
    scaffold({ claudeMdContent: "# Project\nNo markers here." });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(output.includes("Missing dev-team markers"));
    assert.equal(exitCode, 1);
  });

  it("passes when CLAUDE.md has dev-team markers", () => {
    scaffold();
    const { output } = runDoctor(tmpDir);
    assert.match(output, /OK\s+CLAUDE\.md\s+—\s+Markers present/);
  });
});

// ─── Agent memory checks ────────────────────────────────────────────────────

describe("doctor — agent memory", () => {
  it("passes when MEMORY.md exists", () => {
    scaffold();
    const { output } = runDoctor(tmpDir);
    assert.match(output, /OK\s+Memory: Voss\s+—\s+MEMORY\.md present/);
  });

  it("fails when MEMORY.md is missing", () => {
    scaffold({ skipMemory: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.match(output, /FAIL\s+Memory: Voss\s+—\s+MEMORY\.md missing/);
    assert.equal(exitCode, 1);
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────

describe("doctor — summary", () => {
  it("exits 0 when everything passes", () => {
    scaffold();
    const { exitCode, output } = runDoctor(tmpDir);
    assert.equal(exitCode, 0);
    assert.ok(output.includes("0 failed"));
  });

  it("exits 1 when anything fails", () => {
    scaffold({ skipAgents: true });
    const { exitCode } = runDoctor(tmpDir);
    assert.equal(exitCode, 1);
  });
});
