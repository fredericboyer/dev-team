"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { PRESETS, ALL_AGENTS, QUALITY_HOOKS, INFRA_HOOKS } = require("../../dist/init");

// ─── ALL_AGENTS ───────────────────────────────────────────────────────────────

describe("ALL_AGENTS", () => {
  it("exports an array of agent definitions", () => {
    assert.ok(Array.isArray(ALL_AGENTS));
    assert.ok(ALL_AGENTS.length > 0);
  });

  it("each agent has label, file, and description", () => {
    for (const agent of ALL_AGENTS) {
      assert.ok(
        typeof agent.label === "string" && agent.label.length > 0,
        `${agent.label}: missing label`,
      );
      assert.ok(
        typeof agent.file === "string" && agent.file.endsWith(".md"),
        `${agent.label}: file should end with .md`,
      );
      assert.ok(
        typeof agent.description === "string" && agent.description.length > 0,
        `${agent.label}: missing description`,
      );
    }
  });

  it("includes all expected agents", () => {
    const labels = ALL_AGENTS.map((a) => a.label);
    const expected = [
      "Voss",
      "Hamilton",
      "Mori",
      "Szabo",
      "Knuth",
      "Deming",
      "Tufte",
      "Brooks",
      "Conway",
      "Drucker",
      "Borges",
      "Turing",
      "Rams",
    ];
    for (const name of expected) {
      assert.ok(labels.includes(name), `Expected agent ${name} to be in ALL_AGENTS`);
    }
  });

  it("does not include retired agent Beck", () => {
    const labels = ALL_AGENTS.map((a) => a.label);
    assert.ok(!labels.includes("Beck"), "Beck was retired in v3.2.0 and should not be present");
  });

  it("agent file names follow dev-team-<name>.md convention", () => {
    for (const agent of ALL_AGENTS) {
      assert.ok(
        agent.file.startsWith("dev-team-"),
        `${agent.label}: file should start with dev-team-`,
      );
    }
  });

  it("has no duplicate labels", () => {
    const labels = ALL_AGENTS.map((a) => a.label);
    const unique = new Set(labels);
    assert.equal(unique.size, labels.length, "Duplicate agent labels detected");
  });

  it("has no duplicate files", () => {
    const files = ALL_AGENTS.map((a) => a.file);
    const unique = new Set(files);
    assert.equal(unique.size, files.length, "Duplicate agent files detected");
  });
});

// ─── QUALITY_HOOKS ───────────────────────────────────────────────────────────

describe("QUALITY_HOOKS", () => {
  it("exports an array of hook definitions", () => {
    assert.ok(Array.isArray(QUALITY_HOOKS));
    assert.ok(QUALITY_HOOKS.length > 0);
  });

  it("each hook has label, file, and description", () => {
    for (const hook of QUALITY_HOOKS) {
      assert.ok(
        typeof hook.label === "string" && hook.label.length > 0,
        `${hook.label}: missing label`,
      );
      assert.ok(
        typeof hook.file === "string" && hook.file.endsWith(".js"),
        `${hook.label}: file should end with .js`,
      );
      assert.ok(
        typeof hook.description === "string" && hook.description.length > 0,
        `${hook.label}: missing description`,
      );
    }
  });

  it("includes key quality hooks", () => {
    const labels = QUALITY_HOOKS.map((h) => h.label);
    assert.ok(labels.includes("Safety guard"), "should include Safety guard hook");
    assert.ok(labels.includes("Review gate"), "should include Review gate hook");
    assert.ok(labels.includes("Pre-commit lint"), "should include Pre-commit lint hook");
  });

  it("has no duplicate labels", () => {
    const labels = QUALITY_HOOKS.map((h) => h.label);
    const unique = new Set(labels);
    assert.equal(unique.size, labels.length, "Duplicate quality hook labels detected");
  });

  it("has no duplicate files", () => {
    const files = QUALITY_HOOKS.map((h) => h.file);
    const unique = new Set(files);
    assert.equal(unique.size, files.length, "Duplicate quality hook files detected");
  });
});

// ─── INFRA_HOOKS ─────────────────────────────────────────────────────────────

describe("INFRA_HOOKS", () => {
  it("exports an array of infrastructure hooks", () => {
    assert.ok(Array.isArray(INFRA_HOOKS));
    assert.ok(INFRA_HOOKS.length > 0);
  });

  it("each infra hook has label, file, and description", () => {
    for (const hook of INFRA_HOOKS) {
      assert.ok(typeof hook.label === "string" && hook.label.length > 0);
      assert.ok(typeof hook.file === "string" && hook.file.endsWith(".js"));
      assert.ok(typeof hook.description === "string" && hook.description.length > 0);
    }
  });

  it("includes worktree create and remove hooks", () => {
    const files = INFRA_HOOKS.map((h) => h.file);
    assert.ok(
      files.some((f) => f.includes("worktree-create")),
      "should include worktree-create hook",
    );
    assert.ok(
      files.some((f) => f.includes("worktree-remove")),
      "should include worktree-remove hook",
    );
  });

  it("infra hooks are separate from quality hooks", () => {
    const infraLabels = new Set(INFRA_HOOKS.map((h) => h.label));
    const qualityLabels = new Set(QUALITY_HOOKS.map((h) => h.label));
    for (const label of infraLabels) {
      assert.ok(
        !qualityLabels.has(label),
        `${label} should not appear in both infra and quality hooks`,
      );
    }
  });
});

