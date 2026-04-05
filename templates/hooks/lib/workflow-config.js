"use strict";
const fs = require("fs");
const path = require("path");
let _config = null;
let _workflow = null;
function readConfig() {
  if (_config \!== null) return _config;
  _config = {};
  try {
    const configPath = path.join(process.cwd(), ".dev-team", "config.json");
    const stat = fs.lstatSync(configPath);
    if (stat.isSymbolicLink() || \!stat.isFile()) return _config;
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && \!Array.isArray(parsed)) { _config = parsed; }
  } catch { }
  return _config;
}
function loadWorkflow() {
  if (_workflow \!== null) return _workflow;
  _workflow = {};
  const config = readConfig();
  if (config.workflow && typeof config.workflow === "object" && \!Array.isArray(config.workflow)) {
    _workflow = config.workflow;
  }
  return _workflow;
}
function isEnabled(key) {
  const workflow = loadWorkflow();
  if (workflow[key] === false) return false;
  return true;
}
function _resetCache() { _config = null; _workflow = null; }
module.exports = { isEnabled, readConfig, _resetCache };
