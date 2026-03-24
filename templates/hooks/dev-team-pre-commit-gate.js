#!/usr/bin/env node

/**
 * dev-team-pre-commit-gate.js
 * Pre-commit hook — memory freshness gate.
 *
 * Runs before each commit. Checks whether memory files need updating.
 * Blocks (exit 1) when implementation files are staged without memory updates.
 * Override: create an empty `.dev-team/.memory-reviewed` file to acknowledge
 * that memory was reviewed and nothing needs updating.
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

let stagedFiles = "";
try {
  stagedFiles = cachedGitDiff(["diff", "--cached", "--name-only"], 2000);
} catch {
  // Not in a git repo or git not available
  process.exit(0);
}

const files = stagedFiles
  .split("\n")
  .filter(Boolean)
  .map((f) => f.split("\\").join("/"));

if (files.length === 0) {
  process.exit(0);
}

// Memory freshness check (blocking unless overridden)

const hasImplFiles = files.some(
  (f) => /\.(js|ts|jsx|tsx|py|rb|go|java|rs)$/.test(f) && !/\.(test|spec)\./.test(f),
);

const memoryFiles = files.filter(
  (f) => f.endsWith("learnings.md") || /agent-memory\/.*MEMORY\.md$/.test(f),
);

const hasMemoryUpdates = memoryFiles.length > 0;

/**
 * Check whether a memory file has substantive content beyond boilerplate.
 * Returns true if the file contains at least one non-empty, non-header,
 * non-boilerplate line.
 */
function hasSubstantiveContent(filePath) {
  try {
    const absPath = path.join(process.cwd(), filePath);
    // Reject symlinks to avoid reading unintended files
    const stat = fs.lstatSync(absPath);
    if (stat.isSymbolicLink()) return false;

    const content = fs.readFileSync(absPath, "utf-8");
    const lines = content.split("\n");
    const substantiveLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false; // empty line
      if (/^#+\s/.test(trimmed)) return false; // markdown header
      if (trimmed === "---") return false; // horizontal rule / frontmatter delimiter
      return true;
    });
    return substantiveLines.length > 0;
  } catch {
    return false; // file doesn't exist or can't be read — not substantive
  }
}

// If memory files are staged, verify they have substantive content
if (hasMemoryUpdates) {
  const allSubstantive = memoryFiles.every((f) => hasSubstantiveContent(f));
  if (!allSubstantive) {
    console.error(
      "[dev-team pre-commit] BLOCKED: Memory files were staged but contain only boilerplate (headers, empty lines). " +
        "Add substantive content — patterns, conventions, calibration notes, or decisions learned from this work.",
    );
    process.exit(1);
  }
}

if (hasImplFiles && !hasMemoryUpdates) {
  // Check for .memory-reviewed override marker
  const markerPath = path.join(process.cwd(), ".dev-team", ".memory-reviewed");
  let hasOverride = false;
  try {
    const stat = fs.lstatSync(markerPath);
    // Require regular file — reject symlinks, directories, FIFOs, etc.
    hasOverride = stat.isFile() && !stat.isSymbolicLink();
  } catch {
    // No marker file
  }

  if (hasOverride) {
    // Override acknowledged — clean up the marker file after this commit
    try {
      fs.unlinkSync(markerPath);
    } catch {
      // Best effort — don't fail the hook over cleanup
    }
    process.exit(0);
  }

  let unstagedMemory = false;
  try {
    const unstaged = cachedGitDiff(["diff", "--name-only"], 2000);
    unstagedMemory = unstaged
      .split("\n")
      .map((f) => f.split("\\").join("/"))
      .some((f) => f.endsWith("learnings.md") || /agent-memory\/.*MEMORY\.md$/.test(f));
  } catch {
    // Ignore — best effort
  }

  if (unstagedMemory) {
    console.error(
      "[dev-team pre-commit] BLOCKED: Memory files were updated but not staged. " +
        "Run `git add .dev-team/learnings.md .dev-team/agent-memory/` to include learnings, " +
        "or create an empty `.dev-team/.memory-reviewed` file to acknowledge that memory was reviewed.",
    );
  } else {
    console.error(
      "[dev-team pre-commit] BLOCKED: Implementation files staged without memory updates. " +
        "Update .dev-team/learnings.md or agent memory with any patterns, conventions, or decisions from this work. " +
        "If no learnings apply, create an empty `.dev-team/.memory-reviewed` file to acknowledge.",
    );
  }
  process.exit(1);
}

process.exit(0);
