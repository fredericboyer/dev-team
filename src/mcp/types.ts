/**
 * MCP server type definitions.
 *
 * These types cover the subset of JSON-RPC 2.0 and MCP protocol
 * needed for the dev-team enforcement server.
 */

// ─── JSON-RPC 2.0 ──────────────────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

// ─── MCP tool definitions ───────────────────────────────────────────────────

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type McpToolHandler = (args: Record<string, unknown>) => Promise<Record<string, unknown>>;

// ─── Review gate types ──────────────────────────────────────────────────────

export interface ReviewSidecar {
  agent: string;
  contentHash: string;
  reviewDepth?: "LIGHT" | "STANDARD" | "DEEP";
  findings?: Array<{
    classification: string;
    description: string;
    line?: number;
    resolved?: boolean;
  }>;
}

export interface ReviewGateResult {
  allowed: boolean;
  reason: string;
  missing?: Array<{ file: string; agent: string }>;
  unresolvedDefects?: Array<{
    file: string;
    agent: string;
    description: string;
  }>;
}