// ─── PRESETS ─────────────────────────────────────────────────────────────────

describe("PRESETS", () => {
  it("exports an object with preset definitions", () => {
    assert.ok(typeof PRESETS === "object" && PRESETS !== null);
    assert.ok(Object.keys(PRESETS).length > 0);
  });

  it("includes backend, fullstack, and data presets", () => {
    assert.ok("backend" in PRESETS, "should have backend preset");
    assert.ok("fullstack" in PRESETS, "should have fullstack preset");
    assert.ok("data" in PRESETS, "should have data preset");
  });

  it("each preset has label, description, agents, and hooks", () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      assert.ok(
        typeof preset.label === "string" && preset.label.length > 0,
        `${key}: missing label`,
      );
      assert.ok(
        typeof preset.description === "string" && preset.description.length > 0,
        `${key}: missing description`,
      );
      assert.ok(
        Array.isArray(preset.agents) && preset.agents.length > 0,
        `${key}: agents should be a non-empty array`,
      );
      assert.ok(
        Array.isArray(preset.hooks) && preset.hooks.length > 0,
        `${key}: hooks should be a non-empty array`,
      );
    }
  });

  it("preset agents are valid agent labels", () => {
    const validLabels = new Set(ALL_AGENTS.map((a) => a.label));
    for (const [key, preset] of Object.entries(PRESETS)) {
      for (const agentLabel of preset.agents) {
        assert.ok(
          validLabels.has(agentLabel),
          `Preset '${key}' references unknown agent: ${agentLabel}`,
        );
      }
    }
  });

  it("preset hooks are valid quality hook labels", () => {
    const validHookLabels = new Set(QUALITY_HOOKS.map((h) => h.label));
    for (const [key, preset] of Object.entries(PRESETS)) {
      for (const hookLabel of preset.hooks) {
        assert.ok(
          validHookLabels.has(hookLabel),
          `Preset '${key}' references unknown hook: ${hookLabel}`,
        );
      }
    }
  });

  it("fullstack preset includes all agents", () => {
    const allLabels = ALL_AGENTS.map((a) => a.label).sort();
    const fullstackAgents = [...PRESETS.fullstack.agents].sort();
    assert.deepEqual(fullstackAgents, allLabels, "fullstack preset should include every agent");
  });

  it("fullstack preset includes all quality hooks", () => {
    const allHooks = QUALITY_HOOKS.map((h) => h.label).sort();
    const fullstackHooks = [...PRESETS.fullstack.hooks].sort();
    assert.deepEqual(
      fullstackHooks,
      allHooks,
      "fullstack preset should include every quality hook",
    );
  });

  it("backend preset includes core backend agents", () => {
    const backendAgents = PRESETS.backend.agents;
    assert.ok(backendAgents.includes("Voss"), "backend should include Voss");
    assert.ok(backendAgents.includes("Szabo"), "backend should include Szabo");
    assert.ok(backendAgents.includes("Drucker"), "backend should include Drucker");
  });

  it("data preset includes Drucker and Borges", () => {
    const dataAgents = PRESETS.data.agents;
    assert.ok(dataAgents.includes("Drucker"), "data preset should include Drucker");
    assert.ok(dataAgents.includes("Borges"), "data preset should include Borges");
  });

  it("preset label matches its key", () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      assert.equal(preset.label, key, `Preset key '${key}' should match its label property`);
    }
  });
});

// ─── Hook settings filtering logic ───────────────────────────────────────────
// The filtering logic lives inside run() but its inputs (INFRA_HOOKS, QUALITY_HOOKS)
// can be tested via the exported constants. Test the selection rules directly.

describe("hook selection rules", () => {
  it("infra hooks are always included (not user-selectable)", () => {
    // INFRA_HOOKS is separate from QUALITY_HOOKS — users cannot deselect them
    for (const infraHook of INFRA_HOOKS) {
      const inQuality = QUALITY_HOOKS.some((h) => h.label === infraHook.label);
      assert.ok(!inQuality, `Infra hook '${infraHook.label}' should not be in QUALITY_HOOKS`);
    }
  });

  it("all quality hook files follow dev-team-*.js naming", () => {
    for (const hook of QUALITY_HOOKS) {
      assert.ok(
        hook.file.startsWith("dev-team-") && hook.file.endsWith(".js"),
        `Quality hook file '${hook.file}' should be dev-team-*.js`,
      );
    }
  });

  it("all infra hook files follow dev-team-*.js naming", () => {
    for (const hook of INFRA_HOOKS) {
      assert.ok(
        hook.file.startsWith("dev-team-") && hook.file.endsWith(".js"),
        `Infra hook file '${hook.file}' should be dev-team-*.js`,
      );
    }
  });
});
