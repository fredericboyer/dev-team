"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { renderAgentToml } = require("../../dist/adapters/codex");

/**
 * Dedicated tests for TOML escaping edge cases in the Codex adapter.
 *
 * escapeTomlString and escapeTomlMultiline are module-private, so we
 * exercise them indirectly through renderAgentToml — name/description
 * go through escapeTomlString, body goes through escapeTomlMultiline.
 */

function makeDef(overrides) {
  return { name: "test-agent", description: "A test agent.", body: "body", ...overrides };
}

// --- escapeTomlString (exercised via name / description fields) ---

describe("escapeTomlString via renderAgentToml", () => {
  it("escapes backslashes in name and description", () => {
    const toml = renderAgentToml(
      makeDef({
        name: "path\\to\\agent",
        description: "uses C:\\Windows\\System32",
      }),
    );
    assert.ok(toml.includes('name = "path\\\\to\\\\agent"'), "backslashes in name");
    assert.ok(
      toml.includes('description = "uses C:\\\\Windows\\\\System32"'),
      "backslashes in description",
    );
  });

  it("escapes double quotes in name and description", () => {
    const toml = renderAgentToml(
      makeDef({
        name: 'say "hello"',
        description: 'the "best" agent',
      }),
    );
    assert.ok(toml.includes('name = "say \\"hello\\""'), "quotes in name");
    assert.ok(toml.includes('description = "the \\"best\\" agent"'), "quotes in description");
  });

  it("escapes newlines in description", () => {
    const toml = renderAgentToml(
      makeDef({
        description: "line one\nline two",
      }),
    );
    assert.ok(toml.includes('description = "line one\\nline two"'), "newline escaped");
  });

  it("escapes backslash followed by quote", () => {
    const toml = renderAgentToml(
      makeDef({
        description: 'end with \\"',
      }),
    );
    // \ becomes \\, " becomes \" → result: \\\\"
    assert.ok(toml.includes('description = "end with \\\\\\""'), "backslash-quote combo");
  });

  it("handles empty name and description", () => {
    const toml = renderAgentToml(makeDef({ name: "", description: "" }));
    assert.ok(toml.includes('name = ""'), "empty name");
    assert.ok(toml.includes('description = ""'), "empty description");
  });

  it("handles strings with only special characters", () => {
    const toml = renderAgentToml(
      makeDef({
        name: '\\\n"',
        description: '"\n\\',
      }),
    );
    assert.ok(toml.includes('name = "\\\\\\n\\""'), "only special chars in name");
    assert.ok(toml.includes('description = "\\"\\n\\\\"'), "only special chars in description");
  });

  it("escapes in model field", () => {
    const toml = renderAgentToml(makeDef({ model: 'gpt-4\\turbo "v2"' }));
    assert.ok(toml.includes('model = "gpt-4\\\\turbo \\"v2\\""'), "model field escaped");
  });
});

// --- escapeTomlMultiline (exercised via body field) ---

describe("escapeTomlMultiline via renderAgentToml body", () => {
  it("escapes backslashes in body", () => {
    const toml = renderAgentToml(makeDef({ body: "path\\to\\file" }));
    assert.ok(toml.includes("path\\\\to\\\\file"), "backslashes in body");
  });

  it("preserves literal newlines in body (multiline string)", () => {
    const toml = renderAgentToml(makeDef({ body: "line one\nline two" }));
    // In TOML multiline strings, actual newlines are preserved (not escaped)
    assert.ok(toml.includes("line one\nline two"), "newlines preserved in multiline");
  });

  it("escapes triple quotes in body", () => {
    const toml = renderAgentToml(makeDef({ body: 'before """inside""" after' }));
    // """ becomes ""\\" to break the triple-quote sequence
    assert.ok(!toml.includes('""""'), "no raw quadruple quotes");
    // The escaped output should still be parseable — no unmatched triple quotes
    const lines = toml.split("\n");
    const instrLine = lines.findIndex((l) => l.startsWith("developer_instructions"));
    assert.ok(instrLine >= 0, "developer_instructions found");
  });

  it("escapes body with only backslashes", () => {
    const toml = renderAgentToml(makeDef({ body: "\\\\\\" }));
    assert.ok(toml.includes("\\\\\\\\\\\\"), "all backslashes doubled");
  });

  it("handles empty body", () => {
    const toml = renderAgentToml(makeDef({ body: "" }));
    assert.ok(toml.includes('developer_instructions = """'), "empty body renders");
  });

  it("handles body with triple quotes at boundaries", () => {
    const toml = renderAgentToml(makeDef({ body: '"""start' }));
    // Should not produce invalid TOML (unmatched triple quotes)
    assert.ok(!toml.match(/"""{2,}/), "no excessive quote sequences at start");
  });

  it("handles body with mixed special characters", () => {
    const toml = renderAgentToml(
      makeDef({
        body: 'Use C:\\path and """ and \\ end',
      }),
    );
    assert.ok(toml.includes("C:\\\\path"), "backslash escaped in mixed body");
    assert.ok(toml.includes("\\\\"), "trailing backslash escaped");
  });
});
