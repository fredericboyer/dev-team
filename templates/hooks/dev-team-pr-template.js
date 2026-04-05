#\!/usr/bin/env node
"use strict";
const { isEnabled, readConfig } = require("./lib/workflow-config");
let input = {};
try { input = JSON.parse(process.argv[2] || "{}"); } catch { process.exit(0); }
const command = (input.tool_input && input.tool_input.command) || "";
if (\!/\bgh\s+pr\s+create\b/.test(command)) process.exit(0);
if (\!isEnabled("pr")) process.exit(0);
if (/--skip-format\b/.test(command)) {
  console.warn("[dev-team pr-template] WARNING: --skip-format used — PR format hooks bypassed.");
  process.exit(0);
}
const config = readConfig();
const pr = config.pr || {};
const templateSections = Array.isArray(pr.template) ? pr.template : ["summary", "testPlan"];
if (templateSections.length === 0) process.exit(0);
const SECTION_HEADINGS = { summary: "## Summary", testPlan: "## Test plan" };
const bodyMatch = command.match(/--body\s+(?:"([^"]*)"|'([^']*)')/);
let body = "";
if (bodyMatch) body = bodyMatch[1] || bodyMatch[2] || "";
if (\!body) process.exit(0);
const missing = [];
for (const section of templateSections) {
  const heading = SECTION_HEADINGS[section];
  if (\!heading) continue;
  if (\!new RegExp("^" + heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "mi").test(body)) {
    missing.push(heading);
  }
}
if (missing.length > 0) {
  console.error("[dev-team pr-template] BLOCKED — PR body missing required sections:");
  for (const s of missing) console.error("  - " + s);
  console.error("\nUse --skip-format to bypass.");
  process.exit(2);
}
process.exit(0);
