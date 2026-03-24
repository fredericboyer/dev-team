#!/usr/bin/env node

/**
 * dev-team-pre-commit-gate.js
 * TaskCompleted hook.
 *
 * When a task completes, checks whether memory files need updating.
 * Advisory (exit 0) — reminds but does not block.
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

// Memory freshness check (advisory only)
const reminders = [];

const hasImplFiles = files.some(
  (f) => /\.(js|ts|jsx|tsx|py|rb|go|java|rs)$/.test(f) && !/\.(test|spec)\./.test(f),
);

const hasMemoryUpdates = files.some(
  (f) => f.endsWith("learnings.md") || /agent-memory\/.*MEMORY\.md$/.test(f),
);

if (hasImplFiles && !hasMemoryUpdates) {
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
    reminders.push(
      "Memory files were updated but not staged — run `git add .dev-team/learnings.md .dev-team/agent-memory/` if learnings should be included",
    );
  } else {
    reminders.push(
      "Update .dev-team/learnings.md or agent memory with any patterns, conventions, or decisions from this work",
    );
  }
}

if (reminders.length > 0) {
  console.log(`[dev-team pre-commit] Before committing, consider: ${reminders.join("; ")}`);
}

process.exit(0);
