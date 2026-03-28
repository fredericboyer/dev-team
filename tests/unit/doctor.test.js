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

  // Create agent files
  if (!opts.skipAgents) {
    const agentsDir = path.join(devTeam, "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    for (const label of agents) {
      fs.writeFileSync(path.join(agentsDir, `dev-team-${label.toLowerCase()}.md`), `# ${label}`);
    }
  }

  // Create hook files
  if (!opts.skipHooks) {
    const hooksDir = path.join(devTeam, "hooks");
    fs.mkdirSync(hooksDir, { recursive: true });
    const hookFileMap = {
      "TDD enforcement": "dev-team-tdd-enforce.js",
      "Safety guard": "dev-team-safety-guard.js",
      "Post-change review": "dev-team-post-change-review.js",
      "Pre-commit gate": "dev-team-pre-commit-gate.js",
      "Watch list": "dev-team-watch-list.js",
      "Pre-commit lint": "dev-team-pre-commit-lint.js",
      "Review gate": "dev-team-review-gate.js",
      "Agent teams guide": "dev-team-agent-teams-guide.js",
    };
    for (const label of hooks) {
      const fileName = hookFileMap[label];
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

  // Create agent memory files
  if (!opts.skipMemory) {
    for (const label of agents) {
      const memDir = path.join(devTeam, "agent-memory", `dev-team-${label.toLowerCase()}`);
      fs.mkdirSync(memDir, { recursive: true });
      fs.writeFileSync(path.join(memDir, "MEMORY.md"), "# Memory");
    }
  }

  return devTeam;
}

/**
 * Helper: capture doctor output and exit code.
 * doctor() calls process.exit — we intercept that.
 */
function runDoctor(targetDir) {
  const logs = [];
  const originalLog = console.log;
  const originalExit = process.exit;

  let exitCode = null;
  console.log = (...args) => logs.push(args.join(" "));
  process.exit = (code) => {
    exitCode = code;
  };

  try {
    doctor(targetDir);
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
    assert.ok(output.includes("OK") && output.includes("v1.0.0"));
  });
});

// ─── Agent checks ────────────────────────────────────────────────────────────

describe("doctor — agent files", () => {
  it("passes when agent files exist", () => {
    scaffold({ agents: ["Voss", "Szabo"] });
    const { output } = runDoctor(tmpDir);
    assert.ok(output.includes("OK") && output.includes("Agent: Voss"));
    assert.ok(output.includes("OK") && output.includes("Agent: Szabo"));
  });

  it("fails when agent file is missing", () => {
    scaffold({ agents: ["Voss"], skipAgents: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(output.includes("FAIL") && output.includes("Agent: Voss"));
    assert.equal(exitCode, 1);
  });
});

// ─── Hook checks ─────────────────────────────────────────────────────────────

describe("doctor — hookFileMap", () => {
  it("passes when hook files exist", () => {
    scaffold({ hooks: ["TDD enforcement", "Post-change review"] });
    const { output } = runDoctor(tmpDir);
    assert.ok(output.includes("OK") && output.includes("Hook: TDD enforcement"));
    assert.ok(output.includes("OK") && output.includes("Hook: Post-change review"));
  });

  it("fails when hook file is missing", () => {
    scaffold({ hooks: ["TDD enforcement"], skipHooks: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(output.includes("FAIL") && output.includes("Hook: TDD enforcement"));
    assert.equal(exitCode, 1);
  });

  it("reports unknown hook labels not in hookFileMap", () => {
    scaffold({ hooks: ["Nonexistent hook"], skipHooks: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(output.includes("Unknown hook"));
    assert.equal(exitCode, 1);
  });

  it("maps every known hook label to the correct file", () => {
    const allHooks = [
      "TDD enforcement",
      "Safety guard",
      "Post-change review",
      "Pre-commit gate",
      "Watch list",
      "Pre-commit lint",
      "Review gate",
      "Agent teams guide",
    ];
    scaffold({ hooks: allHooks });
    const { output, exitCode } = runDoctor(tmpDir);
    for (const label of allHooks) {
      assert.ok(output.includes(`Hook: ${label}`) && output.includes("OK"), `${label} should pass`);
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
    assert.ok(output.includes("OK") && output.includes("Markers present"));
  });
});

// ─── Agent memory checks ────────────────────────────────────────────────────

describe("doctor — agent memory", () => {
  it("passes when MEMORY.md exists", () => {
    scaffold();
    const { output } = runDoctor(tmpDir);
    assert.ok(output.includes("OK") && output.includes("Memory: Voss"));
  });

  it("fails when MEMORY.md is missing", () => {
    scaffold({ skipMemory: true });
    const { output, exitCode } = runDoctor(tmpDir);
    assert.ok(output.includes("FAIL") && output.includes("Memory: Voss"));
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
