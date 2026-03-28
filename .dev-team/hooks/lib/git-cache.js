/**
 * git-cache.js — shared cached git diff for dev-team hooks.
 *
 * Reads from a temp file if it was written < 5 seconds ago,
 * otherwise shells out to git and writes the result for subsequent hooks.
 * Cache key includes cwd hash so different repos don't share cache.
 *
 * Security: rejects symlinks on the cache file to prevent symlink attacks,
 * uses atomic writes (write-to-tmp + rename) to close TOCTOU windows,
 * and restricts cache file permissions to owner-only (0o600).
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
 *
 * @param {string[]} args - Arguments to pass to git (e.g., ["diff", "--cached", "--name-only"])
 * @param {number} timeoutMs - Timeout in milliseconds for the git command
 * @returns {string} The git command output
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

module.exports = { cachedGitDiff };
