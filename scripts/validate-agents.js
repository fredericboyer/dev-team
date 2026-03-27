#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "templates", "agents");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "SHARED.md");

const REQUIRED_FIELDS = ["name:", "description:", "model:", "memory: project"];

let errors = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), "utf-8");

  if (!content.startsWith("---")) {
    console.error(`FAIL ${file}: missing YAML frontmatter delimiter`);
    errors++;
    continue;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!content.includes(field)) {
      console.error(`FAIL ${file}: missing required field "${field}"`);
      errors++;
    }
  }

  console.log(`  ok ${file}`);
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}

console.log(`\nAll ${files.length} agents valid.`);
