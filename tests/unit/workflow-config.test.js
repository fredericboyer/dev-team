"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const LIB_PATH = path.join(
  __dirname,
  "..",
  "..",
  "templates",
  "hooks",
  "lib",
  "workflow-config.js",
);

/**
 * Helper: create a temp directory with an optional .dev-team/config.json,
 * then require the module fresh with cwd set to that directory.
 */
function loadWithConfig(configContent) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-config-test-"));
  const devTeamDir = path.join(tmpDir, ".dev-team");
  fs.mkdirSync(devTeamDir, { recursive: true });

  if (configContent !== undefined) {
    fs.writeFileSync(path.join(devTeamDir, "config.json"), configContent);
  }

  // Clear require cache so module reloads fresh
  delete require.cache[require.resolve(LIB_PATH)];

  const origCwd = process.cwd();
  process.chdir(tmpDir);

  const mod = require(LIB_PATH);
  // Reset cache so next test gets a fresh load
  mod._resetCache();

  return {
    mod,
    tmpDir,
    cleanup: () => {
      process.chdir(origCwd);
      mod._resetCache();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

describe("workflow-config", () => {
  describe("isEnabled", () => {
    it("returns true when config file is missing", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-config-test-"));
      delete require.cache[require.resolve(LIB_PATH)];
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      const mod = require(LIB_PATH);
      mod._resetCache();

      assert.equal(mod.isEnabled("review"), true);
      assert.equal(mod.isEnabled("learn"), true);

      process.chdir(origCwd);
      mod._resetCache();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns true when config exists but has no workflow section", () => {
      const { mod, cleanup } = loadWithConfig(JSON.stringify({ reviewThresholds: { light: 5 } }));
      try {
        assert.equal(mod.isEnabled("review"), true);
        assert.equal(mod.isEnabled("learn"), true);
      } finally {
        cleanup();
      }
    });

    it("returns true when workflow section exists but key is missing", () => {
      const { mod, cleanup } = loadWithConfig(JSON.stringify({ workflow: { review: true } }));
      try {
        assert.equal(mod.isEnabled("learn"), true);
      } finally {
        cleanup();
      }
    });

    it("returns true when key is explicitly true", () => {
      const { mod, cleanup } = loadWithConfig(
        JSON.stringify({ workflow: { review: true, learn: true } }),
      );
      try {
        assert.equal(mod.isEnabled("review"), true);
        assert.equal(mod.isEnabled("learn"), true);
      } finally {
        cleanup();
      }
    });

    it("returns false when key is explicitly false", () => {
      const { mod, cleanup } = loadWithConfig(JSON.stringify({ workflow: { review: false } }));
      try {
        assert.equal(mod.isEnabled("review"), false);
      } finally {
        cleanup();
      }
    });

    it("returns true for non-boolean falsy values (safe default)", () => {
      const { mod, cleanup } = loadWithConfig(
        JSON.stringify({ workflow: { review: 0, learn: null } }),
      );
      try {
        // Only explicit `false` disables — 0, null, "", undefined all default to enabled
        assert.equal(mod.isEnabled("review"), true);
        assert.equal(mod.isEnabled("learn"), true);
      } finally {
        cleanup();
      }
    });

    it("returns true when config is malformed JSON", () => {
      const { mod, cleanup } = loadWithConfig("not valid json{{{");
      try {
        assert.equal(mod.isEnabled("review"), true);
      } finally {
        cleanup();
      }
    });

    it("returns true when config is an array (not object)", () => {
      const { mod, cleanup } = loadWithConfig(JSON.stringify([1, 2, 3]));
      try {
        assert.equal(mod.isEnabled("review"), true);
      } finally {
        cleanup();
      }
    });

    it("returns true when workflow is an array (not object)", () => {
      const { mod, cleanup } = loadWithConfig(JSON.stringify({ workflow: [1, 2] }));
      try {
        assert.equal(mod.isEnabled("review"), true);
      } finally {
        cleanup();
      }
    });

    it("caches the config across calls", () => {
      const { mod, cleanup } = loadWithConfig(
        JSON.stringify({ workflow: { review: false, learn: true } }),
      );
      try {
        assert.equal(mod.isEnabled("review"), false);
        assert.equal(mod.isEnabled("learn"), true);
        // Both calls should use cached data (no re-read)
        assert.equal(mod.isEnabled("review"), false);
      } finally {
        cleanup();
      }
    });

    it("rejects symlinked config files (returns true / enforce)", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-config-test-"));
      const devTeamDir = path.join(tmpDir, ".dev-team");
      fs.mkdirSync(devTeamDir, { recursive: true });

      // Create a real config elsewhere and symlink to it
      const realConfig = path.join(tmpDir, "real-config.json");
      fs.writeFileSync(realConfig, JSON.stringify({ workflow: { review: false } }));
      fs.symlinkSync(realConfig, path.join(devTeamDir, "config.json"));

      delete require.cache[require.resolve(LIB_PATH)];
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      const mod = require(LIB_PATH);
      mod._resetCache();

      // Symlink should be rejected — defaults to enabled
      assert.equal(mod.isEnabled("review"), true);

      process.chdir(origCwd);
      mod._resetCache();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
