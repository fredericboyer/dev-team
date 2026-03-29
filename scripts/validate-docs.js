#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const adrDir = path.join(__dirname, "..", "docs", "adr");
const researchDir = path.join(__dirname, "..", "docs", "research");

let errors = 0;

// --- ADR validation ---

const readmePath = path.join(adrDir, "README.md");
const readmeContent = fs.readFileSync(readmePath, "utf-8");

// Parse index entries: lines like | [NNN](NNN-slug.md) | Title | Status |
const indexPattern = /\| \[(\d+)\]\(([^)]+)\) \|/g;
const indexEntries = [];
let match;
while ((match = indexPattern.exec(readmeContent)) !== null) {
  indexEntries.push({ number: match[1], filename: match[2] });
}

// Get all ADR .md files on disk (excluding README.md)
const adrFiles = fs
  .readdirSync(adrDir)
  .filter((f) => f.endsWith(".md") && f !== "README.md");

// Check (a): every ADR file on disk has an entry in the index
for (const file of adrFiles) {
  const found = indexEntries.some((e) => e.filename === file);
  if (!found) {
    console.error(`FAIL: ADR file "${file}" has no entry in docs/adr/README.md index`);
    errors++;
  }
}

// Check (b): every index entry has a file on disk
for (const entry of indexEntries) {
  const filePath = path.join(adrDir, entry.filename);
  if (!fs.existsSync(filePath)) {
    console.error(
      `FAIL: Index entry [${entry.number}](${entry.filename}) has no file on disk`,
    );
    errors++;
  }
}

console.log(
  `  ADRs: ${adrFiles.length} files, ${indexEntries.length} index entries checked`,
);

// --- Research brief validation ---

if (fs.existsSync(researchDir)) {
  const researchFiles = fs
    .readdirSync(researchDir)
    .filter((f) => f.endsWith(".md") && f !== "research-synthesis.md");

  // Pattern: {number}-{kebab-case}-{YYYY-MM-DD}.md
  const briefPattern = /^\d+-[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-\d{2}-\d{2}\.md$/;

  for (const file of researchFiles) {
    if (!briefPattern.test(file)) {
      console.error(
        `FAIL: Research brief "${file}" does not match pattern {number}-{kebab}-{date}.md`,
      );
      errors++;
    }
  }

  console.log(`  Research briefs: ${researchFiles.length} files checked`);
}

// --- Summary ---

if (errors > 0) {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}

console.log("\nAll docs valid.");
