"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  registerTool,
  getRegisteredTools,
  getToolHandler,
  handleRequest,
} = require("../../dist/mcp/server");

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(method, params, id) {
  return { jsonrpc: "2.0", method, params: params || {}, id: id ?? 1 };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("MCP server — protocol handling", () => {
  describe("initialize", () => {
    it("returns protocol version, capabilities, and server info", async () => {
      const response = await handleRequest(makeRequest("initialize"));
      assert.equal(response.jsonrpc, "2.0");
      assert.equal(response.id, 1);
      assert.ok(response.result);
      assert.equal(response.result.protocolVersion, "2024-11-05");
      assert.ok(response.result.capabilities);
      assert.ok(response.result.capabilities.tools);
      assert.equal(response.result.serverInfo.name, "dev-team");
      assert.ok(response.result.serverInfo.version);
    });
  });

  describe("notifications/initialized", () => {
    it("returns null (no response for notifications)", async () => {
      const response = await handleRequest(makeRequest("notifications/initialized", {}, undefined));
      assert.equal(response, null);
    });
  });

  describe("tools/list", () => {
    it("returns registered tools", async () => {
      // Register a test tool
      registerTool(
        {
          name: "test_tool",
          description: "A test tool",
          inputSchema: { type: "object", properties: {}, required: [] },
        },
        async () => ({ ok: true }),
      );

      const response = await handleRequest(makeRequest("tools/list"));
      assert.equal(response.jsonrpc, "2.0");
      assert.ok(response.result);
      assert.ok(Array.isArray(response.result.tools));
      const testTool = response.result.tools.find((t) => t.name === "test_tool");
      assert.ok(testTool, "test_tool should be in the list");
      assert.equal(testTool.description, "A test tool");
    });
  });

  describe("tools/call", () => {
    it("calls registered tool and returns content", async () => {
      registerTool(
        {
          name: "echo_tool",
          description: "Echoes input",
          inputSchema: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
        async (args) => ({ echoed: args.message }),
      );

      const response = await handleRequest(
        makeRequest("tools/call", { name: "echo_tool", arguments: { message: "hello" } }),
      );
      assert.equal(response.jsonrpc, "2.0");
      assert.ok(response.result);
      assert.ok(Array.isArray(response.result.content));
      assert.equal(response.result.content[0].type, "text");
      const parsed = JSON.parse(response.result.content[0].text);
      assert.equal(parsed.echoed, "hello");
    });

    it("returns error for unknown tool", async () => {
      const response = await handleRequest(makeRequest("tools/call", { name: "nonexistent_tool" }));
      assert.ok(response.error);
      assert.equal(response.error.code, -32602);
      assert.ok(response.error.message.includes("nonexistent_tool"));
    });

    it("returns error when tool name is missing", async () => {
      const response = await handleRequest(makeRequest("tools/call", {}));
      assert.ok(response.error);
      assert.equal(response.error.code, -32602);
    });

    it("wraps tool errors in isError response", async () => {
      registerTool(
        {
          name: "failing_tool",
          description: "Always fails",
          inputSchema: { type: "object", properties: {} },
        },
        async () => {
          throw new Error("intentional failure");
        },
      );

      const response = await handleRequest(
        makeRequest("tools/call", { name: "failing_tool", arguments: {} }),
      );
      assert.ok(response.result);
      assert.equal(response.result.isError, true);
      const parsed = JSON.parse(response.result.content[0].text);
      assert.equal(parsed.error, "intentional failure");
    });
  });

  describe("unknown method", () => {
    it("returns method not found error for requests with id", async () => {
      const response = await handleRequest(makeRequest("unknown/method", {}, 42));
      assert.ok(response.error);
      assert.equal(response.error.code, -32601);
      assert.ok(response.error.message.includes("unknown/method"));
    });

    it("returns null for notifications (no id)", async () => {
      const response = await handleRequest({
        jsonrpc: "2.0",
        method: "unknown/notification",
      });
      assert.equal(response, null);
    });
  });
});

describe("MCP server — tool registry", () => {
  it("getRegisteredTools returns all registered tools", () => {
    const tools = getRegisteredTools();
    assert.ok(Array.isArray(tools));
    // Should include tools registered in earlier tests
    assert.ok(tools.length > 0);
  });

  it("getToolHandler returns handler for registered tool", () => {
    registerTool(
      {
        name: "registry_test",
        description: "Registry test",
        inputSchema: { type: "object", properties: {} },
      },
      async () => ({ found: true }),
    );
    const handler = getToolHandler("registry_test");
    assert.ok(handler);
    assert.equal(typeof handler, "function");
  });

  it("getToolHandler returns undefined for unregistered tool", () => {
    const handler = getToolHandler("does_not_exist");
    assert.equal(handler, undefined);
  });
});
