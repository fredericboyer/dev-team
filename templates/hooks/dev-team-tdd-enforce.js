#!/usr/bin/env node

/**
 * dev-team-tdd-enforce.js
 * PostToolUse hook on Edit/Write.
 *
 * Blocks implementation file changes unless:
 * - A corresponding test file has been modified in the current session, OR
 * - A corresponding test file already exists (allows refactoring)
 *
 * Also searches top-level tests/ directory for matching test files.
 *
 * New implementation files with no existing tests are blocked.
 * Exit 2 = block, exit 0 = allow.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const { cachedGitDiff } = require("./lib/git-cache");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch (err) {
  console.error(
    `[dev-team tdd-enforce] BLOCKED: Failed to parse hook input. Blocking for safety. ${err.message}`,
  );
  process.exit(2);
}
let filePath = (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || "";
filePath = filePath.split("\\").join("/");

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
const TEST_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /_test\./,
  /\/test_[^/]+$/,
  /\/__tests__\//,
  /\/test\//,
  /\/tests\//,
];

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

// Check if a corresponding test file has been modified in this session.
// Only tests that match the implementation file's name are accepted —
// unrelated test changes do NOT exempt arbitrary implementation files.
let changedFiles = "";
try {
  changedFiles = cachedGitDiff(["diff", "--name-only"], 2000);
} catch {
  // If git is not available or fails, allow the change
  process.exit(0);
}

const dir = path.dirname(filePath);
const name = path.basename(filePath, ext);

/**
 * Check whether a file path looks like a test file for the given implementation name.
 * Matches: name.test.*, name.spec.*, name_test.*, test_name.*, nameTest.*
 */
function isCorrespondingTest(testPath, implName) {
  const testBase = path.basename(testPath, path.extname(testPath));
  return (
    testBase === `${implName}.test` ||
    testBase === `${implName}.spec` ||
    testBase === `${implName}_test` ||
    testBase === `test_${implName}` ||
    testBase === `${implName}Test`
  );
}

const changedTestFiles = changedFiles
  .split("\n")
  .filter(Boolean)
  .map((f) => f.split("\\").join("/"))
  .filter((f) => TEST_PATTERNS.some((p) => p.test(f)));

const hasCorrespondingTestChanges = changedTestFiles.some((f) => isCorrespondingTest(f, name));

if (hasCorrespondingTestChanges) {
  // A corresponding test was modified in this session — allow
  process.exit(0);
}

// No corresponding test changes — check if a corresponding test file already exists.
// This allows refactoring (modifying existing tested code) without
// requiring the test file to also be modified.

// Find the project root (git root) for top-level tests/ lookup
let projectRoot = "";
try {
  projectRoot = require("child_process")
    .execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8", timeout: 2000 })
    .trim();
} catch {
  projectRoot = "";
}

// Language-aware candidate test file patterns.
// Covers JS/TS (.test, .spec, __tests__), Go (_test), Python (test_), and Java (Test suffix).
// For languages beyond these, the agent fallback message below delegates to agent knowledge.
const CANDIDATE_PATTERNS = [
  // JS/TS conventions
  path.join(dir, `${name}.test${ext}`),
  path.join(dir, `${name}.spec${ext}`),
  path.join(dir, "__tests__", `${name}${ext}`),
  path.join(dir, "__tests__", `${name}.test${ext}`),
  // Go convention: foo_test.go alongside foo.go
  path.join(dir, `${name}_test${ext}`),
  // Python convention: test_foo.py alongside foo.py
  path.join(dir, `test_${name}${ext}`),
  // Java convention: FooTest.java alongside Foo.java
  path.join(dir, `${name}Test${ext}`),
];

// Top-level tests/ directory — search for matching test files recursively
if (projectRoot) {
  const topTestsDir = path.join(projectRoot, "tests");
  try {
    if (fs.statSync(topTestsDir).isDirectory()) {
      const walkForTests = (dirPath) => {
        let entries;
        try {
          entries = fs.readdirSync(dirPath, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            walkForTests(fullPath);
          } else if (entry.isFile() && isCorrespondingTest(fullPath, name)) {
            CANDIDATE_PATTERNS.push(fullPath);
          }
        }
      };
      walkForTests(topTestsDir);
    }
  } catch {
    // No top-level tests/ directory — fine
  }
}

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

// No test changes AND no existing test file — block.
// The message delegates language-specific test discovery to the agent.
console.error(
  `[dev-team tdd-enforce] TDD violation: "${basename}" modified but no corresponding test file found. ` +
    `If no candidate test file matches the patterns above, use your knowledge of this language's test conventions to locate or create the appropriate test file. Write tests first.`,
);
process.exit(2);
