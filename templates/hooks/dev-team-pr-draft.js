#!/usr/bin/env node
"use strict";
const { isEnabled, readConfig } = require("./lib/workflow-config");
let input = {};
try { input = JSON.parse(process.argv[2] || "{}"); } catch { process.exit(0); }
const command = (input.tool_input && input.tool_input.command) || "";
if (!/\bgh\s+pr\s+create\b/.test(command)) process.exit(0);
if (!isEnabled("pr")) process.exit(0);
if (/--skip-format\b/.test(command)) process.exit(0);
const config = readConfig();
const pr = config.pr || {};
const draftDefault = pr.draft !== undefined ? pr.draft : false;
if (!draftDefault) process.exit(0);
if (/--draft\b/.test(command)) process.exit(0);
console.warn("[dev-team pr-draft] ADVISORY: pr.draft is enabled but --draft flag is missing from gh pr create.");
console.warn("  Consider adding --draft to create the PR as a draft.");
process.exit(0);
