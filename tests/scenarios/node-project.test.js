'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { run } = require('../../dist/init');

let tmpDir;
let originalCwd;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-team-node-'));
  originalCwd = process.cwd();
  process.chdir(tmpDir);

  // Simulate a Node.js project
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'my-node-app',
    version: '1.0.0',
    scripts: { test: 'node --test' },
  }, null, 2));
  fs.mkdirSync(path.join(tmpDir, 'src'));
  fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'module.exports = { hello: () => "world" };');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Node App\n\nExisting project instructions.\n');
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Node.js project scenario', () => {
  it('installs into a project with existing package.json and CLAUDE.md', async () => {
    await run(tmpDir, ['--all']);

    // Agents installed
    const agents = fs.readdirSync(path.join(tmpDir, '.claude', 'agents'));
    assert.equal(agents.length, 9);
    assert.ok(agents.includes('dev-team-voss.md'));

    // Hooks installed
    const hooks = fs.readdirSync(path.join(tmpDir, '.claude', 'hooks'));
    assert.equal(hooks.length, 5);

    // Existing CLAUDE.md preserved
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    assert.ok(claudeMd.includes('My Node App'), 'should preserve existing content');
    assert.ok(claudeMd.includes('dev-team:begin'), 'should add dev-team section');

    // Original package.json untouched
    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
    assert.equal(pkg.name, 'my-node-app');

    // Settings.json has hook configuration
    const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
    assert.ok(settings.hooks.PreToolUse, 'should have PreToolUse hooks');
    assert.ok(settings.hooks.PostToolUse, 'should have PostToolUse hooks');
  });

  it('agent files reference language-agnostic patterns', async () => {
    await run(tmpDir, ['--all']);

    // Voss agent should not be Node-specific
    const voss = fs.readFileSync(path.join(tmpDir, '.claude', 'agents', 'dev-team-voss.md'), 'utf-8');
    assert.ok(!voss.includes('require('), 'agent should not contain Node-specific code');
    assert.ok(voss.includes('description:'), 'should have valid frontmatter');
  });

  it('hooks are executable Node.js scripts', async () => {
    await run(tmpDir, ['--all']);

    const hookDir = path.join(tmpDir, '.claude', 'hooks');
    const hookFiles = fs.readdirSync(hookDir);

    for (const file of hookFiles) {
      const content = fs.readFileSync(path.join(hookDir, file), 'utf-8');
      assert.ok(content.startsWith('#!/usr/bin/env node'), `${file} should have node shebang`);
    }
  });
});
