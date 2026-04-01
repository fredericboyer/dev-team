/**
 * agent-patterns.js — shared agent pattern loading for dev-team hooks.
 *
 * Loads and compiles file-matching patterns from agent-patterns.json.
 * Used by both post-change-review and review-gate hooks to determine
 * which agents should review a given file path.
 *
 * agent-patterns.json is the single source of truth for file-to-agent routing.
 * It is always deployed alongside hooks (copied by init and update).
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { safeRegex } = require("./safe-regex");

/**
 * Compile a pattern entry from the JSON into a RegExp.
 * Entries are either a string (no flags) or [source, flags].
 */
function compilePattern(entry) {
  const source = Array.isArray(entry) ? entry[0] : entry;
  const flags = Array.isArray(entry) ? entry[1] || "" : undefined;
  const check = safeRegex(source);
  if (check.safe === false) {
    return null;
  }
  return flags !== undefined ? new RegExp(source, flags) : check.regex;
}

/**
 * Load all pattern categories from agent-patterns.json.
 * Returns an object keyed by category name with compiled RegExp arrays,
 * plus agent/label/matchOn metadata where present.
 *
 * Throws if agent-patterns.json is missing or malformed — hooks should
 * not silently degrade when the authoritative pattern source is absent.
 */
function loadPatterns() {
  const jsonPath = path.join(__dirname, "..", "agent-patterns.json");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (value.patterns) {
      const compiled = [];
      for (const p of value.patterns) {
        const re = compilePattern(p);
        if (re === null) {
          const src = Array.isArray(p) ? p[0] : p;
          const check = safeRegex(src);
          console.error(
            '[dev-team] skipping unsafe pattern in "' +
              key +
              '": ' +
              src +
              " (" +
              check.reason +
              ")",
          );
          continue;
        }
        compiled.push(re);
      }
      result[key] = {
        agent: value.agent,
        label: value.label,
        matchOn: value.matchOn || ["fullPath"],
        compiled,
      };
    } else if (value.pattern) {
      const re = compilePattern(value.pattern);
      if (re === null) {
        const src = Array.isArray(value.pattern) ? value.pattern[0] : value.pattern;
        const check = safeRegex(src);
        console.error(
          '[dev-team] skipping unsafe pattern in "' + key + '": ' + src + " (" + check.reason + ")",
        );
        continue;
      }
      result[key] = { compiled: re };
    }
  }
  return result;
}

/**
 * Get compiled pattern array for a category.
 * @param {object} loaded - Result of loadPatterns()
 * @param {string} key - Category name (e.g., "security", "api")
 * @returns {RegExp[]} Array of compiled patterns
 */
function getPatterns(loaded, key) {
  return loaded[key] ? loaded[key].compiled : [];
}

/**
 * Get a single compiled pattern for a category.
 * @param {object} loaded - Result of loadPatterns()
 * @param {string} key - Category name (e.g., "codeFile", "testFile")
 * @returns {RegExp} Compiled pattern
 */
function getSinglePattern(loaded, key) {
  return loaded[key] ? loaded[key].compiled : null;
}

/**
 * Get the label for a category, falling back to a default.
 * @param {object} loaded - Result of loadPatterns()
 * @param {string} key - Category name
 * @param {string} fallback - Default label
 * @returns {string}
 */
function getLabel(loaded, key, fallback) {
  const cat = loaded[key];
  return cat && cat.label ? cat.label : fallback;
}

module.exports = { loadPatterns, getPatterns, getSinglePattern, getLabel };
