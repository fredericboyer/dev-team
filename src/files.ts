import fs from "fs";
import path from "path";

export interface HookEntry {
  type: string;
  command: string;
  timeout?: number;
  blocking?: boolean;
}

export interface HookMatcher {
  matcher?: string;
  hooks: HookEntry[];
}

export interface HookSettings {
  hooks: Record<string, HookMatcher[]>;
}

/**
 * Returns the absolute path to the templates/ directory within the package.
 */
export function templateDir(): string {
  return path.join(__dirname, "..", "templates");
}

/**
 * Throws if the given path exists and is a symlink.
 * Prevents symlink-following attacks in file operations.
 */
export function assertNotSymlink(absPath: string): void {
  try {
    if (fs.lstatSync(absPath).isSymbolicLink()) {
      throw new Error(`Refusing to operate on symlink: ${absPath}`);
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }
}

/**
 * Walks up from absPath to the filesystem root and throws if any
 * existing ancestor directory is a symlink. Silently skips ancestors
 * that do not exist (ENOENT). Prevents parent-directory symlink
 * traversal attacks where an attacker replaces an ancestor with a
 * symlink to redirect file operations to arbitrary locations.
 */
export function assertNoSymlinkInPath(absPath: string): void {
  // Find the deepest existing ancestor and resolve through system symlinks
  // (e.g. /tmp -> /private/tmp on macOS) so they don't trigger false positives.
  let deepest = path.resolve(absPath);
  while (deepest !== path.parse(deepest).root) {
    try {
      fs.statSync(deepest);
      break;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        deepest = path.dirname(deepest);
        continue;
      }
      throw err;
    }
  }
  // Resolve system-level symlinks on the existing portion
  const resolved = fs.realpathSync(deepest);
  // Reconstruct the full path: resolved existing root + remaining segments
  const remainder = path.resolve(absPath).slice(deepest.length);
  let current = resolved + remainder;
  const root = path.parse(current).root;

  while (current !== root) {
    current = path.dirname(current);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new Error(`Refusing to operate through symlink ancestor: ${current}`);
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw err;
    }
  }
}

/**
 * Copies a file from src to dest, creating parent directories as needed.
 * Rejects symlinks at src or dest to prevent symlink-following attacks.
 * Returns true if the file was written.
 */
