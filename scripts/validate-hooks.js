#!/usr/bin/env node

"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dirs = [
  path.join(__dirname, "..", "templates", "hooks"),
  path.join(__dirname, "..", ".claude", "hooks"),
];

let errors = 0;
let total = 0;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
  const label = path.relative(path.join(__dirname, ".."), dir);

  for (const file of files) {
    const filePath = path.resolve(dir, file);
    total++;

    // Use Node's --check flag to syntax-validate without executing
    try {
      execFileSync(process.execPath, ["--check", filePath], {
        encoding: "utf-8",
        timeout: 5000,
      });
      console.log(`  ok ${label}/${file}`);
    } catch (e) {
      console.error(`FAIL ${label}/${file}: ${e.stderr || e.message}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}

console.log(`\nAll ${total} hooks valid.`);
