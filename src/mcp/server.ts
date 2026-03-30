/**
 * MCP enforcement server — JSON-RPC 2.0 over stdio.
 *
 * Implements the Model Context Protocol (MCP) to expose dev-team
 * enforcement checks as portable tools. Zero dependencies — uses
 * only Node.js built-ins (readline, process.stdout).
 *
 * See ADR-037 for design rationale.
 */

import * as readline from "readline";
import type { McpTool, McpToolHandler, JsonRpcRequest, JsonRpcResponse } from "./types.js";
import { getPackageVersion } from "../files.js";

// ─── Tool registry ──────────────────────────────────────────────────────────

const tools: Map<string, McpTool> = new Map();
const handlers: Map<string, McpToolHandler> = new Map();

export function registerTool(tool: McpTool, handler: McpToolHandler): void {
  tools.set(tool.name, tool);
  handlers.set(tool.name, handler);
}

export function getRegisteredTools(): McpTool[] {
  return Array.from(tools.values());
}

export function getToolHandler(name: string): McpToolHandler | undefined {
  return handlers.get(name);
}

// ─── JSON-RPC helpers ───────────────────────────────────────────────────────

function makeResponse(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function makeError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// ─── MCP protocol handlers ──────────────────────────────────────────────────

const SERVER_INFO = {
  name: "dev-team",
  version: getPackageVersion(),
};

const SERVER_CAPABILITIES = {
  tools: {},
};

function handleInitialize(id: string | number | null): JsonRpcResponse {
  return makeResponse(id, {
    protocolVersion: "2024-11-05",
    capabilities: SERVER_CAPABILITIES,
    serverInfo: SERVER_INFO,
  });
}

function handleToolsList(id: string | number | null): JsonRpcResponse {
  const toolDefs = getRegisteredTools().map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  return makeResponse(id, { tools: toolDefs });
}

async function handleToolsCall(
  id: string | number | null,
  params: { name?: string; arguments?: Record<string, unknown> },
): Promise<JsonRpcResponse> {
  const toolName = params.name;
  if (!toolName) {
    return makeError(id, -32602, "Missing tool name");
  }

  const handler = getToolHandler(toolName);
  if (!handler) {
    return makeError(id, -32602, `Unknown tool: ${toolName}`);
  }

  try {
    const result = await handler(params.arguments || {});
    return makeResponse(id, {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeResponse(id, {
      content: [{ type: "text", text: JSON.stringify({ error: message }) }],
      isError: true,
    });
  }
}

// ─── Request dispatch ───────────────────────────────────────────────────────

export async function handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const { method, id, params } = request;

  switch (method) {
    case "initialize":
      return handleInitialize(id ?? null);

    case "notifications/initialized":
      // Client acknowledgment — no response needed
      return null;

    case "tools/list":
      return handleToolsList(id ?? null);

    case "tools/call":
      return handleToolsCall(id ?? null, params || {});

    default:
      // Unknown method — return error if it has an id (is a request, not notification)
      if (id !== undefined && id !== null) {
        return makeError(id, -32601, `Method not found: ${method}`);
      }
      return null;
  }
}

// ─── Stdio transport ────────────────────────────────────────────────────────

function sendResponse(response: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(response) + "\n");
}

export function startServer(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", async (line: string) => {
    if (!line.trim()) return;

    let request: JsonRpcRequest;
    try {
      request = JSON.parse(line);
    } catch {
      sendResponse(makeError(null, -32700, "Parse error"));
      return;
    }

    if (request.jsonrpc !== "2.0") {
      sendResponse(makeError(request.id ?? null, -32600, "Invalid Request: must be JSON-RPC 2.0"));
      return;
    }

    const response = await handleRequest(request);
    if (response !== null) {
      sendResponse(response);
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });
}
