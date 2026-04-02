"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const libDir = path.join(__dirname, "..", "..", "templates", "hooks", "lib");

describe("agent-patterns safeRegex integration", () => {
  it("loads all patterns from agent-patterns.json without errors", () => {
    delete require.cache[require.resolve(path.join(libDir, "agent-patterns"))];
    const { loadPatterns } = require(path.join(libDir, "agent-patterns"));
    const patterns = loadPatterns();
    assert.ok(Object.keys(patterns).length > 0, "should load at least one category");
  });

  it("all real patterns pass safeRegex validation", () => {
    const { safeRegex } = require(path.join(libDir, "safe-regex"));
    const jsonPath = path.join(__dirname, "..", "..", "templates", "hooks", "agent-patterns.json");
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    for (const [key, value] of Object.entries(data)) {
      const entries = value.patterns || (value.pattern ? [value.pattern] : []);
      for (const entry of entries) {
        const source = Array.isArray(entry) ? entry[0] : entry;
        const result = safeRegex(source);
        assert.ok(
          result.safe,
          "pattern " + source + " in " + key + " should be safe: " + result.reason,
        );
      }
    }
  });

  it("skips unsafe patterns in multi-pattern categories", () => {
    var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ap-test-"));
    var libTmpDir = path.join(tmpDir, "lib");
    fs.mkdirSync(libTmpDir);
    fs.copyFileSync(path.join(libDir, "safe-regex.js"), path.join(libTmpDir, "safe-regex.js"));
    fs.copyFileSync(
      path.join(libDir, "agent-patterns.js"),
      path.join(libTmpDir, "agent-patterns.js"),
    );
    var fakeData = { testCat: { agent: "test", label: "test", patterns: ["safe", "(.*)+"] } };
    fs.writeFileSync(path.join(tmpDir, "agent-patterns.json"), JSON.stringify(fakeData));
    var warnings = [];
    var origErr = console.error;
    console.error = function (m) {
      warnings.push(m);
    };
    try {
      var { loadPatterns } = require(path.join(libTmpDir, "agent-patterns"));
      var result = loadPatterns();
      assert.equal(result.testCat.compiled.length, 1, "unsafe pattern should be skipped");
      assert.ok(result.testCat.compiled[0].test("safe"));
      assert.ok(warnings.length > 0, "should log warning");
    } finally {
      console.error = origErr;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("skips unsafe single-pattern entries", () => {
    var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ap-test-"));
    var libTmpDir = path.join(tmpDir, "lib");
    fs.mkdirSync(libTmpDir);
    fs.copyFileSync(path.join(libDir, "safe-regex.js"), path.join(libTmpDir, "safe-regex.js"));
    fs.copyFileSync(
      path.join(libDir, "agent-patterns.js"),
      path.join(libTmpDir, "agent-patterns.js"),
    );
    var fakeData = { bad: { pattern: "(a+)+" }, good: { pattern: "\\.test\\." } };
    fs.writeFileSync(path.join(tmpDir, "agent-patterns.json"), JSON.stringify(fakeData));
    var warnings = [];
    var origErr = console.error;
    console.error = function (m) {
      warnings.push(m);
    };
    try {
      var { loadPatterns } = require(path.join(libTmpDir, "agent-patterns"));
      var result = loadPatterns();
      assert.equal(result.bad, undefined, "unsafe single pattern should be skipped");
      assert.ok(result.good, "safe single pattern should be loaded");
      assert.ok(warnings.length > 0, "should log warning");
    } finally {
      console.error = origErr;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
