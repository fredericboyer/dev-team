#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf-8");

let errors = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  errors++;
}

// --- Count validation ---

function countTemplateFiles(subdir, ext) {
  const dir = path.join(root, "templates", subdir);
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext) && f !== "SHARED.md").length;
}

function countTemplateDirs(subdir) {
  const dir = path.join(root, "templates", subdir);
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).length;
}

const counts = [
  { label: "Agents", dir: "agents", ext: ".md", count: countTemplateFiles("agents", ".md") },
  { label: "Hooks", dir: "hooks", ext: ".js", count: countTemplateFiles("hooks", ".js") },
  { label: "Skills", dir: "skills", ext: null, count: countTemplateDirs("skills") },
];

for (const { label, count } of counts) {
  const pattern = new RegExp(`###\\s+${label}\\s+\\((\\d+)\\)`);
  const match = readme.match(pattern);
  if (!match) {
    fail(`README missing "### ${label} (N)" header`);
    continue;
  }
  const readmeCount = parseInt(match[1], 10);
  if (readmeCount !== count) {
    fail(`README says "${label} (${readmeCount})" but templates/ has ${count}`);
  } else {
    console.log(`  ok ${label} count: ${count}`);
  }
}

// --- File-existence validation ---

// Agents: extract from markdown table rows like "| `@dev-team-foo` |"
const agentPattern = /\| `@dev-team-([a-z-]+)` \|/g;
let agentMatch;
while ((agentMatch = agentPattern.exec(readme)) !== null) {
  const name = agentMatch[1];
  const file = path.join(root, "templates", "agents", `dev-team-${name}.md`);
  if (!fs.existsSync(file)) {
    fail(
      `README references agent @dev-team-${name} but templates/agents/dev-team-${name}.md does not exist`,
    );
  } else {
    console.log(`  ok agent dev-team-${name}`);
  }
}

// Hooks: verify each hook file on disk is mentioned in the README
const hookDir = path.join(root, "templates", "hooks");
const hookFiles = fs.readdirSync(hookDir).filter((f) => f.endsWith(".js"));

for (const hookFile of hookFiles) {
  const hookName = hookFile.replace(/\.js$/, "").replace(/^dev-team-/, "");
  // Convert filename slug to search terms and check each appears in README
  const searchTerms = hookName.split("-");
  const found = searchTerms.every((term) => {
    const re = new RegExp(term, "i");
    return re.test(readme);
  });
  if (!found) {
    fail(`Hook file ${hookFile} not mentioned in README`);
  } else {
    console.log(`  ok hook ${hookFile}`);
  }
}

// Skills: extract from markdown table rows like "| `/dev-team:foo` |"
const skillPattern = /\| `\/dev-team:([a-z-]+)` \|/g;
let skillMatch;
while ((skillMatch = skillPattern.exec(readme)) !== null) {
  const name = skillMatch[1];
  const dir = path.join(root, "templates", "skills", `dev-team-${name}`);
  if (!fs.existsSync(dir)) {
    fail(
      `README references skill /dev-team:${name} but templates/skills/dev-team-${name}/ does not exist`,
    );
  } else {
    console.log(`  ok skill dev-team-${name}`);
  }
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}

console.log("\nREADME validation passed.");
