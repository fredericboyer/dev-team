'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');

const bin = path.join(__dirname, '..', '..', 'bin', 'dev-team.js');
const pkg = require('../../package.json');

describe('CLI --version flag', () => {
  it('prints the version from package.json with --version', () => {
    const output = execFileSync(process.execPath, [bin, '--version'], {
      encoding: 'utf-8',
    });
    assert.equal(output.trim(), pkg.version);
  });

  it('prints the version from package.json with -v', () => {
    const output = execFileSync(process.execPath, [bin, '-v'], {
      encoding: 'utf-8',
    });
    assert.equal(output.trim(), pkg.version);
  });

  it('exits with code 0', () => {
    // execFileSync throws on non-zero exit, so reaching here means exit 0
    execFileSync(process.execPath, [bin, '--version'], {
      encoding: 'utf-8',
    });
  });
});
