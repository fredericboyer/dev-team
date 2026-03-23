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

const { createHash } = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * Cached git diff — reads from a temp file if it was written < 5 seconds ago,
 * otherwise shells out to git and writes the result for subsequent hooks.
 * Cache key includes cwd hash so different repos don't share cache.
 */
function cachedGitDiff(args, timeoutMs) {
  const cwdHash = createHash("md5").update(process.cwd()).digest("hex").slice(0, 8);
  const argsKey = args.join("-").replace(/[^a-zA-Z0-9-]/g, "");
  const cacheFile = path.join(os.tmpdir(), `dev-team-git-cache-${cwdHash}-${argsKey}.txt`);
  let skipWrite = false;
  try {
    const stat = fs.lstatSync(cacheFile);
    // Reject symlinks to prevent symlink attacks (attacker could point cache
    // file at a sensitive path and have us overwrite it on the next write)
    if (stat.isSymbolicLink()) {
      try {
        fs.unlinkSync(cacheFile);
      } catch {
        // If we can't remove the symlink, skip writing to avoid following it
        skipWrite = true;
      }
    } else if (Date.now() - stat.mtimeMs < 5000) {
      return fs.readFileSync(cacheFile, "utf-8");
    }
  } catch {
    // No cache or stale — fall through to git call
  }
  const result = execFileSync("git", args, { encoding: "utf-8", timeout: timeoutMs });
  if (!skipWrite) {
    try {
      // Atomic write: write to a temp file then rename to close the TOCTOU window
      const tmpFile = `${cacheFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmpFile, result, { mode: 0o600 });
      fs.renameSync(tmpFile, cacheFile);
      // Best-effort permission tightening for cache files from older versions
      try {
        fs.chmodSync(cacheFile, 0o600);
      } catch {
        /* best effort */
      }
    } catch {
      // Best effort — don't fail the hook over caching
    }
  }
  return result;
}

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
  changedFiles = cachedGitDiff(["diff", "--name-only"], 2000);
} catch {
  // If git is not available or fails, allow the change
  process.exit(0);
}

const hasTestChanges = changedFiles
  .split("\n")
  .filter(Boolean)
  .map((f) => f.split("\\").join("/"))
  .some((f) => TEST_PATTERNS.some((p) => p.test(f)));

if (hasTestChanges) {
  // Tests were modified in this session — allow
  process.exit(0);
}

// No test changes — check if a corresponding test file already exists.
// This allows refactoring (modifying existing tested code) without
// requiring the test file to also be modified.
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
