'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Returns the absolute path to the templates/ directory within the package.
 */
function templateDir() {
  return path.join(__dirname, '..', 'templates');
}

/**
 * Copies a file from src to dest, creating parent directories as needed.
 * Returns true if the file was written, false if skipped.
 */
function copyFile(src, dest) {
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

/**
 * Checks if a file exists.
 */
function fileExists(absPath) {
  try {
    return fs.statSync(absPath).isFile();
  } catch {
    return false;
  }
}

/**
 * Checks if a directory exists.
 */
function dirExists(absPath) {
  try {
    return fs.statSync(absPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Reads a file and returns its content, or null if it doesn't exist.
 */
function readFile(absPath) {
  try {
    return fs.readFileSync(absPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Writes content to a file, creating parent directories as needed.
 */
function writeFile(absPath, content) {
  const dir = path.dirname(absPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(absPath, content);
}

/**
 * Deep merges hook configurations from source into target settings.
 * Additive only — never removes existing hooks.
 */
function mergeSettings(existingPath, newFragment) {
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  if (!existing.hooks) {
    existing.hooks = {};
  }

  for (const [event, entries] of Object.entries(newFragment.hooks || {})) {
    if (!existing.hooks[event]) {
      existing.hooks[event] = entries;
    } else {
      // Add entries that don't already exist (by command string)
      for (const newEntry of entries) {
        const newCommands = (newEntry.hooks || []).map((h) => h.command);
        const alreadyExists = existing.hooks[event].some((existingEntry) => {
          const existingCommands = (existingEntry.hooks || []).map((h) => h.command);
          return newCommands.every((cmd) => existingCommands.includes(cmd));
        });
        if (!alreadyExists) {
          existing.hooks[event].push(newEntry);
        }
      }
    }
  }

  fs.writeFileSync(existingPath, JSON.stringify(existing, null, 2) + '\n');
}

/**
 * Appends content to a file with dev-team markers.
 * If markers already exist, replaces content between them.
 * If file doesn't exist, creates it with just the content.
 */
function mergeClaudeMd(filePath, newContent) {
  const BEGIN_MARKER = '<!-- dev-team:begin -->';
  const END_MARKER = '<!-- dev-team:end -->';

  const existing = readFile(filePath);

  if (!existing) {
    // File doesn't exist — create with content
    writeFile(filePath, newContent);
    return 'created';
  }

  if (existing.includes(BEGIN_MARKER)) {
    // Markers exist — replace between them
    const beforeMarker = existing.substring(0, existing.indexOf(BEGIN_MARKER));
    const afterMarker = existing.substring(existing.indexOf(END_MARKER) + END_MARKER.length);
    writeFile(filePath, beforeMarker + newContent + afterMarker);
    return 'replaced';
  }

  // No markers — append
  writeFile(filePath, existing.trimEnd() + '\n\n' + newContent + '\n');
  return 'appended';
}

/**
 * Lists all files in a directory recursively.
 */
function listFilesRecursive(dir) {
  const results = [];
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

module.exports = {
  templateDir,
  copyFile,
  fileExists,
  dirExists,
  readFile,
  writeFile,
  mergeSettings,
  mergeClaudeMd,
  listFilesRecursive,
};
