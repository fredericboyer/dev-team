#!/usr/bin/env node

/**
 * dev-team-worktree-remove.js
 * WorktreeRemove hook — cleans up worktrees created by dev-team-worktree-create.js.
 *
 * Companion to dev-team-worktree-create.js. See that file for the upstream
 * bugs this workaround addresses.
 *
 * Input (argv[2] JSON): { worktree_path }
 * Exit 0 = success (failures are best-effort, logged but not fatal)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  process.stderr.write("[dev-team worktree-remove] Failed to parse hook input\n");
  process.exit(0); // Non-fatal — CC handles cleanup fallback
}

const worktreePath = input.worktree_path;

if (!worktreePath) {
  process.stderr.write("[dev-team worktree-remove] Missing worktree_path\n");
  process.exit(0);
}

// Validate worktree_path is an absolute path (fixes #537)
if (!path.isAbsolute(worktreePath)) {
  process.stderr.write("[dev-team worktree-remove] worktree_path must be an absolute path\n");
  process.exit(0);
}

// Validate worktree_path resolves within the project root (fixes #725)
const projectRoot = process.cwd();
const realRoot = fs.realpathSync(projectRoot);
let resolvedWorktreePath = worktreePath;
try {
  resolvedWorktreePath = fs.realpathSync(worktreePath);
} catch {
  // Path doesn't exist — use the unresolved path for containment check
}
const rel = path.relative(realRoot, resolvedWorktreePath);
if (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) {
  process.stderr.write(
    `[dev-team worktree-remove] worktree_path "${worktreePath}" resolves outside project root\n`,
  );
  process.exit(0);
}

try {
  execFileSync("git", ["worktree", "remove", "--force", worktreePath], {
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 15000,
  });
} catch (err) {
  // Best effort — log but don't fail. CC will retry or the worktree
  // will be cleaned up by `git worktree prune` eventually.
  process.stderr.write(`[dev-team worktree-remove] ${err.message}\n`);
}

process.exit(0);
