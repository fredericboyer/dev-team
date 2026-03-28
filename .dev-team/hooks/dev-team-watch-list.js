#!/usr/bin/env node

/**
 * dev-team-watch-list.js
 * PostToolUse hook on Edit/Write.
 *
 * Reads configurable file-pattern-to-agent mappings from .dev-team/config.json
 * and outputs structured spawn recommendations when patterns match.
 * Advisory only — always exits 0.
 *
 * Config format in config.json:
 * {
 *   "watchLists": [
 *     { "pattern": "src/db/", "agents": ["dev-team-codd"], "reason": "database code changed" },
 *     { "pattern": "\\.graphql$", "agents": ["dev-team-mori", "dev-team-voss"], "reason": "API schema changed" }
 *   ]
 * }
 */

"use strict";

const fs = require("fs");
const path = require("path");

const { safeRegex } = require("./lib/safe-regex");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch (err) {
  console.warn(
    `[dev-team watch-list] Warning: Failed to parse hook input, allowing operation. ${err.message}`,
  );
  process.exit(0);
}

let filePath = (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || "";
filePath = filePath.split("\\").join("/");

if (!filePath) {
  process.exit(0);
}

// Read watch list config
let watchLists = [];
try {
  const prefsPath = path.join(process.cwd(), ".dev-team", "config.json");
  const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
  watchLists = prefs.watchLists || [];
} catch {
  // No config or invalid — skip silently
  process.exit(0);
}

if (watchLists.length === 0) {
  process.exit(0);
}

const matches = [];

for (const entry of watchLists) {
  if (!entry.pattern || !entry.agents) continue;

  try {
    const result = safeRegex(entry.pattern);
    if (!result.safe) {
      console.warn(
        `[dev-team watch-list] Skipping unsafe pattern "${entry.pattern}": ${result.reason}`,
      );
      continue;
    }
    if (result.regex.test(filePath)) {
      for (const agent of entry.agents) {
        if (!matches.some((m) => m.agent === agent)) {
          matches.push({
            agent,
            reason: entry.reason || `file matched pattern: ${entry.pattern}`,
          });
        }
      }
    }
  } catch {
    // Invalid regex — skip this entry
    continue;
  }
}

if (matches.length > 0) {
  const agentList = matches.map((m) => `@${m.agent} (${m.reason})`).join(", ");
  console.log(`[dev-team watch-list] Spawn recommended: ${agentList}`);
}

process.exit(0);
