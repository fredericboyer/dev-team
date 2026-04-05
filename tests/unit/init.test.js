"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  PRESETS,
  ALL_AGENTS,
  QUALITY_HOOKS,
  INFRA_HOOKS,
  DEFAULT_WORKFLOW,
  DEFAULT_VERSIONING,
  DEFAULT_PR_CONFIG,
  validateWorkflowConfig,
  mergeWorkflowConfig,
  DEFAULT_MODELS,
  mergeModelsConfig,
} = require("../../dist/init");

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
      "Hopper",
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
    assert.ok(backendAgents.includes("Hopper"), "backend should include Hopper");
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

// ─── Preset flag parsing (--preset=name form) ────────────────────────────────
// K3: the equals-delimiter form of --preset was untested at the unit level.
// Mirror the parsing logic from init.ts run() and verify it against PRESETS.

describe("preset flag parsing — equals-delimiter form", () => {
  // Mirrors: `presetFlag.includes("=") ? presetFlag.split("=")[1] : flags[idx + 1]`
  function parsePresetFlag(flags) {
    const presetFlag = flags.find((f) => f === "--preset" || f.startsWith("--preset="));
    if (!presetFlag) return undefined;
    const idx = flags.indexOf(presetFlag);
    return presetFlag.includes("=") ? presetFlag.split("=")[1] : flags[idx + 1];
  }

  it("--preset=backend resolves to 'backend' (valid preset key)", () => {
    const name = parsePresetFlag(["--preset=backend"]);
    assert.equal(name, "backend");
    assert.ok(name in PRESETS, "resolved name should be a valid preset key");
  });

  it("--preset=fullstack resolves to 'fullstack'", () => {
    const name = parsePresetFlag(["--preset=fullstack"]);
    assert.equal(name, "fullstack");
    assert.ok(name in PRESETS);
  });

  it("--preset=data resolves to 'data'", () => {
    const name = parsePresetFlag(["--preset=data"]);
    assert.equal(name, "data");
    assert.ok(name in PRESETS);
  });

  it("--preset backend (space form) resolves to 'backend'", () => {
    const name = parsePresetFlag(["--preset", "backend"]);
    assert.equal(name, "backend");
    assert.ok(name in PRESETS);
  });

  it("returns undefined when no --preset flag present", () => {
    const name = parsePresetFlag(["--all"]);
    assert.equal(name, undefined);
  });

  it("equals-delimiter and space form produce the same result for all known presets", () => {
    for (const key of Object.keys(PRESETS)) {
      const equalsForm = parsePresetFlag([`--preset=${key}`]);
      const spaceForm = parsePresetFlag(["--preset", key]);
      assert.equal(equalsForm, spaceForm, `Mismatch for preset '${key}'`);
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

// ─── DEFAULT_WORKFLOW ─────────────────────────────────────────────────────────

describe("DEFAULT_WORKFLOW", () => {
  it("contains all required workflow keys", () => {
    const requiredKeys = [
      "research",
      "challenge",
      "implement",
      "review",
      "pr",
      "merge",
      "release",
      "learn",
    ];
    for (const key of requiredKeys) {
      assert.ok(Object.hasOwn(DEFAULT_WORKFLOW, key), `DEFAULT_WORKFLOW should have key: ${key}`);
    }
  });

  it("defaults match the specified values", () => {
    assert.equal(DEFAULT_WORKFLOW.research, true);
    assert.equal(DEFAULT_WORKFLOW.challenge, false);
    assert.equal(DEFAULT_WORKFLOW.implement, true);
    assert.equal(DEFAULT_WORKFLOW.review, true);
    assert.equal(DEFAULT_WORKFLOW.pr, true);
    assert.equal(DEFAULT_WORKFLOW.merge, true);
    assert.equal(DEFAULT_WORKFLOW.release, false);
    assert.equal(DEFAULT_WORKFLOW.learn, true);
  });

  it("WorkflowToggle fields accept boolean or 'complex'", () => {
    // research, challenge, review are WorkflowToggle (boolean | "complex")
    // DEFAULT_WORKFLOW values are booleans — the type allows "complex" too
    assert.ok(
      typeof DEFAULT_WORKFLOW.research === "boolean" || DEFAULT_WORKFLOW.research === "complex",
    );
    assert.ok(
      typeof DEFAULT_WORKFLOW.challenge === "boolean" || DEFAULT_WORKFLOW.challenge === "complex",
    );
    assert.ok(
      typeof DEFAULT_WORKFLOW.review === "boolean" || DEFAULT_WORKFLOW.review === "complex",
    );
    assert.ok(typeof DEFAULT_WORKFLOW.learn === "boolean" || DEFAULT_WORKFLOW.learn === "complex");
  });

  it("WorkflowSwitch fields are booleans", () => {
    // implement, pr, merge, release are WorkflowSwitch (boolean only)
    assert.equal(typeof DEFAULT_WORKFLOW.implement, "boolean");
    assert.equal(typeof DEFAULT_WORKFLOW.pr, "boolean");
    assert.equal(typeof DEFAULT_WORKFLOW.merge, "boolean");
    assert.equal(typeof DEFAULT_WORKFLOW.release, "boolean");
  });
});

// ─── validateWorkflowConfig ───────────────────────────────────────────────────

describe("validateWorkflowConfig", () => {
  it("returns no warnings for a valid default config", () => {
    const warnings = validateWorkflowConfig(DEFAULT_WORKFLOW);
    // DEFAULT_WORKFLOW has challenge:false so no complex warning; pr:true so merge is fine
    assert.equal(warnings.length, 0);
  });

  it("warns when merge is enabled but pr is disabled", () => {
    const warnings = validateWorkflowConfig({ merge: true, pr: false });
    assert.ok(warnings.length > 0, "should produce at least one warning");
    const mergeWarning = warnings.find((w) => w.step === "merge");
    assert.ok(mergeWarning, "should warn about merge step");
    assert.ok(mergeWarning.reason.includes("pr"), "warning should mention pr dependency");
    assert.ok(
      mergeWarning.action.includes("skip") || mergeWarning.action.includes("merge"),
      "action should describe consequence",
    );
  });

  it("warns when release is enabled but merge is disabled", () => {
    const warnings = validateWorkflowConfig({ release: true, merge: false });
    const releaseWarning = warnings.find((w) => w.step === "release");
    assert.ok(releaseWarning, "should warn about release step");
    assert.ok(releaseWarning.reason.includes("merge"), "warning should mention merge dependency");
  });

  it("warns when release is enabled but both pr and merge are disabled (cascading)", () => {
    const warnings = validateWorkflowConfig({ release: true, merge: false, pr: false });
    const releaseWarning = warnings.find((w) => w.step === "release");
    assert.ok(releaseWarning, "should warn about release when merge is off");
  });

  it("does not warn about merge when pr is enabled", () => {
    const warnings = validateWorkflowConfig({ merge: true, pr: true });
    const mergeWarning = warnings.find((w) => w.step === "merge");
    assert.equal(mergeWarning, undefined, "should not warn when pr is enabled");
  });

  it("does not warn about release when merge is enabled", () => {
    const warnings = validateWorkflowConfig({ release: true, merge: true, pr: true });
    const releaseWarning = warnings.find((w) => w.step === "release");
    assert.equal(releaseWarning, undefined, "should not warn when merge is enabled");
  });

  it("warns when challenge is set to 'complex'", () => {
    const warnings = validateWorkflowConfig({ challenge: "complex" });
    const challengeWarning = warnings.find((w) => w.step === "challenge");
    assert.ok(challengeWarning, "should warn when challenge is 'complex'");
    assert.ok(
      challengeWarning.reason.includes("Brooks"),
      "warning should mention Brooks pre-assessment",
    );
  });

  it("does not warn when challenge is boolean false", () => {
    const warnings = validateWorkflowConfig({ challenge: false });
    const challengeWarning = warnings.find((w) => w.step === "challenge");
    assert.equal(challengeWarning, undefined, "should not warn for boolean challenge");
  });

  it("does not warn when challenge is boolean true", () => {
    const warnings = validateWorkflowConfig({ challenge: true });
    const challengeWarning = warnings.find((w) => w.step === "challenge");
    assert.equal(challengeWarning, undefined, "should not warn for boolean challenge");
  });

  it("returns empty array for empty config (all defaults apply, no conflicts)", () => {
    const warnings = validateWorkflowConfig({});
    assert.deepEqual(warnings, []);
  });
});

// ─── mergeWorkflowConfig ──────────────────────────────────────────────────────

describe("mergeWorkflowConfig", () => {
  it("returns default workflow when called with empty object", () => {
    const merged = mergeWorkflowConfig({});
    assert.deepEqual(merged, DEFAULT_WORKFLOW);
  });

  it("preserves existing user values for known keys", () => {
    const merged = mergeWorkflowConfig({ release: true, challenge: "complex" });
    assert.equal(merged.release, true, "should preserve user-set release:true");
    assert.equal(merged.challenge, "complex", "should preserve user-set challenge:'complex'");
  });

  it("fills in missing keys with defaults", () => {
    const merged = mergeWorkflowConfig({ pr: false });
    assert.equal(merged.pr, false, "user-set pr:false preserved");
    assert.equal(merged.research, DEFAULT_WORKFLOW.research, "missing key filled from default");
    assert.equal(merged.implement, DEFAULT_WORKFLOW.implement, "missing key filled from default");
    assert.equal(merged.learn, DEFAULT_WORKFLOW.learn, "missing key filled from default");
  });

  it("ignores unknown keys (only known workflow keys are merged)", () => {
    const merged = mergeWorkflowConfig({ unknownKey: true });
    assert.ok(!Object.hasOwn(merged, "unknownKey"), "unknown key should not appear in result");
  });

  it("result always contains all DEFAULT_WORKFLOW keys", () => {
    const merged = mergeWorkflowConfig({});
    for (const key of Object.keys(DEFAULT_WORKFLOW)) {
      assert.ok(Object.hasOwn(merged, key), `merged result should contain key: ${key}`);
    }
  });

  it("does not mutate the DEFAULT_WORKFLOW", () => {
    const before = { ...DEFAULT_WORKFLOW };
    mergeWorkflowConfig({ release: true, pr: false, challenge: "complex" });
    assert.deepEqual(DEFAULT_WORKFLOW, before, "DEFAULT_WORKFLOW must not be mutated");
  });

  it("update scenario: preserves all user values and adds new defaults", () => {
    // Simulates an old config missing the 'learn' key
    const oldConfig = {
      research: false,
      challenge: "complex",
      implement: true,
      review: true,
      pr: true,
      merge: true,
      release: true,
    };
    const merged = mergeWorkflowConfig(oldConfig);
    // Old values preserved
    assert.equal(merged.research, false);
    assert.equal(merged.challenge, "complex");
    assert.equal(merged.release, true);
    // New key added with default
    assert.equal(merged.learn, DEFAULT_WORKFLOW.learn);
  });
});

// ─── DEFAULT_VERSIONING ─────────────────────────────────────────────────────

describe("DEFAULT_VERSIONING", () => {
  it("is exported", () => {
    assert.ok(DEFAULT_VERSIONING, "DEFAULT_VERSIONING should be exported");
  });

  it("has scheme set to 'semver'", () => {
    assert.equal(DEFAULT_VERSIONING.scheme, "semver");
  });

  it("has source set to 'package.json'", () => {
    assert.equal(DEFAULT_VERSIONING.source, "package.json");
  });

  it("only contains scheme and source keys", () => {
    const keys = Object.keys(DEFAULT_VERSIONING).sort();
    assert.deepEqual(keys, ["scheme", "source"]);
  });
});

// ─── DEFAULT_PR_CONFIG ──────────────────────────────────────────────────────

describe("DEFAULT_PR_CONFIG", () => {
  it("is exported", () => {
    assert.ok(DEFAULT_PR_CONFIG, "DEFAULT_PR_CONFIG should be exported");
  });

  it("has titleFormat set to 'conventional'", () => {
    assert.equal(DEFAULT_PR_CONFIG.titleFormat, "conventional");
  });

  it("has linkKeyword set to 'Closes'", () => {
    assert.equal(DEFAULT_PR_CONFIG.linkKeyword, "Closes");
  });

  it("has draft set to false", () => {
    assert.equal(DEFAULT_PR_CONFIG.draft, false);
  });

  it("has template with summary and testPlan", () => {
    assert.deepEqual(DEFAULT_PR_CONFIG.template, ["summary", "testPlan"]);
  });

  it("has autoLabel set to true", () => {
    assert.equal(DEFAULT_PR_CONFIG.autoLabel, true);
  });

  it("only contains expected keys", () => {
    const keys = Object.keys(DEFAULT_PR_CONFIG).sort();
    assert.deepEqual(keys, ["autoLabel", "draft", "linkKeyword", "template", "titleFormat"]);
  });
});

// ─── DEFAULT_MODELS ───────────────────────────────────────────────────────────

describe("DEFAULT_MODELS", () => {
  it("is exported", () => {
    assert.ok(DEFAULT_MODELS, "DEFAULT_MODELS should be exported");
  });

  it("has default set to 'opus'", () => {
    assert.equal(DEFAULT_MODELS.default, "opus");
  });

  it("has an empty agents object", () => {
    assert.deepEqual(DEFAULT_MODELS.agents, {});
  });

  it("only contains default and agents keys", () => {
    const keys = Object.keys(DEFAULT_MODELS).sort();
    assert.deepEqual(keys, ["agents", "default"]);
  });
});

// ─── mergeModelsConfig ────────────────────────────────────────────────────────

describe("mergeModelsConfig", () => {
  it("returns default models when called with empty object", () => {
    const merged = mergeModelsConfig({});
    assert.deepEqual(merged, DEFAULT_MODELS);
  });

  it("preserves user-set default tier", () => {
    const merged = mergeModelsConfig({ default: "sonnet" });
    assert.equal(merged.default, "sonnet");
  });

  it("preserves user-set agent string assignments", () => {
    const merged = mergeModelsConfig({ agents: { voss: "sonnet", mori: "haiku" } });
    assert.equal(merged.agents.voss, "sonnet");
    assert.equal(merged.agents.mori, "haiku");
  });

  it("preserves user-set agent array assignments", () => {
    const merged = mergeModelsConfig({ agents: { szabo: ["opus", "sonnet"] } });
    assert.deepEqual(merged.agents.szabo, ["opus", "sonnet"]);
  });

  it("uses default tier when no default is provided", () => {
    const merged = mergeModelsConfig({ agents: { voss: "sonnet" } });
    assert.equal(merged.default, "opus");
  });

  it("returns empty agents when none provided", () => {
    const merged = mergeModelsConfig({ default: "sonnet" });
    assert.deepEqual(merged.agents, {});
  });

  it("does not mutate DEFAULT_MODELS", () => {
    const before = { default: DEFAULT_MODELS.default, agents: { ...DEFAULT_MODELS.agents } };
    mergeModelsConfig({ default: "haiku", agents: { szabo: ["opus", "sonnet"] } });
    assert.deepEqual(DEFAULT_MODELS, before, "DEFAULT_MODELS must not be mutated");
  });

  it("handles mixed string and array agent assignments", () => {
    const merged = mergeModelsConfig({
      agents: {
        szabo: ["opus", "sonnet"],
        knuth: ["opus", "sonnet"],
        voss: "sonnet",
        mori: "haiku",
      },
    });
    assert.deepEqual(merged.agents.szabo, ["opus", "sonnet"]);
    assert.deepEqual(merged.agents.knuth, ["opus", "sonnet"]);
    assert.equal(merged.agents.voss, "sonnet");
    assert.equal(merged.agents.mori, "haiku");
  });
});
