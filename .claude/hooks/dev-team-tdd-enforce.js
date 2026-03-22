#!/usr/bin/env node

/**
 * dev-team-tdd-enforce.js
 * PostToolUse hook on Edit/Write.
 *
 * Blocks implementation file changes unless:
 * - A test file has been modified in the current session, OR
 * - A corresponding test file already exists (allows refactoring)
 *
 * New implementation files with no existing tests are blocked.
 * Exit 2 = block, exit 0 = allow.
 */

"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch (err) {
  console.warn(`[dev-team tdd-enforce] Warning: Failed to parse hook input, allowing operation. ${err.message}`);
  process.exit(0);
}
const filePath = (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || "";

if (!filePath) {
  process.exit(0);
}

const basename = path.basename(filePath);
const ext = path.extname(filePath);

// Skip non-code files
const SKIP_EXTENSIONS = [
  ".md",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".txt",
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".gif",
  ".ico",
  ".lock",
];
if (SKIP_EXTENSIONS.includes(ext)) {
  process.exit(0);
}

// Skip if the file IS a test file
const TEST_PATTERNS = [/\.test\./, /\.spec\./, /_test\./, /\/__tests__\//, /\/test\//, /\/tests\//];

if (TEST_PATTERNS.some((p) => p.test(filePath))) {
  process.exit(0);
}

// Skip config and non-implementation files
const SKIP_PATTERNS = [
  /\/config\//,
  /\.config\./,
  /\.env/,
  /Dockerfile/,
  /docker-compose/,
  /\.github\//,
  /\.claude\//,
  /node_modules\//,
];

if (SKIP_PATTERNS.some((p) => p.test(filePath))) {
  process.exit(0);
}

// Check if any test file has been modified in this session
let changedFiles = "";
try {
  changedFiles = execFileSync("git", ["diff", "--name-only"], {
    encoding: "utf-8",
    timeout: 5000,
  });
} catch {
  // If git is not available or fails, allow the change
  process.exit(0);
}

const hasTestChanges = changedFiles
  .split("\n")
  .filter(Boolean)
  .some((f) => TEST_PATTERNS.some((p) => p.test(f)));

if (hasTestChanges) {
  // Tests were modified in this session — allow
  process.exit(0);
}

// No test changes — check if a corresponding test file already exists.
// This allows refactoring (modifying existing tested code) without
// requiring the test file to also be modified.
const fs = require("fs");
const dir = path.dirname(filePath);
const name = path.basename(filePath, ext);

const CANDIDATE_PATTERNS = [
  path.join(dir, `${name}.test${ext}`),
  path.join(dir, `${name}.spec${ext}`),
  path.join(dir, "__tests__", `${name}${ext}`),
  path.join(dir, "__tests__", `${name}.test${ext}`),
];

const hasExistingTests = CANDIDATE_PATTERNS.some((candidate) => {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
});

if (hasExistingTests) {
  // Existing tests cover this file — allow refactoring
  process.exit(0);
}

// No test changes AND no existing test file — block
console.error(
  `[dev-team tdd-enforce] TDD violation: "${basename}" modified but no corresponding test file exists. Write tests first.`,
);
process.exit(2);
