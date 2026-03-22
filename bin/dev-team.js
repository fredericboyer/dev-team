#!/usr/bin/env node

'use strict';

const { run } = require('../lib/init');

const args = process.argv.slice(2);
const command = args[0];

if (command === 'init') {
  run(process.cwd(), args.slice(1)).catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
} else {
  console.log('dev-team — Adversarial AI agent team for any project\n');
  console.log('Usage:');
  console.log('  npx dev-team init          Interactive onboarding wizard');
  console.log('  npx dev-team init --all    Install everything with defaults');
  console.log('');
  process.exit(command === '--help' || command === '-h' ? 0 : 1);
}
