'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { scanProject, formatScanReport } = require('../../dist/scan');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-team-scan-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('scanProject', () => {
  it('detects ESLint config', () => {
    fs.writeFileSync(path.join(tmpDir, '.eslintrc.json'), '{}');
    const findings = scanProject(tmpDir);
    const linter = findings.find((f) => f.category === 'linter');
    assert.equal(linter.status, 'found');
    assert.ok(linter.tool.includes('ESLint'));
  });

  it('detects Prettier config', () => {
    fs.writeFileSync(path.join(tmpDir, '.prettierrc'), '{}');
    const findings = scanProject(tmpDir);
    const formatter = findings.find((f) => f.category === 'formatter');
    assert.equal(formatter.status, 'found');
    assert.ok(formatter.tool.includes('Prettier'));
  });

  it('detects GitHub Actions', () => {
    fs.mkdirSync(path.join(tmpDir, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.github', 'workflows', 'ci.yml'), 'name: CI');
    const findings = scanProject(tmpDir);
    const ci = findings.find((f) => f.category === 'ci');
    assert.equal(ci.status, 'found');
    assert.ok(ci.tool.includes('GitHub Actions'));
  });

  it('detects Semgrep SAST config', () => {
    fs.writeFileSync(path.join(tmpDir, '.semgrep.yml'), 'rules: []');
    const findings = scanProject(tmpDir);
    const sast = findings.find((f) => f.category === 'sast');
    assert.equal(sast.status, 'found');
    assert.ok(sast.tool.includes('Semgrep'));
  });

  it('detects npm lock file for dependency audit', () => {
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}');
    const findings = scanProject(tmpDir);
    const dep = findings.find((f) => f.category === 'dependency');
    assert.equal(dep.status, 'found');
    assert.ok(dep.tool.includes('npm audit'));
  });

  it('reports missing tooling for empty project', () => {
    const findings = scanProject(tmpDir);
    const missing = findings.filter((f) => f.status === 'missing');
    // Should detect missing linter, formatter, SAST, CI at minimum
    assert.ok(missing.length >= 4, `expected at least 4 missing categories, got ${missing.length}`);
  });

  it('detects lint script in package.json when no config file exists', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { lint: 'eslint .' } }),
    );
    const findings = scanProject(tmpDir);
    const linter = findings.find((f) => f.category === 'linter');
    assert.equal(linter.status, 'found');
    assert.ok(linter.tool.includes('npm lint'));
  });
});

describe('formatScanReport', () => {
  it('formats findings as readable report', () => {
    const findings = [
      { category: 'linter', status: 'found', tool: 'ESLint', recommendation: 'ok' },
      { category: 'formatter', status: 'missing', tool: 'none', recommendation: 'Add Prettier' },
    ];
    const report = formatScanReport(findings);
    assert.ok(report.includes('[OK]'));
    assert.ok(report.includes('[MISSING]'));
    assert.ok(report.includes('ESLint'));
    assert.ok(report.includes('Add Prettier'));
  });

  it('reports all OK when nothing is missing', () => {
    const findings = [
      { category: 'linter', status: 'found', tool: 'ESLint', recommendation: 'ok' },
    ];
    const report = formatScanReport(findings);
    assert.ok(report.includes('All checked tooling'));
  });
});
