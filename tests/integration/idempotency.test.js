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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-team-idemp-'));
  originalCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('idempotency', () => {
  it('running init twice does not duplicate settings hooks', async () => {
    await run(tmpDir, ['--all']);
    await run(tmpDir, ['--all']);

    const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8'));

    // Count PostToolUse entries — should not have duplicates
    for (const [event, entries] of Object.entries(settings.hooks)) {
      const commands = entries.flatMap((e) => (e.hooks || []).map((h) => h.command));
      const unique = [...new Set(commands)];
      assert.equal(commands.length, unique.length, `${event} hooks should not have duplicates`);
    }
  });

  it('running init twice does not duplicate CLAUDE.md content', async () => {
    await run(tmpDir, ['--all']);
    await run(tmpDir, ['--all']);

    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    const beginCount = (content.match(/<!-- dev-team:begin -->/g) || []).length;
    assert.equal(beginCount, 1, 'should have exactly one dev-team:begin marker');
  });

  it('preserves existing CLAUDE.md content on re-run', async () => {
    // Create existing CLAUDE.md
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Project\n\nCustom content here.\n');

    await run(tmpDir, ['--all']);

    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    assert.ok(content.includes('Custom content here.'), 'should preserve existing content');
    assert.ok(content.includes('dev-team:begin'), 'should add dev-team section');
  });

  it('does not overwrite agent memory on re-run', async () => {
    await run(tmpDir, ['--all']);

    // Simulate accumulated memory
    const memoryPath = path.join(tmpDir, '.claude', 'agent-memory', 'dev-team-voss', 'MEMORY.md');
    fs.writeFileSync(memoryPath, '# Agent Memory: Voss\n\n## Learned patterns\n- API uses REST\n');

    await run(tmpDir, ['--all']);

    const content = fs.readFileSync(memoryPath, 'utf-8');
    assert.ok(content.includes('API uses REST'), 'should preserve accumulated memory');
  });
});
