import fs from "fs";
import path from "path";

export interface HookEntry {
  type: string;
  command: string;
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
 * Copies a file from src to dest, creating parent directories as needed.
 * Returns true if the file was written.
 */
export function copyFile(src: string, dest: string): boolean {
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
 */
export function readFile(absPath: string): string | null {
  try {
    return fs.readFileSync(absPath, "utf-8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }
    if (code === "EACCES" || code === "EPERM") {
      console.warn(`Warning: permission denied reading ${absPath}`);
      return null;
    }
    throw err;
  }
}

/**
 * Writes content to a file, creating parent directories as needed.
 */
export function writeFile(absPath: string, content: string): void {
  const dir = path.dirname(absPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(absPath, content);
}

/**
 * Deep merges hook configurations from source into target settings.
 * Additive only — never removes existing hooks.
 */
export function mergeSettings(existingPath: string, newFragment: HookSettings): void {
  let existing: { hooks?: Record<string, HookMatcher[]> } = {};
  try {
    existing = JSON.parse(fs.readFileSync(existingPath, "utf-8"));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      const backupPath = existingPath + ".bak";
      try {
        fs.copyFileSync(existingPath, backupPath);
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
            }
          }
        } else {
          existing.hooks[event].push(newEntry);
        }
      }

    }
  }

  const dir = path.dirname(existingPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(existingPath, JSON.stringify(existing, null, 2) + "\n");
}

/**
 * Appends content to a file with dev-team markers.
 * If markers already exist, replaces content between them.
 * If file doesn't exist, creates it with just the content.
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

  if (existing.includes(BEGIN_MARKER)) {
    if (!existing.includes(END_MARKER)) {
      console.warn(
        "Warning: Found dev-team begin marker but no end marker in CLAUDE.md. Appending instead of replacing.",
      );
      writeFile(filePath, existing.trimEnd() + "\n\n" + newContent + "\n");
      return "appended";
    }
    const firstBegin = existing.indexOf(BEGIN_MARKER);
    const firstEnd = existing.indexOf(END_MARKER);

    const secondBegin = existing.indexOf(BEGIN_MARKER, firstBegin + 1);
    if (secondBegin !== -1) {
      console.warn(
        "Warning: Found duplicate dev-team marker pairs in CLAUDE.md. Replacing the first pair only and preserving all other content.",
      );
    }

    const beforeMarker = existing.substring(0, firstBegin);
    const afterMarker = existing.substring(firstEnd + END_MARKER.length);
    writeFile(filePath, beforeMarker + newContent + afterMarker);
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
 * Lists all files in a directory recursively.
 */
export function listFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}
