#!/usr/bin/env node

/**
 * dev-team-lint-format.js
 * PostToolUse hook on Edit/Write.
 *
 * Runs oxlint and oxfmt --write on the modified file.
 * Advisory only — always exits 0.
 */

"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

let input = {};
try {
  input = JSON.parse(require("fs").readFileSync(0, "utf-8"));
} catch {
  process.exit(0);
}

const filePath = (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || "";
if (!filePath) {
  process.exit(0);
}

const ext = path.extname(filePath);
const LINTABLE = [".js", ".ts", ".jsx", ".tsx"];
if (!LINTABLE.includes(ext)) {
  process.exit(0);
}

try {
  execFileSync("npx", ["oxlint", filePath], { encoding: "utf-8", timeout: 10000, stdio: "pipe" });
} catch (err) {
  if (err.stdout) process.stdout.write(err.stdout);
}

try {
  execFileSync("npx", ["oxfmt", "--write", filePath], {
    encoding: "utf-8",
    timeout: 10000,
    stdio: "pipe",
  });
} catch {
  // oxfmt failure is non-blocking
}

process.exit(0);
