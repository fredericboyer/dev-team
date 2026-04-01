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

  it("rejects identical alternatives with quantifier (a|a)+", () => {
    const result = safeRegex("(a|a)+");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("overlapping alternation"));
  });

  it("rejects prefix-overlapping alternatives (ab|ac|a)+", () => {
    const result = safeRegex("(ab|ac|a)+");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("overlapping alternation"));
  });

  it("rejects prefix-overlapping alternatives with * quantifier", () => {
    const result = safeRegex("(feat|fea|f)*");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("overlapping alternation"));
  });

  it("rejects prefix-overlapping alternatives with {n,} quantifier", () => {
    const result = safeRegex("(abc|ab){2,}");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("overlapping alternation"));
  });

  it("accepts non-overlapping alternation with quantifier (a|b)+", () => {
    const result = safeRegex("(a|b)+");
    assert.equal(result.safe, true);
  });

  it("accepts non-overlapping alternation (feat|fix)+", () => {
    const result = safeRegex("(feat|fix)+");
    assert.equal(result.safe, true);
  });

  it("accepts alternation without quantifier (a|a)", () => {
    const result = safeRegex("(a|a)");
    assert.equal(result.safe, true);
  });

  it("accepts pipe inside character class [a|b]+", () => {
    const result = safeRegex("[a|b]+");
    assert.equal(result.safe, true);
  });

  it("does not treat pipe in char class as alternation ([feat|fix])+", () => {
    const result = safeRegex("([feat|fix])+");
    assert.equal(result.safe, true);
  });

  it("rejects overlapping alternation in outer quantified group ((feat|fix|fea|fi|f)(t|x|eat|ix))*", () => {
    const result = safeRegex("((feat|fix|fea|fi|f)(t|x|eat|ix))*\\/");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("overlapping alternation"));
  });

  it("handles named groups (?<name>a|ab)+ correctly", () => {
    const result = safeRegex("(?<name>a|ab)+");
    assert.equal(result.safe, false);
    assert.ok(result.reason.includes("overlapping alternation"));
  });

  it("handles lookbehind (?<=x) without crashing", () => {
    const result = safeRegex("(?<=x)foo");
    assert.equal(result.safe, true);
  });

  it("handles negative lookbehind (?<!x) without crashing", () => {
    const result = safeRegex("(?<!x)bar");
    assert.equal(result.safe, true);
  });

  it("rejects the exact #623 branch pattern with nested quantified overlapping alternation", () => {
    const result = safeRegex("^((feat|fix|fea|fi|f)\\/)+");
    assert.equal(result.safe, false);
  });
});
