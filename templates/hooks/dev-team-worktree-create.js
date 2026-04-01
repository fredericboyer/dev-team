#!/usr/bin/env node

/**
 * dev-team-worktree-create.js
 * WorktreeCreate hook — serializes git worktree creation to prevent races.
 *
 * WORKAROUND for upstream Claude Code bugs:
 *   - anthropics/claude-code#34645 — parallel git worktree add races on .git/config.lock
 *   - anthropics/claude-code#39680 — EEXIST on .claude/worktrees/ directory
 *
 * When multiple agents spawn with isolation: "worktree" simultaneously,
 * concurrent `git worktree add` commands race for .git/config.lock.
 * This hook serializes creation using a lockfile so only one worktree
 * is created at a time.
 *
 * Remove this hook when the upstream bugs are fixed.
 *
 * Input (argv[2] JSON): { base_path, worktree_name, branch_name }
 * Output (stdout): absolute path to created worktree
 * Exit 0 = success, non-zero = failure (stderr shown to user)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  process.stderr.write("[dev-team worktree-create] Failed to parse hook input\n");
  process.exit(1);
}

const projectRoot = process.cwd();
let basePath = input.base_path || projectRoot;

// Validate base_path: resolve to absolute, reject path traversal (fixes #617)
basePath = path.resolve(basePath);
// Resolve symlinks before checking containment
try {
  basePath = fs.realpathSync(basePath);
} catch {
  // Path doesn't exist yet — use resolved path
}
const realRoot = fs.realpathSync(projectRoot);
const rel = path.relative(realRoot, basePath);
if (
  basePath !== realRoot &&
  (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel))
) {
  process.stderr.write(
    `[dev-team worktree-create] base_path "${input.base_path}" resolves outside project root, falling back to cwd\n`,
  );
  basePath = projectRoot;
}

const worktreeName = input.worktree_name;
const branchName = input.branch_name;

if (!worktreeName) {
  process.stderr.write("[dev-team worktree-create] Missing worktree_name\n");
  process.exit(1);
}

// Validate basePath contains a .git directory before operating (fixes #537)
if (!fs.existsSync(path.join(basePath, ".git"))) {
  process.stderr.write("[dev-team worktree-create] basePath does not contain a .git directory\n");
  process.exit(1);
}

const worktreesDir = path.join(basePath, ".claude", "worktrees");
const worktreePath = path.join(worktreesDir, worktreeName);
const lockFile = path.join(basePath, ".git", "worktree-create.lock");

/**
 * Acquire an exclusive lock using mkdir (atomic on all platforms).
 * Retries with backoff up to ~10 seconds total.
 */
function acquireLock(lockPath, maxRetries = 20, baseDelayMs = 100) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.mkdirSync(lockPath);
      return true;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      // Check for stale lock (older than 60 seconds)
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > 60000) {
          fs.rmdirSync(lockPath);
          continue;
        }
      } catch {
        // Lock disappeared between check and remove — retry
        continue;
      }
      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(1.5, i) + Math.random() * 50;
      const start = Date.now();
      while (Date.now() - start < delay) {
        // busy-wait (no async in this sync hook)
      }
    }
  }
  return false;
}

function releaseLock(lockPath) {
  try {
    fs.rmdirSync(lockPath);
  } catch {
    // Best effort — stale lock will be cleaned up by timeout
  }
}

try {
  // Ensure worktrees directory exists (fixes anthropics/claude-code#39680)
  fs.mkdirSync(worktreesDir, { recursive: true });

  // Acquire lock to serialize worktree creation (fixes anthropics/claude-code#34645)
  if (!acquireLock(lockFile)) {
    process.stderr.write("[dev-team worktree-create] Timeout acquiring worktree creation lock\n");
    process.exit(1);
  }

  try {
    // Create the worktree (execFileSync avoids shell injection — inputs are from CC, not user)
    const args = ["worktree", "add"];
    if (branchName) {
      args.push("-b", branchName);
    }
    args.push(worktreePath);
    execFileSync("git", args, {
      cwd: basePath,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    });
  } finally {
    releaseLock(lockFile);
  }

  // Output the worktree path — this is what CC expects
  process.stdout.write(worktreePath);
  process.exit(0);
} catch (err) {
  releaseLock(lockFile);
  process.stderr.write(`[dev-team worktree-create] ${err.message}\n`);
  process.exit(1);
}
