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
const adrFiles = fs.readdirSync(adrDir).filter((f) => f.endsWith(".md") && f !== "README.md");

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
    console.error(`FAIL: Index entry [${entry.number}](${entry.filename}) has no file on disk`);
    errors++;
  }
}

// Check (c): ADRs marked "superseded" in README index have matching status in file header
const supersededPattern = /\| [^|]+ \| superseded/i;
for (const line of readmeContent.split("\n")) {
  if (!supersededPattern.test(line)) continue;
  const fileMatch = line.match(/\[(\d+)\]\(([^)]+)\)/);
  if (!fileMatch) continue;
  const [, number, filename] = fileMatch;
  const filePath = path.join(adrDir, filename);
  if (!fs.existsSync(filePath)) continue; // already caught by check (b)
  const fileContent = fs.readFileSync(filePath, "utf-8");
  if (!/status:\s*superseded/i.test(fileContent)) {
    console.error(
      `FAIL: ADR [${number}](${filename}) is "superseded" in index but file header does not have "Status: superseded"`,
    );
    errors++;
  }
}

console.log(`  ADRs: ${adrFiles.length} files, ${indexEntries.length} index entries checked`);

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

// --- Stale path validation ---
// Deprecated paths from v3.0 migration (ADR-038). Any .md file referencing these is stale.

const DEPRECATED_PATHS = [
  { pattern: /\.dev-team\/agents\//g, replacement: ".claude/agents/", since: "v3.0.0" },
  { pattern: /\.dev-team\/agent-memory\//g, replacement: ".claude/agent-memory/", since: "v3.0.0" },
  { pattern: /\.dev-team\/skills\//g, replacement: ".claude/skills/", since: "v3.0.0" },
];

// Directories to scan for stale references
const SCAN_DIRS = [
  "docs",
  "templates",
  ".claude/rules",
  ".claude/skills",
  ".claude/agents",
  ".claude/agent-memory",
];
const SCAN_ROOT_FILES = ["CLAUDE.md", "README.md"];

// Files to skip (historical records that legitimately reference old paths)
const SKIP_PATTERNS = [
  /docs\/research\//, // Research briefs are historical
  /docs\/adr\//, // ADRs are immutable records
  /CHANGELOG\.md$/, // Changelog is historical
  /metrics\.md$/, // Metrics are historical
];

// Lines matching these patterns are skipped inside agent-memory files
const MEMORY_LINE_SKIP = /Last-verified|## Archive/;

function shouldSkip(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return SKIP_PATTERNS.some((p) => p.test(normalized));
}

function scanFileForStalePaths(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const isMemoryFile = /agent-memory[\\/]/.test(filePath.replace(/\\/g, "/"));
  for (const dep of DEPRECATED_PATHS) {
    const lines = content.split("\n");
    let matchCount = 0;
    for (const line of lines) {
      if (isMemoryFile && MEMORY_LINE_SKIP.test(line)) continue;
      const lineMatches = line.match(new RegExp(dep.pattern.source, "g"));
      if (lineMatches) matchCount += lineMatches.length;
    }
    if (matchCount > 0) {
      console.error(
        `FAIL: "${filePath}" has ${matchCount} stale reference(s) to "${dep.pattern.source}" (deprecated since ${dep.since}, use "${dep.replacement}")`,
      );
      errors++;
    }
  }
}

function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (shouldSkip(fullPath)) continue;
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.name.endsWith(".md")) {
      scanFileForStalePaths(fullPath);
    }
  }
}

const root = path.join(__dirname, "..");
for (const dir of SCAN_DIRS) {
  scanDirectory(path.join(root, dir));
}
for (const file of SCAN_ROOT_FILES) {
  const filePath = path.join(root, file);
  if (fs.existsSync(filePath) && !shouldSkip(filePath)) {
    scanFileForStalePaths(filePath);
  }
}

console.log(
  `  Stale paths: ${DEPRECATED_PATHS.length} patterns checked across ${SCAN_DIRS.length} directories + ${SCAN_ROOT_FILES.length} root files`,
);

// --- Summary ---

if (errors > 0) {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}

console.log("\nAll docs valid.");
