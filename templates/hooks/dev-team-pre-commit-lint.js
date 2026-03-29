#!/usr/bin/env node

/**
 * dev-team-pre-commit-lint.js
 * PreToolUse hook on Bash.
 *
 * Detects `git commit` commands and runs lint + format checks before
 * allowing the commit. Blocks (exit 2) if either check fails.
 * Skips if no lint/format tooling is configured.
 *
 * Auto-detects commands from package.json scripts.
 */

"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  // Not a blocking safety hook — fail open on parse error
  process.exit(0);
}

const command = (input.tool_input && input.tool_input.command) || "";

// Only intercept git commit commands
if (!/\bgit\s+commit\b/.test(command)) {
  process.exit(0);
}

// Skip if --no-verify is explicitly requested (user override)
// Anchored to avoid matching inside commit messages
if (/\bgit\s+commit\b.*\s--no-verify\b/.test(command)) {
  process.exit(0);
}

// Auto-detect lint and format commands from package.json
let checks = [];

try {
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const scripts = pkg.scripts || {};

  if (scripts["lint"]) {
    checks.push({ name: "lint", args: ["run", "lint"] });
  }

  // Prefer format:check over format (check is non-destructive)
  if (scripts["format:check"]) {
    checks.push({ name: "format", args: ["run", "format:check"] });
  }
} catch {
  // No package.json or invalid — check for other tooling
}

// Check for pyproject.toml based tooling (ruff)
if (checks.length === 0) {
  try {
    const pyproject = path.join(process.cwd(), "pyproject.toml");
    if (fs.existsSync(pyproject)) {
      const content = fs.readFileSync(pyproject, "utf-8");
      if (content.includes("ruff")) {
        checks.push({ name: "lint", args: ["check", "."], bin: "ruff" });
        checks.push({ name: "format", args: ["format", "--check", "."], bin: "ruff" });
      }
    }
  } catch {
    // Ignore
  }
}

// No tooling detected — allow commit
if (checks.length === 0) {
  process.exit(0);
}

const failures = [];

// On Windows, npm is a .cmd file — execFileSync needs shell: true to find it.
// SAFETY: shell: true is only safe here because all arguments are hardcoded
// constants (e.g. ["run", "lint"]). Never use shell: true with user-supplied input.
const isWindows = process.platform === "win32";

for (const check of checks) {
  const bin = check.bin || "npm";
  try {
    execFileSync(bin, check.args, {
      encoding: "utf-8",
      timeout: 30000,
      stdio: "pipe",
      shell: isWindows,
    });
  } catch (err) {
    failures.push({
      name: check.name,
      cmd: `${bin} ${check.args.join(" ")}`,
      output: ((err.stderr || "") + (err.stdout || "")).trim(),
    });
  }
}

if (failures.length === 0) {
  process.exit(0);
}

console.error("[dev-team pre-commit-lint] BLOCKED — checks failed before commit:\n");
for (const f of failures) {
  console.error(`  ${f.name} (${f.cmd}):`);
  const lines = f.output.split("\n").slice(0, 5);
  for (const line of lines) {
    console.error(`    ${line}`);
  }
  if (f.output.split("\n").length > 5) {
    console.error(`    ... (run \`${f.cmd}\` for full output)`);
  }
  console.error("");
}
console.error("Fix the issues above, then retry the commit.");
process.exit(2);
