#!/usr/bin/env node

/**
 * lint-format.js
 * PostToolUse hook on Edit/Write.
 *
 * Runs oxlint and oxfmt --write on the modified file.
 * Advisory only — always exits 0.
 */

"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
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

const oxlintBin = path.resolve("node_modules/.bin/oxlint");
const oxfmtBin = path.resolve("node_modules/.bin/oxfmt");

if (fs.existsSync(oxlintBin)) {
  try {
    execFileSync(oxlintBin, [filePath], { encoding: "utf-8", timeout: 10000, stdio: "pipe" });
  } catch (err) {
    if (err.stdout) process.stdout.write(err.stdout);
  }
}

if (fs.existsSync(oxfmtBin)) {
  try {
    execFileSync(oxfmtBin, ["--write", filePath], {
      encoding: "utf-8",
      timeout: 10000,
      stdio: "pipe",
    });
  } catch {
    // oxfmt failure is non-blocking
  }
}

process.exit(0);