export function copyFile(src: string, dest: string): boolean {
  assertNotSymlink(src);
  assertNoSymlinkInPath(src);
  assertNotSymlink(dest);
  assertNoSymlinkInPath(dest);
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

/**
 * Checks if a file exists.
 */
export function fileExists(absPath: string): boolean {
  try {
    return fs.statSync(absPath).isFile();
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

/**
 * Checks if a directory exists.
 */
export function dirExists(absPath: string): boolean {
  try {
    return fs.statSync(absPath).isDirectory();
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

/**
 * Reads a file and returns its content, or null if it doesn't exist.
 * Throws on any error other than ENOENT (including EACCES, EPERM, EISDIR, etc.).
 */
export function readFile(absPath: string): string | null {
  try {
    return fs.readFileSync(absPath, "utf-8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Writes content to a file, creating parent directories as needed.
 */
export function writeFile(absPath: string, content: string): void {
  assertNotSymlink(absPath);
  assertNoSymlinkInPath(absPath);
  const dir = path.dirname(absPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(absPath, content);
}

/**
 * Deep merges hook configurations from source into target settings.
 * Additive only — never removes existing hooks.
 */
export function mergeSettings(existingPath: string, newFragment: HookSettings): void {
  assertNotSymlink(existingPath);
  assertNoSymlinkInPath(existingPath);
  let existing: { hooks?: Record<string, HookMatcher[]> } = {};
  try {
    existing = JSON.parse(fs.readFileSync(existingPath, "utf-8"));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      const backupPath = existingPath + ".bak";
      try {
        copyFile(existingPath, backupPath);
        console.warn(
          `Warning: ${existingPath} is not valid JSON. Backed up to ${backupPath}. Starting fresh.`,
        );
      } catch {
        console.warn(`Warning: ${existingPath} is not valid JSON. Starting fresh.`);
      }
    }
  }

  if (!existing.hooks) {
    existing.hooks = {};
  }

  for (const [event, entries] of Object.entries(newFragment.hooks || {})) {
    if (!existing.hooks[event]) {
      existing.hooks[event] = entries;
    } else {
      // Consolidate duplicate matcher blocks that may already exist from prior bug
      const consolidated: HookMatcher[] = [];
      for (const entry of existing.hooks[event]) {
        entry.hooks = entry.hooks ?? [];
        const target = consolidated.find((c) => c.matcher === entry.matcher);
        if (target) {
          const cmds = new Set(target.hooks.map((h) => h.command));
          for (const hook of entry.hooks) {
            if (!cmds.has(hook.command)) {
              target.hooks.push(hook);
              cmds.add(hook.command);
            }
          }
        } else {
          consolidated.push(entry);
        }
      }
      existing.hooks[event] = consolidated;

      // Merge by matcher value — deduplicate hooks within matched blocks
      for (const newEntry of entries) {
        const matchedExisting = existing.hooks[event].find(
          (existingEntry) => existingEntry.matcher === newEntry.matcher,
        );
        if (matchedExisting) {
          matchedExisting.hooks = matchedExisting.hooks ?? [];
          const existingCommands = new Set(matchedExisting.hooks.map((h) => h.command));
          for (const hook of newEntry.hooks || []) {
            if (!existingCommands.has(hook.command)) {
              matchedExisting.hooks.push(hook);
              existingCommands.add(hook.command);
            } else {
              // Update attributes (timeout, type, etc.) on existing commands
              const existingHook = matchedExisting.hooks.find((h) => h.command === hook.command);
              if (existingHook) {
                Object.assign(existingHook, hook);
              }
            }
          }
        } else {
          existing.hooks[event].push(newEntry);
        }
      }
    }
  }

  writeFile(existingPath, JSON.stringify(existing, null, 2) + "\n");
}

/**
 * Removes hooks from settings.json whose commands reference any of the given file names.
 * Used during hookRemovals migration to clean up stale entries.
 */
export function removeHooksFromSettings(settingsPath: string, hookFiles: string[]): void {
  assertNotSymlink(settingsPath);
  assertNoSymlinkInPath(settingsPath);
  let existing: { hooks?: Record<string, HookMatcher[]> };
  try {
    existing = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    return; // No settings file or invalid JSON — nothing to clean
  }

  if (!existing.hooks) return;

  let changed = false;
  for (const [event, entries] of Object.entries(existing.hooks)) {
    for (const entry of entries) {
      if (!entry.hooks) continue;
      const before = entry.hooks.length;
      entry.hooks = entry.hooks.filter(
        (h) => !hookFiles.some((f) => h.command && h.command.includes(f)),
      );
      if (entry.hooks.length < before) changed = true;
    }
    // Remove empty matcher blocks
    existing.hooks[event] = entries.filter((e) => (e.hooks ?? []).length > 0);
    // Remove empty event keys
    if (existing.hooks[event].length === 0) {
      delete existing.hooks[event];
      changed = true;
    }
  }

  if (changed) {
    writeFile(settingsPath, JSON.stringify(existing, null, 2) + "\n");
  }
}

/**
 * Manages dev-team managed content in a CLAUDE.md file.
 * - No file: creates it with the content.
 * - Has BEGIN+END markers: replaces content between them.
 * - Has BEGIN but no END: replaces from BEGIN to end of file.
 * - No markers: appends content at end.
 */
export function mergeClaudeMd(
  filePath: string,
  newContent: string,
): "created" | "replaced" | "appended" {
  const BEGIN_MARKER = "<!-- dev-team:begin -->";
  const END_MARKER = "<!-- dev-team:end -->";

  const existing = readFile(filePath);

  if (!existing) {
    writeFile(filePath, newContent);
    return "created";
  }

  // Extract only the managed section (begin→end markers inclusive) from newContent.
  // This prevents re-injecting template scaffolding above the markers on every update.
  const newBegin = newContent.indexOf(BEGIN_MARKER);
  const newEnd = newContent.indexOf(END_MARKER, newBegin);
  const managedSection =
    newBegin !== -1 && newEnd !== -1
      ? newContent.substring(newBegin, newEnd + END_MARKER.length)
      : newContent;

  if (existing.includes(BEGIN_MARKER)) {
    const firstBegin = existing.indexOf(BEGIN_MARKER);
    const firstEnd = existing.indexOf(END_MARKER, firstBegin);

    if (firstEnd === -1) {
      console.warn(
        "Warning: Found dev-team begin marker but no end marker in CLAUDE.md. Replacing from begin marker to end of file.",
      );
      const beforeMarker = existing.substring(0, firstBegin);
      writeFile(filePath, beforeMarker + managedSection + "\n");
      return "replaced";
    }

    const secondBegin = existing.indexOf(BEGIN_MARKER, firstBegin + 1);
    if (secondBegin !== -1) {
      console.warn(
        "Warning: Found duplicate dev-team marker pairs in CLAUDE.md. Replacing the first pair only and preserving all other content.",
      );
    }

    const beforeMarker = existing.substring(0, firstBegin);
    const afterMarker = existing.substring(firstEnd + END_MARKER.length);
    writeFile(filePath, beforeMarker + managedSection + afterMarker);
    return "replaced";
  }

  writeFile(filePath, existing.trimEnd() + "\n\n" + newContent + "\n");
  return "appended";
}

/**
 * Lists immediate subdirectory names in a directory.
 * Returns empty array if directory doesn't exist.
 */
export function listSubdirectories(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Returns the current package version from package.json.
 */
export function getPackageVersion(): string {
  const pkgPath = path.join(templateDir(), "..", "package.json");
  const content = readFile(pkgPath);
  if (!content) {
    throw new Error("Cannot read package.json");
  }
  const parsed = JSON.parse(content);
  if (!parsed.version) {
    throw new Error("package.json missing version field");
  }
  return parsed.version;
}

/**
 * Creates a symlink at symlinkPath pointing to symlinkTarget.
 * Skips if a non-symlink (real file/dir) already exists at the path.
 * Removes stale symlinks before creating. Falls back to junction on Windows
 * when symlink creation fails due to permissions.
 */
export function ensureSymlink(symlinkPath: string, symlinkTarget: string): void {
  // Skip if path exists and is NOT a symlink (user's real directory — preserve it)
  let isNonSymlink = false;
  try {
    isNonSymlink = fs.existsSync(symlinkPath) && !fs.lstatSync(symlinkPath).isSymbolicLink();
  } catch {
    // ENOENT — path doesn't exist, proceed to create symlink
  }
  if (isNonSymlink) return;

  try {
    fs.mkdirSync(path.dirname(symlinkPath), { recursive: true });
    // Remove existing symlink (broken or stale) — only unlink symlinks, not real files/dirs
    try {
      if (fs.lstatSync(symlinkPath).isSymbolicLink()) {
        fs.unlinkSync(symlinkPath);
      }
    } catch {
      // ENOENT is expected when no prior symlink exists
    }
    fs.symlinkSync(symlinkTarget, symlinkPath);
  } catch (err) {
    // On Windows, non-admin users get EPERM/EACCES for symlinks — fall back to junction
    if (
      process.platform === "win32" &&
      ((err as NodeJS.ErrnoException).code === "EPERM" ||
        (err as NodeJS.ErrnoException).code === "EACCES")
    ) {
      try {
        fs.symlinkSync(symlinkTarget, symlinkPath, "junction");
      } catch (junctionErr) {
        const skillDir = path.basename(symlinkPath);
        console.warn(
          `  Warning: could not create skill symlink for ${skillDir}: ${(junctionErr as Error).message}`,
        );
      }
    } else {
      const skillDir = path.basename(symlinkPath);
      console.warn(
        `  Warning: could not create skill symlink for ${skillDir}: ${(err as Error).message}`,
      );
    }
  }
}

/**
 * Lists all files in a directory recursively.
 * @param dir - Directory to scan
 * @param maxDepth - Maximum directory depth to recurse into (default 10). Guards against
 *   runaway recursion in deeply nested or circular filesystem structures.
 */
export function listFilesRecursive(dir: string, maxDepth: number = 10): string[] {
  if (maxDepth < 0) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      results.push(...listFilesRecursive(fullPath, maxDepth - 1));
    } else if (!entry.isDirectory()) {
      results.push(fullPath);
    }
  }
  return results;
}
