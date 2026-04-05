#!/usr/bin/env node
"use strict";
const { execFileSync } = require("child_process");
const { isEnabled, readConfig } = require("./lib/workflow-config");
let input = {};
try { input = JSON.parse(process.argv[2] || "{}"); } catch { process.exit(0); }
const command = (input.tool_input && input.tool_input.command) || "";
if (!/\bgh\s+pr\s+create\b/.test(command)) process.exit(0);
if (!isEnabled("pr")) process.exit(0);
if (/--skip-format\b/.test(command)) process.exit(0);
const config = readConfig();
const pr = config.pr || {};
const autoLabel = pr.autoLabel !== undefined ? pr.autoLabel : true;
if (!autoLabel) process.exit(0);
let branch = "";
try {
  branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8", timeout: 3000, stdio: ["pipe", "pipe", "pipe"],
  }).trim();
} catch { process.exit(0); }
if (!branch || branch === "HEAD") process.exit(0);
const PREFIX_LABELS = { "feat/": "enhancement", "fix/": "bug", "docs/": "documentation", "chore/": "chore" };
let label = null;
for (const [prefix, labelName] of Object.entries(PREFIX_LABELS)) {
  if (branch.startsWith(prefix)) { label = labelName; break; }
}
if (!label) process.exit(0);
const existingLabels = command.match(/--label\s+(?:"([^"]*)"|'([^']*)'|(\S+))/g) || [];
const hasLabel = existingLabels.some((l) => {
  const match = l.match(/--label\s+(?:"([^"]*)"|'([^']*)'|(\S+))/);
  const val = (match && (match[1] || match[2] || match[3])) || "";
  return val === label;
});
if (hasLabel) process.exit(0);
const newCommand = command + " --label " + label;
process.stdout.write(JSON.stringify({ tool_input: { command: newCommand } }));
process.exit(0);
