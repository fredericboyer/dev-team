"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { safeRegex } = require("../../templates/hooks/lib/safe-regex");

describe("safeRegex", () => {
  it("accepts a simple valid pattern", () => {
    const result = safeRegex("foo.*bar");
    assert.equal(result.safe, true);
    assert.ok(result.regex instanceof RegExp);
  });

  it("accepts a character class pattern", () => {
    const result = safeRegex("[a-z]+\\d{2,4}");
    assert.equal(result.safe, true);
  });

  it("rejects nested quantifiers (.*)+", () => {
    const result = safeRegex("(.*)+");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("nested quantifiers"));
  });

  it("rejects nested quantifiers (.+)*", () => {
    const result = safeRegex("(.+)*");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("nested quantifiers"));
  });

  it("rejects nested quantifiers (a*)*", () => {
    const result = safeRegex("(a*)*");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("nested quantifiers"));
  });

  it("rejects quantified backreference", () => {
    const result = safeRegex("(a)\\1+");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("backreference"));
  });

  it("rejects patterns exceeding length limit", () => {
    const result = safeRegex("a".repeat(1025));
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("1024"));
  });

  it("accepts patterns at the length limit", () => {
    const result = safeRegex("a".repeat(1024));
    assert.equal(result.safe, true);
  });

  it("rejects empty string", () => {
    const result = safeRegex("");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("non-empty"));
  });

  it("rejects non-string input", () => {
    const result = safeRegex(null);
    assert.equal(result.safe, false);
  });

  it("rejects invalid regex syntax", () => {
    const result = safeRegex("[unclosed");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("invalid regex"));
  });
});
