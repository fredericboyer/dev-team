'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { scanProject, formatScanReport, parseCiScripts, parseHookCommands } = require('../../dist/scan');

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

describe('enforcement gap detection', () => {
  it('flags gap when CI has lint script but no hook installed', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { lint: 'eslint .', test: 'jest' } }),
    );
    const findings = scanProject(tmpDir);
    const gaps = findings.filter(
      (f) => f.category === 'enforcement' && f.status === 'gap',
    );
    assert.ok(gaps.length > 0, 'expected at least one enforcement gap');
    const lintGap = gaps.find((f) => f.tool === 'lint');
    assert.ok(lintGap, 'expected a gap for lint');
    assert.ok(lintGap.recommendation.includes('dev-team-pre-commit-lint.js'));
  });

  it('reports found when CI lint script has matching hook', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { lint: 'eslint .' } }),
    );
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'node .claude/hooks/dev-team-pre-commit-lint.js',
                },
              ],
            },
          ],
        },
      }),
    );
    const findings = scanProject(tmpDir);
    const lintEnforcement = findings.find(
      (f) => f.category === 'enforcement' && f.tool === 'lint',
    );
    assert.ok(lintEnforcement, 'expected enforcement finding for lint');
    assert.equal(lintEnforcement.status, 'found');
    assert.ok(lintEnforcement.recommendation.includes('covered locally'));
  });

  it('reports test script as partially covered by tdd-enforce hook', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { test: 'jest' } }),
    );
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              matcher: 'Edit|Write',
              hooks: [
                {
                  type: 'command',
                  command: 'node .claude/hooks/dev-team-tdd-enforce.js',
                },
              ],
            },
          ],
        },
      }),
    );
    const findings = scanProject(tmpDir);
    const testEnforcement = findings.find(
      (f) => f.category === 'enforcement' && f.tool === 'test',
    );
    assert.ok(testEnforcement, 'expected enforcement finding for test');
    assert.equal(testEnforcement.status, 'found');
    assert.ok(testEnforcement.recommendation.includes('partially covered'));
  });

  it('flags gap for CI scripts with no known hook mapping', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { build: 'tsc', typecheck: 'tsc --noEmit' } }),
    );
    const findings = scanProject(tmpDir);
    const gaps = findings.filter(
      (f) => f.category === 'enforcement' && f.status === 'gap',
    );
    const buildGap = gaps.find((f) => f.tool === 'build');
    const typecheckGap = gaps.find((f) => f.tool === 'typecheck');
    assert.ok(buildGap, 'expected a gap for build');
    assert.ok(typecheckGap, 'expected a gap for typecheck');
    assert.ok(buildGap.recommendation.includes('no local hook'));
  });

  it('produces no enforcement findings when no package.json exists', () => {
    const findings = scanProject(tmpDir);
    const enforcement = findings.filter((f) => f.category === 'enforcement');
    assert.equal(
      enforcement.length,
      0,
      'expected no enforcement findings without package.json',
    );
  });
});

describe('parseCiScripts', () => {
  it('extracts CI-relevant scripts from package.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          lint: 'eslint .',
          'format:check': 'prettier --check .',
          dev: 'nodemon',
        },
      }),
    );
    const scripts = parseCiScripts(tmpDir);
    assert.ok(scripts.includes('lint'));
    assert.ok(scripts.includes('format:check'));
    assert.ok(!scripts.includes('dev'), 'dev is not a CI-relevant script');
  });

  it('returns empty array when no package.json exists', () => {
    const scripts = parseCiScripts(tmpDir);
    assert.deepEqual(scripts, []);
  });

  it('returns empty array for invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), 'not json');
    const scripts = parseCiScripts(tmpDir);
    assert.deepEqual(scripts, []);
  });
});

describe('parseHookCommands', () => {
  it('extracts hook commands from settings.json', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'node .claude/hooks/dev-team-pre-commit-lint.js',
                },
              ],
            },
          ],
          PostToolUse: [
            {
              matcher: 'Edit|Write',
              hooks: [
                {
                  type: 'command',
                  command: 'node .claude/hooks/dev-team-tdd-enforce.js',
                },
              ],
            },
          ],
        },
      }),
    );
    const commands = parseHookCommands(tmpDir);
    assert.ok(
      commands.includes('node .claude/hooks/dev-team-pre-commit-lint.js'),
    );
    assert.ok(
      commands.includes('node .claude/hooks/dev-team-tdd-enforce.js'),
    );
  });

  it('returns empty array when no settings.json exists', () => {
    const commands = parseHookCommands(tmpDir);
    assert.deepEqual(commands, []);
  });

  it('returns empty array for invalid JSON', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'settings.json'),
      'not json',
    );
    const commands = parseHookCommands(tmpDir);
    assert.deepEqual(commands, []);
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
  it('formats gap findings with [GAP] tag', () => {
    const findings = [
      {
        category: 'enforcement',
        status: 'gap',
        tool: 'build',
        recommendation: 'CI runs "build" but no local hook enforces it.',
      },
    ];
    const report = formatScanReport(findings);
    assert.ok(report.includes('[GAP]'));
    assert.ok(report.includes('enforcement'));
    assert.ok(report.includes('no local hook'));
  });

  it('does not show all-OK message when gaps exist', () => {
    const findings = [
      {
        category: 'linter',
        status: 'found',
        tool: 'ESLint',
        recommendation: 'ok',
      },
      {
        category: 'enforcement',
        status: 'gap',
        tool: 'build',
        recommendation: 'CI runs "build" but no local hook enforces it.',
      },
    ];
    const report = formatScanReport(findings);
    assert.ok(
      !report.includes('All checked tooling'),
      'should not show all-OK when gaps exist',
    );
    assert.ok(report.includes('[GAP]'));
    assert.ok(report.includes('Tip:'));
  });

});
