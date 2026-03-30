#!/usr/bin/env node

/**
 * dev-team-safety-guard.js
 * PreToolUse hook on Bash.
 *
 * Best-effort heuristic that blocks obviously dangerous commands before
 * they execute. This is NOT a security boundary — the Claude Code sandbox
 * is the actual enforcement layer. This hook catches common foot-guns
 * (recursive deletes, force pushes) that the sandbox would allow but
 * that are almost never intentional.
 *
 * Exit 2 = block, exit 0 = allow.
 */

"use strict";

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch (err) {
  console.error(
    `[dev-team safety-guard] BLOCKED: Failed to parse hook input. Blocking for safety. ${err.message}`,
  );
  process.exit(2);
}
const command = (input.tool_input && input.tool_input.command) || "";

const BLOCKED_PATTERNS = [
  {
    pattern: /\brm\s+(-[^\s]*r[^\s]*|--recursive)\s+[^\s]*\s*\/\s*$/,
    reason: "Recursive delete on root path is blocked.",
  },
  {
    pattern: /\brm\s+(-[^\s]*r[^\s]*|--recursive)\s+.*~\//,
    reason: "Recursive delete on home directory is blocked.",
  },
  {
    pattern: /\bgit\s+push\s+.*--force\b.*\b(main|master)\b/,
    reason: "Force push to main/master is blocked. Use a PR instead.",
  },
  {
    pattern: /\bgit\s+push\s+.*\b(main|master)\b.*--force\b/,
    reason: "Force push to main/master is blocked. Use a PR instead.",
  },
  {
    pattern: /\bDROP\s+(TABLE|DATABASE)\b/i,
    reason: "DROP TABLE/DATABASE is blocked. Use a migration instead.",
  },
  {
    pattern: /\bchmod\s+777\b/,
    reason: "chmod 777 is blocked. Use specific permissions instead.",
  },
  {
    pattern: /\bcurl\b.*\|\s*(sh|bash|zsh)\b/,
    reason: "Piping curl to a shell is blocked. Download and inspect scripts before executing.",
  },
  {
    pattern: /\bwget\b.*\|\s*(sh|bash|zsh)\b/,
    reason: "Piping wget to a shell is blocked. Download and inspect scripts before executing.",
  },
];

for (const { pattern, reason } of BLOCKED_PATTERNS) {
  if (pattern.test(command)) {
    console.error(`[dev-team safety-guard] BLOCKED: ${reason}`);
    process.exit(2);
  }
}

process.exit(0);
