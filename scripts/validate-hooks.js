#!/usr/bin/env node

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'templates', 'hooks');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

let errors = 0;

for (const file of files) {
  const filePath = path.resolve(dir, file);

  // Use Node's --check flag to syntax-validate without executing
  try {
    execFileSync(process.execPath, ['--check', filePath], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    console.log(`  ok ${file}`);
  } catch (e) {
    console.error(`FAIL ${file}: ${e.stderr || e.message}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}

console.log(`\nAll ${files.length} hooks valid.`);
