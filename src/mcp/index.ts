/**
 * MCP server entry point.
 *
 * Registers all enforcement tools and starts the stdio transport.
 */

import { registerTool, startServer } from "./server.js";
import { reviewGateTool, reviewGateHandler } from "./tools/review-gate.js";

export function startMcpServer(): void {
  // Register enforcement tools
  registerTool(reviewGateTool, reviewGateHandler);

  // Start the stdio transport
  startServer();
}
