#!/usr/bin/env node
"use strict";
const { isEnabled, readConfig } = require("./lib/workflow-config");
let input = {};
try { input = JSON.parse(process.argv[2] || "{}"); } catch { process.exit(0); }
const command = (input.tool_input && input.tool_input.command) || "";
if (!/\bgh\s+pr\s+create\b/.test(command)) process.exit(0);
if (!isEnabled("pr")) process.exit(0);
if (/--skip-format\b/.test(command)) {
  console.warn("[dev-team pr-link-keyword] WARNING: --skip-format used — PR format hooks bypassed.");
  process.exit(0);
}
const config = readConfig();
const pr = config.pr || {};
const linkKeyword = pr.linkKeyword !== undefined ? pr.linkKeyword : "Closes";
if (linkKeyword === "") process.exit(0);
const bodyMatch = command.match(/--body\s+(?:"([^"]*)"|'([^']*)')/);
let body = "";
if (bodyMatch) body = bodyMatch[1] || bodyMatch[2] || "";
if (!body) process.exit(0);
const escaped = linkKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const linkPattern = new RegExp(escaped + "\\s+#\\d+", "i");
if (!linkPattern.test(body)) {
  console.error("[dev-team pr-link-keyword] BLOCKED — PR body must contain issue link.");
  console.error("\n  Expected: " + linkKeyword + " #NNN");
  console.error("\nUse --skip-format to bypass.");
  process.exit(2);
}
process.exit(0);
