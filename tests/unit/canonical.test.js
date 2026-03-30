"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { parseAgentDefinition, serializeAgentDefinition } = require("../../dist/formats/canonical");

const {
  ClaudeCodeAdapter,
  registerAdapter,
  getAdapter,
  getAdapters,
  getAdaptersForRuntimes,
} = require("../../dist/formats/adapters");

// ---------------------------------------------------------------------------
// Canonical schema parsing
// ---------------------------------------------------------------------------

describe("parseAgentDefinition", () => {
  it("parses a complete agent definition with all fields", () => {
    const content = [
      "---",
      "name: dev-team-voss",
      "description: Backend engineer.",
      "tools: Read, Edit, Write, Bash",
      "model: sonnet",
      "memory: project",
      "---",
      "",
      "You are Voss, a backend engineer.",
      "",
      "## Focus areas",
      "",
      "- APIs",
    ].join("\n");

    const def = parseAgentDefinition(content);

    assert.equal(def.name, "dev-team-voss");
    assert.equal(def.description, "Backend engineer.");
    assert.equal(def.tools, "Read, Edit, Write, Bash");
    assert.equal(def.model, "sonnet");
    assert.equal(def.memory, "project");
    assert.ok(def.body.includes("You are Voss"));
    assert.ok(def.body.includes("## Focus areas"));
  });

  it("parses a minimal definition with only required fields", () => {
    const content = [
      "---",
      "name: dev-team-test",
      "description: A test agent.",
      "---",
      "",
      "Body text.",
    ].join("\n");

    const def = parseAgentDefinition(content);

    assert.equal(def.name, "dev-team-test");
    assert.equal(def.description, "A test agent.");
    assert.equal(def.tools, undefined);
    assert.equal(def.model, undefined);
    assert.equal(def.memory, undefined);
    assert.ok(def.body.includes("Body text."));
  });

  it("throws on missing frontmatter", () => {
    assert.throws(() => parseAgentDefinition("No frontmatter here"), /missing YAML frontmatter/);
  });

  it("throws on missing name field", () => {
    const content = ["---", "description: No name.", "---", "", "Body."].join("\n");
    assert.throws(() => parseAgentDefinition(content), /missing required field 'name'/);
  });

  it("throws on missing description field", () => {
    const content = ["---", "name: dev-team-test", "---", "", "Body."].join("\n");
    assert.throws(() => parseAgentDefinition(content), /missing required field 'description'/);
  });

  it("handles descriptions containing colons", () => {
    const content = [
      "---",
      "name: dev-team-voss",
      "description: Backend engineer. Use for: API design, data modeling.",
      "---",
      "",
      "Body.",
    ].join("\n");

    const def = parseAgentDefinition(content);
    assert.equal(def.description, "Backend engineer. Use for: API design, data modeling.");
  });
});

// ---------------------------------------------------------------------------
// Serialization round-trip
// ---------------------------------------------------------------------------

describe("serializeAgentDefinition", () => {
  it("round-trips a complete definition", () => {
    const original = [
      "---",
      "name: dev-team-voss",
      "description: Backend engineer.",
      "tools: Read, Edit, Write, Bash",
      "model: sonnet",
      "memory: project",
      "---",
      "",
      "You are Voss.",
    ].join("\n");

    const def = parseAgentDefinition(original);
    const serialized = serializeAgentDefinition(def);
    const reparsed = parseAgentDefinition(serialized);

    assert.equal(reparsed.name, def.name);
    assert.equal(reparsed.description, def.description);
    assert.equal(reparsed.tools, def.tools);
    assert.equal(reparsed.model, def.model);
    assert.equal(reparsed.memory, def.memory);
    assert.equal(reparsed.body, def.body);
  });

  it("omits optional fields when undefined", () => {
    const def = {
      name: "dev-team-test",
      description: "A test agent.",
      body: "Body.\n",
    };

    const serialized = serializeAgentDefinition(def);
    assert.ok(!serialized.includes("tools:"));
    assert.ok(!serialized.includes("model:"));
    assert.ok(!serialized.includes("memory:"));
  });
});

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

describe("adapter registry", () => {
  it("has claude adapter registered by default", () => {
    const adapter = getAdapter("claude");
    assert.ok(adapter, "claude adapter should be registered");
    assert.equal(adapter.id, "claude");
    assert.equal(adapter.name, "Claude Code");
  });

  it("getAdapters returns all registered adapters", () => {
    const adapters = getAdapters();
    assert.ok(adapters.length >= 1, "should have at least one adapter");
    assert.ok(
      adapters.some((a) => a.id === "claude"),
      "should include claude adapter",
    );
  });

  it("getAdaptersForRuntimes returns requested adapters", () => {
    const adapters = getAdaptersForRuntimes(["claude"]);
    assert.equal(adapters.length, 1);
    assert.equal(adapters[0].id, "claude");
  });

  it("getAdaptersForRuntimes throws for unknown runtime", () => {
    assert.throws(
      () => getAdaptersForRuntimes(["nonexistent"]),
      /No adapter registered for runtime "nonexistent"/,
    );
  });

  it("registerAdapter replaces existing adapter", () => {
    const mockAdapter = {
      id: "test-runtime",
      name: "Test Runtime",
      generate() {},
      update() {
        return { updated: [], added: [] };
      },
    };

    registerAdapter(mockAdapter);
    const retrieved = getAdapter("test-runtime");
    assert.equal(retrieved.name, "Test Runtime");
  });
});

// ---------------------------------------------------------------------------
// Claude Code adapter (identity transform)
// ---------------------------------------------------------------------------

describe("ClaudeCodeAdapter", () => {
  it("has correct id and name", () => {
    const adapter = new ClaudeCodeAdapter();
    assert.equal(adapter.id, "claude");
    assert.equal(adapter.name, "Claude Code");
  });
});
