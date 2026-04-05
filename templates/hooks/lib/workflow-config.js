/**
 * workflow-config.js — shared workflow state reader for dev-team hooks.
 *
 * Reads `.dev-team/config.json` once and exposes workflow toggle state.
 * Safe defaults: missing config, missing workflow section, or missing keys
 * all default to enabled (enforce by default).
 *
 * Usage:
 *   const { isEnabled } = require("./lib/workflow-config");
 *   if (!isEnabled("review")) process.exit(0); // skip when review disabled
 */

"use strict";

const fs = require("fs");
const path = require("path");

let _workflow = null;

/**
 * Load the workflow section from .dev-team/config.json.
 * Returns the workflow object or an empty object on any failure.
 * Result is cached for the lifetime of the process.
 */
function loadWorkflow() {
  if (_workflow !== null) return _workflow;

  _workflow = {};

  try {
    const configPath = path.join(process.cwd(), ".dev-team", "config.json");
    const stat = fs.lstatSync(configPath);
    // Reject symlinks to prevent reading unintended files
    if (stat.isSymbolicLink() || !stat.isFile()) return _workflow;

    const raw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);

    if (config && typeof config === "object" && !Array.isArray(config)) {
      if (
        config.workflow &&
        typeof config.workflow === "object" &&
        !Array.isArray(config.workflow)
      ) {
        _workflow = config.workflow;
      }
    }
  } catch {
    // Missing config, parse error, permission error — all default to enforce
  }

  return _workflow;
}

/**
 * Check whether a workflow feature is enabled.
 *
 * @param {string} key - The workflow key to check (e.g., "review", "learn")
 * @returns {boolean} true if enabled or not configured (default: enabled)
 */
function isEnabled(key) {
  const workflow = loadWorkflow();
  const value = workflow[key];
  // Only explicitly false disables a workflow feature
  if (value === false) return false;
  return true;
}

/**
 * Reset the cached workflow config. Useful for testing.
 */
function _resetCache() {
  _workflow = null;
}

/**
 * Read and return the full .dev-team/config.json object.
 * Returns an empty object on any failure. Result is NOT cached
 * (config may change between hook invocations in a session).
 */
function readConfig() {
  try {
    const configPath = path.join(process.cwd(), ".dev-team", "config.json");
    const stat = fs.lstatSync(configPath);
    if (stat.isSymbolicLink() || !stat.isFile()) return {};
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    if (config && typeof config === "object" && !Array.isArray(config)) {
      return config;
    }
  } catch {
    // Missing config, parse error — return empty
  }
  return {};
}

module.exports = { isEnabled, readConfig, _resetCache };
